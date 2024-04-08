const { validationResult } = require('express-validator');
const data = require('../models/data');

exports.fetchAll = async (req, res, next) => {
  try {
      const [allData] = await data.fetchData();
      res.status(200).json(allData)
  } catch (error) {
      if (!error.statusCode) {
          error.statusCode = 500;
      }
      next(error);
  }
};

// exports.updateAlarmValueData = async (req, res, next) => {
//   console.log("update expected value call");
//   try {
//     const putResponse = await data.updateAlarmValue(req.body.tag, req.body.alarmValue);
//     res.status(200).json(putResponse);
//     console.log('Alarm value', req.body.alarmValue);
//   } catch (err) {
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };

// exports.updateStatusData = async (req, res, next) => {
//   console.log("update status value call");
//   try {
//     const putResponse = await data.updateStatusValue(req.body.tag, req.body.status);
//     res.status(200).json(putResponse);
//     console.log("This is Status update: ",req.body.status);
//   } catch (err) {
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };



