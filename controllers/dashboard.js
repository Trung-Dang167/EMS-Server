const { validationResult } = require('express-validator');
const data = require('../models/data');

exports.fetchAll = async (req, res, next) => {
    try {
        const [allData] = await data.fetchAll();
        res.status(200).json(allData)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
};

exports.updateExpectedData = async (req, res, next) => {
    try {
      const putResponse = await data.updateExpectedValue(req.body.tag, req.body.expectedValue);
      res.status(200).json(putResponse);
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
};

// exports.postData = async(req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) return;

//     const tag = req.body.tag;
//     const name = req.body.name;
//     const expectedValue = req.body.expectedValue;
//     const realtimeValue = req.body.realtimeValue;
//     const unit = req.body.unit;
//     const designP = req.body.designP;
//     const upperbound = req.body.upperbound;
//     const lowerbound = req.body.lowerbound;

//     try {
//         const dashboardData = {
//             tag: tag,
//             name: name,
//             expectedValue: expectedValue,
//             realtimeValue: realtimeValue,
//             unit: unit,
//             designP: designP,
//             upperbound:upperbound,
//             lowerbound: lowerbound
//         };
//         // const result = await Data.save(dashboardData);
//         // Data.setFloatArray(modbusUtil.getFloatArray)
//         // Data.insertModbusValue();
        
//         res.status(201).json({ message: 'Data saved' });
//     } catch (error) {
//         if (!error.statusCode) {
//             error.statusCode = 500;
//         }
//         next(error)
//     }
// };


