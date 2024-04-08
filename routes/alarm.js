const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const alarmController = require('../controllers/alarm');

router.get('/', auth, alarmController.fetchAlarmData);

// router.put('/', auth, dashboardController.updateAlarmValueData);

// router.put('/', auth, dashboardController.updateStatusData);

module.exports = router;