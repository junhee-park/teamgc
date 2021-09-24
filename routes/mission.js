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
    mission_arrary: await getMission(req.body.user_no).then().catch(e => {
      logger.error(`${e}`);
      res.json({ status: 100003, mission_arrary: [] });
    }),
  }
  res.json(result);
})

router.post('/', async (req, res) => {
  console.log(req.body.user_no);
  let result;
  await addMission(req.body.user_no, req.body.mission_code).then().catch(e => {
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


function getMission(userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT mission_code, mission_acquisition_date FROM user_mission_info WHERE user_no = '${userNo}' `;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results);
        });
    });
  });
}

function addMission(userNo, missionCode) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      sql = `INSERT INTO user_mission_info (user_no, mission_code, mission_acquisition_date) VALUES ('${userNo}' , '${missionCode}', '${moment.utc().format(dateFormat)}')`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results);
        });
    });
  });
}



module.exports = router;