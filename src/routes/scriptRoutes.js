const express = require('express');
const router = express.Router();
const scriptService = require('../services/scriptService');

router.get('/status/:scriptName', scriptService.getScriptStatus);
router.get('/status', scriptService.getAllScriptStatuses);
router.post('/start', scriptService.startScript);
router.post('/restart', scriptService.restartScript);
router.post('/stop', scriptService.stopScript);
router.get('/logs', scriptService.getPM2Logs);

module.exports = router;