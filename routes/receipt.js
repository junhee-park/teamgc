const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");


router.post('/', async (req, res) => {
  let result;
  await addReceipt(req.body.user_no, req.body.transaction_id, req.body.product_id, req.body.receipt_details).then().catch((e) => {
    logger.error(`${e}`);
    result = {
      status: 100003,
    }
    res.json(result);
  });
  result = {
    status: 200,
  }
  res.json(result);
});


function addReceipt(userNo, transactionId, productId, receiptDetails) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let date = moment().utc().format(dateFormat);
      params = [userNo, transactionId, productId, receiptDetails, date]
      sql = 'INSERT INTO receipt (user_no, transaction_id, product_id, receipt_details, date) VALUES (?, ?, ?, ?, ?)';
      conn.query(sql, params,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${this.sql}`);
          conn.release();
          resolve(results);
        });
    });
  });
}

module.exports = router;