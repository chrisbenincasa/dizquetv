import express from 'express';
import { defaultXmlTvSettings } from '../dao/db.js';
import createLogger from '../logger.js';
import { firstDefined } from '../util.js';
import { xmltvInterval } from '../xmltv-generator.js';

const logger = createLogger(import.meta);

export const xmlTvSettingsRouter = express.Router();

xmlTvSettingsRouter.get('/api/xmltv-settings', async (req, res) => {
  try {
    res.json(req.ctx.dbAccess.xmlTvSettings());
  } catch (err) {
    logger.error(err);
    res.status(500).send('error');
  }
});

xmlTvSettingsRouter.put('/api/xmltv-settings', async (req, res) => {
  try {
    let xmltv = req.ctx.dbAccess.xmlTvSettings();
    await req.ctx.dbAccess.updateSettings('xmltv', {
      refreshHours: req.body.refresh,
      enableImageCache: req.body.enableImageCache === true,
      outputPath: xmltv.outputPath,
      programmingHours: req.body.cache,
    });
    xmltv = req.ctx.dbAccess.xmlTvSettings();
    res.send(xmltv);
    req.ctx.eventService.push('settings-update', {
      message: 'xmltv settings updated.',
      module: 'xmltv',
      detail: {
        action: 'update',
      },
      level: 'info',
    });
    updateXmltv();
  } catch (err) {
    logger.error(err);
    res.status(500).send('error');

    req.ctx.eventService.push('settings-update', {
      message: 'Error updating xmltv configuration',
      module: 'xmltv',
      detail: {
        action: 'update',
        error: firstDefined(err, 'message'),
      },
      level: 'danger',
    });
  }
});

xmlTvSettingsRouter.post('/api/xmltv-settings', async (req, res) => {
  try {
    await req.ctx.dbAccess.updateSettings('xmltv', defaultXmlTvSettings);
    var xmltv = req.ctx.dbAccess.xmlTvSettings();
    res.send(xmltv);
    req.ctx.eventService.push('settings-update', {
      message: 'xmltv settings reset.',
      module: 'xmltv',
      detail: {
        action: 'reset',
      },
      level: 'warning',
    });

    updateXmltv();
  } catch (err) {
    logger.error(err);
    res.status(500).send('error');
    req.ctx.eventService.push('settings-update', {
      message: 'Error reseting xmltv configuration',
      module: 'xmltv',
      detail: {
        action: 'reset',
        error: firstDefined(err, 'message'),
      },
      level: 'danger',
    });
  }
});

function updateXmltv() {
  xmltvInterval.updateXML();
  xmltvInterval.restartInterval();
}