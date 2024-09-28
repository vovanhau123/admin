const express = require('express');
const router = express.Router();
const scheduleService = require('../services/scheduleService');

router.post('/', scheduleService.scheduleAction);
router.post('/cancel', scheduleService.cancelScheduledAction);
router.get('/', scheduleService.getScheduledActions);
router.get('/history', scheduleService.getRestartHistory);

module.exports = router;