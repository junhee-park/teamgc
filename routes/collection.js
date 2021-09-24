const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");


router.get('/', async (req, res) => {
  console.log(req.body.user_no);
  let result;
  result = {
    status: 200,
    trash_array: await getCollection(req.body.user_no).then().catch(e => {
      logger.error(`${e}`);
      res.json({ status: 100003, trash_array: [] });
    }),
  }
  res.json(result);
})


router.post('/', async (req, res) => {
  let result;
  await addCollection(req.body.trash_code, req.body.user_no).then().catch((e) => {
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
})


function getCollection(userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT trash_code, trash_acquisition_date FROM user_collection_info WHERE user_no = '${userNo}'`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results);
        });
    })
  });
}

function addCollection(trashCode, userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `INSERT INTO user_collection_info (user_no, trash_code, trash_acquisition_date) VALUES ('${userNo}', '${trashCode}', '${moment.utc().format(dateFormat)}')`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results);
        });
    })
  });
}


module.exports = router;