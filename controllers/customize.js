const { validationResult } = require('express-validator')
const Data = require('../models/data')

exports.fetchAll = async (req, res, next) => {
  try {
      const [allData] = await Data.fetchData();
      res.status(200).json(allData)
  } catch (error) {
      if (!error.statusCode) {
          error.statusCode = 500;
      }
      next(error)
  }
};

exports.updateData = async (req, res, next) => {
  try {
    // console.log('come here');
    const putResponse = await Data.updateAlarmValue(req.body.tag, req.body.alarmValue);
    // console.log(req.body.tag);
    // console.log(req.body.alarmValue);
    res.status(200).json(putResponse);
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
  

