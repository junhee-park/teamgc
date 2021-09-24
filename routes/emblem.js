const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");

router.get('/', async (req, res) => {
  let result;
  result = {
    status: 200,
    emblem_array: await getEmblem(req.body.user_no).then().catch(e => {
      logger.error(`${e}`);
      res.json({ status: 100003, emblem_array: [] });
    }),
  }
  res.json(result);
})

router.post('/', async (req, res) => {
  let result;
  await addEmblem(req.body.user_no, req.body.emblem_code).then().catch(e => {
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


function getEmblem(userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT emblem_code, emblem_acquisition_date FROM user_emblem_info WHERE user_no = '${userNo}' `;

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

function addEmblem(userNo, emblemCode) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `INSERT INTO user_emblem_info (user_no, emblem_code, emblem_acquisition_date) VALUES ('${userNo}' , '${emblemCode}', '${moment.utc().format(dateFormat)}')`;
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