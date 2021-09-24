const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");
const web = require("../web.js");

router.get('/', async (req, res) => {
  let result;
  result = {
    status: 200,
    inventory: await getItems(req.body.user_no).then().catch(e => {
      logger.error(`${e}`);
      res.json({ status: 100003, inventory: [] })
    }),
  }
  res.json(result);
})


router.post('/', async (req, res) => {
  let result;
  await addItem(req.body.item_code, req.body.item_count, req.body.user_no).then().catch((e) => {
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


router.put('/', async (req, res) => {
  let queryResult = await useItem(req.body.user_no, req.body.item_code, req.body.item_count).then().catch((e) => {
    logger.error(`${e}`);
    result = {
      status: 100003,
    }
    res.json(result);
  });
  console.log(queryResult);
  let result;
  if (queryResult.changedRows == 0 && queryResult.affectedRows == 0) {
    result = {
      status: 100005,
    }
  } else if (queryResult.changedRows == 0 && queryResult.affectedRows == 1) {
    result = {
      status: 109001,
    }
  } else {
    result = {
      status: 200
    }
  }
  res.json(result);
})

function getItems(userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT item_code, item_count, item_acquisition_date FROM user_inventory_info WHERE user_no = '${userNo}'`;
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

function addItem(itemCode, itemCount, userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT item_count FROM user_inventory_info WHERE user_no = '${userNo}' AND item_code = '${itemCode}'`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          if (results.length === 0) {
            sql = `INSERT INTO user_inventory_info (user_no, item_code, item_count, item_acquisition_date) VALUES ('${userNo}', '${itemCode}',${itemCount} , '${moment.utc().format(dateFormat)}')`;
            conn.query(sql,
              function (error, results, fields) {
                if (error) reject(error);
                logger.info(`SQL : ${sql}`);
                web.saveLog(userNo, sql);
                conn.release();
                resolve(results);
              });
          } else {
            sql = `UPDATE user_inventory_info SET item_count = ${results[0].item_count + Number(itemCount)}, item_acquisition_date = '${moment.utc().format(dateFormat)}' WHERE user_no = '${userNo}' AND item_code = '${itemCode}'`;
            conn.query(sql,
              function (error, results, fields) {
                if (error) reject(error);
                logger.info(`SQL : ${sql}`);
                web.saveLog(userNo, sql);
                conn.release();
                resolve(results);
              });
          }
        });
    });
  });
}

function useItem(userNo, itemCode, itemCount) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `UPDATE user_inventory_info SET item_count = ${itemCount} WHERE user_no = '${userNo}' AND item_code ='${itemCode}'`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          web.saveLog(userNo, sql);
          conn.release();
          resolve(results);
        });
    });
  });
}

module.exports = router;