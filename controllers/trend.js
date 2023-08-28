const { validationResult } = require('express-validator')
const Histories = require('../models/histories');


exports.fetchStat = async (req, res, next) => {
    try {
        const [allData] = await Histories.fetchStat();
        res.status(200).json(allData)
        console.log(allData)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        //next(error)
    }
 };