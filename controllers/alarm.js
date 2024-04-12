const { validationResult } = require('express-validator')
const Data = require('../models/data')

exports.fetchAlarmData = async (req, res, next) => {
  try {
      const [alarmData] = await Data.fetchAlarm();
      res.status(200).json(alarmData)
  } catch (error) {
      if (!error.statusCode) {
          error.statusCode = 500;
      }
      next(error)
  }
};

