/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import JSONStream from 'JSONStream';
import { FastifyPluginCallback, FastifyReply } from 'fastify';
import createLogger from '../logger.js';
import randomSlotsService, {
  RandomSlotSchedule,
  ShuffleProgram as RandomSlotShuffleProgram,
} from '../services/randomSlotsService.js';
import throttle from '../services/throttle.js';
import timeSlotsService, {
  TimeSlotSchedule,
  ShuffleProgram as TimeSlotShuffleProgram,
} from '../services/timeSlotsService.js';
import { Writable } from 'stream';

const logger = createLogger(import.meta);

export const channelToolRouter: FastifyPluginCallback = (
  fastify,
  _opts,
  done,
) => {
  fastify.post<{
    Body: { programs: TimeSlotShuffleProgram[]; schedule: TimeSlotSchedule };
  }>('/api/channel-tools/time-slots', async (req, res) => {
    try {
      const toolRes = await timeSlotsService(
        req.body.programs,
        req.body.schedule,
      );
      if (typeof toolRes.userError !== 'undefined') {
        logger.error('time slots error: ' + toolRes.userError);
        return res.status(400).send(toolRes.userError);
      }
      await streamToolResult(toolRes, res);
    } catch (err) {
      logger.error(err);
      return res.status(500).send('Internal error');
    }
  });

  fastify.post<{
    Body: {
      programs: RandomSlotShuffleProgram[];
      schedule: RandomSlotSchedule;
    };
  }>('/api/channel-tools/random-slots', async (req, res) => {
    try {
      const toolRes = await randomSlotsService(
        req.body.programs,
        req.body.schedule,
      );
      if (typeof toolRes.userError !== 'undefined') {
        logger.error('random slots error: ' + toolRes.userError);
        return res.status(400).send(toolRes.userError);
      }
      await streamToolResult(toolRes, res);
    } catch (err) {
      logger.error('Error', err);
      return res.status(500).send('Internal error');
    }
  });

  async function streamToolResult(toolRes, res: FastifyReply) {
    const programs = toolRes.programs;
    // delete toolRes.programs;
    let s = JSON.stringify(toolRes);
    s = s.slice(0, -1);
    logger.info(JSON.stringify(toolRes));

    const transformStream: Writable = JSONStream.stringify(
      s + ',"programs":[',
      ',',
      ']}',
    );
    transformStream.pipe(res.raw);

    for (let i = 0; i < programs.length; i++) {
      transformStream.write(programs[i]);
      await throttle();
    }
    transformStream.end();
    return res.header('Content-Type', 'application/json');
  }

  done();
};
