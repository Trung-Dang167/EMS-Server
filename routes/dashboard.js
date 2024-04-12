const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboard');

router.get('/', auth, dashboardController.fetchAll);

// router.put('/', auth, dashboardController.updateAlarmValueData);

// router.put('/', auth, dashboardController.updateStatusData);

module.exports = router;
