const { validationResult } = require('express-validator')
const Data = require('../models/data')


exports.fetchAll = async (req, res, next) => {
    try {
        const [allData] = await Data.fetchAll();
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
      const putResponse = await Data.updateBounds(req.body.tag, req.body.upperbound, req.body.lowerbound);
      // console.log(putResponse)
      res.status(200).json(putResponse);
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  };
  

