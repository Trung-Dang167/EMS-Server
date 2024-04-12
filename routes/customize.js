const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const customizeController = require('../controllers/customize');
const auth = require('../middleware/auth')

router.get('/', auth, customizeController.fetchAll);

router.put("/", auth, customizeController.updateData);

module.exports = router;