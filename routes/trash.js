const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");

router.get('/', async (req, res) => {
  let queryResult = await getTrashAmount(req.body.user_no, req.body.search_day).then().catch(e => {
    logger.error(`${e}`);
    res.json({ status: 100003, trash_amount_array: [] })
  });
  let array = [];
  queryResult.forEach(x => array.push({ today_amount: x.today_amount, date : x.days}));
  let result;
  result = {
    status: 200,
    trash_amount_array: array
  }
  res.json(result);
})


router.post('/', async (req, res) => {
  let result;
  let queryResult = await addTrashAmount(req.body.user_no, req.body.today_amount, moment.utc().format(dateFormat).toString()).then().catch(e => {
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

router.get('/all', async (req, res) => {
  let result;
  result = {
    status: 200,
    trash_world_bucket_amount: await getWorldAmount().then().catch(e => {
      logger.error(`${e}`);
      res.json({ status: 100003, trash_world_bucket_amount: 0 })
    })
  }
  res.json(result);
})

router.get('/ranking', async (req, res) => {
  let queryResult = await getRanking(req.body.top).then().catch(e => {
    logger.error(`${e}`);
    res.json({ status: 100003, ranking_array: [] })
  });
  queryResult.forEach(element => {
    if (element.total_amount == null) {
      element.total_amount = 0;
    }
  });
  let result;
  result = {
    status: 200,
    ranking_array: queryResult,
  }
  res.json(result);
})


function getTrashAmount(userNo, searchDay) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql;
      if (searchDay != null) {
        sql = `SELECT SUM(today_amount) AS today_amount, date_format(date, '%Y-%m-%d') days FROM user_trash_amount_info WHERE user_no = '${userNo}' AND date > '${searchDay}' GROUP BY days;`;
      } else {
        sql = `SELECT SUM(today_amount) AS today_amount, date_format(date, '%Y-%m-%d') days FROM user_trash_amount_info WHERE user_no = '${userNo}' GROUP BY days;`;
      }
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results);
        });
    })
  })
}

function addTrashAmount(userNo, todayAmount, date) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `INSERT INTO user_trash_amount_info (user_no, today_amount, date)
    VALUES ('${userNo}', ${todayAmount}, '${date}')`;
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

function getWorldAmount() {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT SUM(today_amount) AS world_amount FROM user_trash_amount_info`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results[0].world_amount);
        });
    });
  });
}

function getRanking(top) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT user_info.nickname, SUM(user_trash_amount_info.today_amount) AS total_amount
      FROM user_info LEFT JOIN user_trash_amount_info
      ON user_info.user_no = user_trash_amount_info.user_no
      GROUP BY user_trash_amount_info.user_no
      ORDER BY total_amount DESC LIMIT ${top};`
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