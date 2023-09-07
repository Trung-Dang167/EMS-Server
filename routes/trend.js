const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const trendController = require('../controllers/trend');

router.get('/', auth, trendController.fetchAll);

router.put('/', auth, trendController.updateExpectedData);

module.exports = router;
