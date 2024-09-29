const express = require('express');
const router = express.Router();
const scriptService = require('../services/scriptService');
const { getScriptList } = require('../services/scriptService');

router.get('/status/:scriptName', scriptService.getScriptStatus);
router.get('/status', scriptService.getAllScriptStatuses);
router.post('/start', scriptService.startScript);
router.post('/restart', scriptService.restartScript);
router.post('/stop', scriptService.stopScript);
router.get('/logs', scriptService.getPM2Logs);
router.get('/list', (req, res) => {
    res.json(getScriptList());
});

module.exports = router;