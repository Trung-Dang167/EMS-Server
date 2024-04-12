const { validationResult } = require('express-validator');
const data = require('../models/data');

exports.fetchTrend = async (req, res, next) => {
    try {
        const [trendData] = await data.fetchHistories();
        res.status(200).json(trendData)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
};

exports.updateExpectedData = async (req, res, next) => {
    try {
      const putResponse = await data.updateAlarmValue(req.body.tag, req.body.expectedValue);
      res.status(200).json(putResponse);
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
};



