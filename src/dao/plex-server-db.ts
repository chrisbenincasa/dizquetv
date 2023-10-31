import { find, isUndefined } from 'lodash-es';
import type { DeepReadonly, MarkOptional, Writable } from 'ts-essentials';
import { ChannelCache } from '../channel-cache.js';
import { serverOptions } from '../globals.js';
import { ChannelDB } from './channel-db.js';
import { CustomShowDB } from './custom-show-db.js';
import {
  Channel,
  PlexServerSettings,
  Program,
  getDB,
  offlineProgram,
} from './db.js';
import { FillerDB } from './filler-db.js';

//hmnn this is more of a "PlexServerService"...
const ICON_REGEX =
  /https?:\/\/.*(\/library\/metadata\/\d+\/thumb\/\d+).X-Plex-Token=.*/;

type Report = {
  channelNumber: number;
  channelName: string;
  destroyedPrograms: number;
  modifiedPrograms: number;
};

export class PlexServerDB {
  channelDB: ChannelDB;
  db: any;
  channelCache: ChannelCache;
  fillerDB: FillerDB;
  showDB: CustomShowDB;

  constructor(
    channelDB: ChannelDB,
    channelCache: ChannelCache,
    fillerDB: FillerDB,
    showDB: CustomShowDB,
    db,
  ) {
    this.channelDB = channelDB;
    this.db = db;
    this.channelCache = channelCache;
    this.fillerDB = fillerDB;
    this.showDB = showDB;
  }

  async fixupAllChannels(name: string, newServer?: PlexServerSettings) {
    let channelNumbers = this.channelDB.getAllChannelNumbers();
    let report = await Promise.all(
      channelNumbers.map(async (i) => {
        let channel = this.channelDB.getChannel(i)!;

        let channelReport: Report = {
          channelNumber: channel.number,
          channelName: channel.name,
          destroyedPrograms: 0,
          modifiedPrograms: 0,
        };

        const newPrograms = this.fixupProgramArray(
          channel.programs,
          name,
          newServer,
          channelReport,
        );

        let newChannel: Channel = {
          ...(channel as Writable<Channel>),
          programs: newPrograms,
        };

        if (
          !isUndefined(channel.fallback) &&
          channel.fallback.length > 0 &&
          channel.fallback[0].isOffline
        ) {
          newChannel.fallback = [];
          if (channel.offline.mode != 'pic') {
            newChannel.offline.mode = 'pic';
            newChannel.offline.picture = `http://localhost:${
              serverOptions().port
            }/images/generic-offline-screen.png`;
          }
        }
        newChannel.fallback = this.fixupProgramArray(
          channel.fallback,
          name,
          newServer,
          channelReport,
        );

        await this.channelDB.saveChannel(newChannel);

        return channelReport;
      }),
    );

    this.channelCache.clear();

    return report;
  }

  async fixupAllFillers(name: string, newServer?: PlexServerSettings) {
    let fillers = this.fillerDB.getAllFillers();
    let report = await Promise.all(
      fillers.map(async (filler) => {
        let fillerReport: Report = {
          channelNumber: -1,
          channelName: filler.name + ' (filler)',
          destroyedPrograms: 0,
          modifiedPrograms: 0,
        };

        const newFiller = {
          ...filler,
          content: this.removeOffline(
            this.fixupProgramArray(
              filler.content,
              name,
              newServer,
              fillerReport,
            ),
          ),
        };

        await this.fillerDB.saveFiller(filler.id, newFiller);

        return fillerReport;
      }),
    );
    return report;
  }

  async fixupAllShows(name: string, newServer?: PlexServerSettings) {
    let shows = this.showDB.getAllShows();
    let report = await Promise.all(
      shows.map(async (show) => {
        let showReport: Report = {
          channelNumber: -1,
          channelName: show.name + ' (custom show)',
          destroyedPrograms: 0,
          modifiedPrograms: 0,
        };

        const newShow = {
          ...show,
          content: this.removeOffline(
            this.fixupProgramArray(show.content, name, newServer, showReport),
          ),
        };

        await this.showDB.saveShow(show.id, newShow);

        return showReport;
      }),
    );
    return report;
  }

  removeOffline(progs) {
    if (isUndefined(progs)) {
      return progs;
    }
    return progs.filter((p) => {
      return true !== p.isOffline;
    });
  }

  async fixupEveryProgramHolders(
    serverName: string,
    newServer?: PlexServerSettings,
  ) {
    let reports = await Promise.all([
      this.fixupAllChannels(serverName, newServer),
      this.fixupAllFillers(serverName, newServer),
      this.fixupAllShows(serverName, newServer),
    ]);
    let report: any[] = [];
    reports.forEach((r) =>
      r.forEach((r2) => {
        report.push(r2);
      }),
    );
    return report;
  }

  async deleteServer(name: string) {
    let report = await this.fixupEveryProgramHolders(name);
    this.db['plex-servers'].remove({ name: name });
    return report;
  }

  async doesNameExist(name: string) {
    return !isUndefined(find((await getDB()).plexServers(), { name }));
  }

  async updateServer(
    server: MarkOptional<
      PlexServerSettings,
      'sendChannelUpdates' | 'sendGuideUpdates' | 'id'
    >,
  ) {
    let name = server.name;
    if (isUndefined(name)) {
      throw Error('Missing server name from request');
    }

    let s = find((await getDB()).plexServers(), { name });

    if (isUndefined(s)) {
      throw Error("Server doesn't exist.");
    }

    const sendGuideUpdates = server.sendGuideUpdates ?? false;
    const sendChannelUpdates = server.sendChannelUpdates ?? false;

    let newServer: PlexServerSettings = {
      ...server,
      name: s.name,
      uri: server.uri,
      accessToken: server.accessToken,
      sendGuideUpdates,
      sendChannelUpdates,
      index: s.index,
    };

    this.normalizeServer(newServer);

    let report = await this.fixupEveryProgramHolders(name, newServer);

    this.db['plex-servers'].update({ id: s.id }, newServer);
    return report;
  }

  async addServer(
    server: MarkOptional<
      PlexServerSettings,
      'sendChannelUpdates' | 'sendGuideUpdates'
    >,
  ) {
    let name = isUndefined(server.name) ? 'plex' : server.name;
    let i = 2;
    let prefix = name;
    let resultName = name;
    while (await this.doesNameExist(resultName)) {
      resultName = `${prefix}${i}`;
      i += 1;
    }
    name = resultName;

    const sendGuideUpdates = server.sendGuideUpdates ?? false;
    const sendChannelUpdates = server.sendChannelUpdates ?? false;

    let index = (await getDB()).plexServers.length;

    let newServer: PlexServerSettings = {
      name: name,
      uri: server.uri,
      accessToken: server.accessToken,
      sendGuideUpdates,
      sendChannelUpdates,
      index: index,
    };
    this.normalizeServer(newServer);
    await getDB();
    this.db['plex-servers'].save(newServer);
  }

  fixupProgramArray(
    arr: DeepReadonly<Program[]>,
    serverName: string,
    newServer: PlexServerSettings | undefined,
    channelReport: Report,
  ) {
    if (isUndefined(arr)) {
      return [];
    }

    return arr.map((program) => {
      return this.fixupProgram(program, serverName, newServer, channelReport);
    });
  }

  fixupProgram(
    program: DeepReadonly<Program>,
    serverName: string,
    newServer: PlexServerSettings | undefined,
    channelReport: Report,
  ): Program {
    if (program.serverKey === serverName && isUndefined(newServer)) {
      channelReport.destroyedPrograms += 1;
      return offlineProgram(program.duration);
    } else if (program.serverKey === serverName && !isUndefined(newServer)) {
      let modified = false;
      const fixIcon = (icon: string | undefined) => {
        if (
          !isUndefined(icon) &&
          icon.includes('/library/metadata') &&
          icon.includes('X-Plex-Token')
        ) {
          let m = icon.match(ICON_REGEX);
          if (m?.length == 2) {
            let lib = m[1];
            let newUri = `${newServer.uri}${lib}?X-Plex-Token=${newServer.accessToken}`;
            modified = true;
            return newUri;
          }
        }
        return icon;
      };

      let newProgram: Program = {
        ...program,
        icon: fixIcon(program.icon) as string, // This will always be defined
        showIcon: fixIcon(program.showIcon),
        episodeIcon: fixIcon(program.episodeIcon),
        seasonIcon: fixIcon(program.seasonIcon),
      };

      if (modified) {
        channelReport.modifiedPrograms += 1;
      }

      return newProgram;
    }

    return program;
  }

  normalizeServer(server: PlexServerSettings) {
    while (server.uri.endsWith('/')) {
      server.uri = server.uri.slice(0, -1);
    }
  }
}
