const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const trendController = require('../controllers/trend');
const auth = require('../middleware/auth')

router.get('/', trendController.fetchStat);

module.exports = router;