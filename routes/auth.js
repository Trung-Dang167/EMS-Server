const express = require('express')
const { body } = require('express-validator');
const router = express.Router()
const User = require('../models/user')
const authController = require('../controllers/auth')

router.post(
  '/signup',
  [
    body('name').trim().not().isEmpty(),
    body('username').trim().isLength({ max: 15 })
    .custom(async (username) => {
      const user = await User.find(username);
      if (user[0].length > 0) {
        return Promise.reject('Username already exists!');
      }
    }),
    body('password').trim().isLength({ min: 7 })
  ],
  authController.signup,
);

router.post('/login', authController.login);

module.exports = router;