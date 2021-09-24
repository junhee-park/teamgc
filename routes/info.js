const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");
const web = require("../web.js");

router.get('/', async (req, res) => {
  let queryResult = await getUserInfo(req.userNo).then().catch(e => {
    logger.error(`${e}`);
    res.json({ status: 100003, userinfo: null })
  });
  updateConnectionDate(req.userNo);
  let result = {
    status: 200,
    userinfo: {
      user_no: req.userNo,
      nickname: queryResult.nickname,
      cycle: queryResult.cycle,
      debris: queryResult.debris,
      tutorial: queryResult.tutorial,
      message_consent: queryResult.message_consent,
      cushion_count: queryResult.cushion_count,
      ads_count: queryResult.ads_count,
      current_ship: queryResult.current_ship,
      current_paint: queryResult.current_paint,
      current_lamp: queryResult.current_lamp,
      current_accessories: queryResult.current_accessories,
      connection_date: queryResult.connection_date,
      unconnection_date: queryResult.unconnection_date,
      country: queryResult.country,
      start_date: queryResult.start_date,
    }
  }
  res.json(result);
});

router.put('/', async (req, res) => {
  let sql;
  if (req.body.cycle != null && req.body.debris != null) {
    sql = `UPDATE user_info SET cycle = ${req.body.cycle}, debris = ${req.body.debris}, unconnection_date = '${moment.utc().format(dateFormat)}' 
            WHERE user_no = '${req.body.user_no}'`;
            web.saveLog(req.body.user_no, sql);
  } else if (req.body.cycle != null && req.body.tutorial != null && req.body.cushion_count != null && req.body.ads_count != null &&
    req.body.current_ship != null && req.body.current_paint != null && req.body.current_lamp != null && req.body.current_accessories != null) {
    sql = `UPDATE user_info SET cycle = ${req.body.cycle}, tutorial = ${req.body.tutorial}, cushion_count = ${req.body.cushion_count}, ads_count = ${req.body.ads_count}, 
            current_ship = '${req.body.current_ship}', current_paint = '${req.body.current_paint}', current_lamp = '${req.body.current_lamp}', current_accessories = '${req.body.current_accessories}'
            WHERE user_no = '${req.body.user_no}'`;
            web.saveLog(req.body.user_no, sql);
  } else if (req.body.cycle != null && req.body.tutorial != null && req.body.cushion_count != null && req.body.ads_count != null) {
    sql = `UPDATE user_info SET cycle = ${req.body.cycle}, tutorial = ${req.body.tutorial}, cushion_count = ${req.body.cushion_count}, ads_count = ${req.body.ads_count}
            WHERE user_no = '${req.body.user_no}'`;
            web.saveLog(req.body.user_no, sql);
  } else if (req.body.current_ship != null && req.body.current_paint != null && req.body.current_lamp != null && req.body.current_accessories != null) {
    sql = `UPDATE user_info SET current_ship = '${req.body.current_ship}', current_paint = '${req.body.current_paint}', current_lamp = '${req.body.current_lamp}', current_accessories = '${req.body.current_accessories}'
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.cycle != null) {
    sql = `UPDATE user_info SET cycle = ${req.body.cycle} 
            WHERE user_no = '${req.body.user_no}'`;
            web.saveLog(req.body.user_no, sql);
  } else if (req.body.debris != null) {
    sql = `UPDATE user_info SET debris = ${req.body.debris} 
            WHERE user_no = '${req.body.user_no}'`;
            web.saveLog(req.body.user_no, sql);
  } else if (req.body.tutorial != null) {
    sql = `UPDATE user_info SET tutorial = ${req.body.tutorial} 
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.cushion_count != null) {
    sql = `UPDATE user_info SET cushion_count = ${req.body.cushion_count} 
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.ads_count != null) {
    sql = `UPDATE user_info SET ads_count = ${req.body.ads_count} 
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.accept_terms != null) {
    sql = `UPDATE user_info SET accept_terms = ${req.body.accept_terms} 
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.current_ship != null) {
    sql = `UPDATE user_info SET current_ship = '${req.body.current_ship}'
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.current_paint != null) {
    sql = `UPDATE user_info SET current_paint = '${req.body.current_paint}' 
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.current_lamp != null) {
    sql = `UPDATE user_info SET current_lamp = '${req.body.current_lamp}' 
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.current_accessories != null) {
    sql = `UPDATE user_info SET current_accessories = '${req.body.current_accessories}' 
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.nickname != null){
    sql = `UPDATE user_info SET nickname = '${req.body.nickname}'
            WHERE user_no = '${req.body.user_no}'`;
  } else if (req.body.country != null){
    sql = `UPDATE user_info SET country = '${req.body.country}'
            WHERE user_no = '${req.body.user_no}'`;
  }

  let result;
  let queryResult = await updateUserInfo(sql).then().catch(e => {
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

router.put('/fcm', async (req, res) => {
  let {fcm_token , message_consent} = req.body;
  let sql;
  console.log(fcm_token + " " + message_consent);
  if(fcm_token != null && message_consent != null) {
    sql = `UPDATE user_info SET fcm_token = '${fcm_token}', message_consent = '${message_consent}' WHERE user_no = '${req.userNo}'`;
  } else if(fcm_token != null) {
    sql = `UPDATE user_info SET fcm_token = '${fcm_token}' WHERE user_no = '${req.userNo}'`;
  } else if (message_consent != null)
  {
    sql = `UPDATE user_info SET message_consent = '${message_consent}' WHERE user_no = '${req.userNo}'`;
  }
  
  let result;
  let queryResult = await updateFCM(sql).then().catch(e => {
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

router.get('/nickname', async (req, res) => {
  let {nickname} = req.body;
  let result;
  let queryResult = await checkNickname(nickname).then().catch(e => {
    logger.error(`${e}`);
    result = {
      status: 100003,
    }
    res.json(result);
  });
  result = {
    status: 200,
    count: queryResult[0].count
  }
  res.json(result);
});

function getUserInfo(userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT * FROM user_info WHERE user_no = '${userNo}'`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results[0]);
        });
    });
  });
}

function updateUserInfo(sql) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
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

function updateFCM(sql) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
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

function updateConnectionDate(userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `UPDATE user_info SET connection_date = '${moment().utc().format(dateFormat)}' WHERE user_no = '${userNo}'`;
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

function checkNickname(nickname) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let params = [ nickname ];
      let sql = "SELECT COUNT(*) AS count FROM user_info WHERE nickname = REPLACE(?, ' ', '');";
      conn.query(sql, params,
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