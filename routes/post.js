const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");

router.get('/', async (req, res) => {
  let result = {
    status: 200,
    post_array: await getPostInfo(req.body.user_no).then().catch(e => {
      logger.error(`${e}`);
      res.json({ status: 100003, post_array: [] });
    }),
  }
  res.json(result);
})

router.delete('/', async (req, res) => {
  let queryResult = await deletePost(req.body.no, req.body.user_no).then().catch(e => {
    logger.error(`${e}`);
    res.json({ status: 100003 });
  });
  let result;
  if (queryResult.changedRows == 0 && queryResult.affectedRows == 0) {
    result = {
      status: 100006,
    }
  } else if (queryResult.changedRows == 0 && queryResult.affectedRows == 1) {
    result = {
      status: 103001,
    }
  } else {
    result = {
      status: 200
    }
  }
  res.json(result);
})

router.put('/', async (req, res) => {
  let result;
  let num = Math.floor(req.body.item_no);
  num = Math.abs(num);
  if (num < 1 || num > 4) {
    result = {
      status: 104001,
    }
    res.json(result);
  }
  else {
    let queryResult = await updatePost(req.body.no, num).then().catch(e => {

      res.json({ status: 100003 });
    });
    console.log(queryResult);
    if (queryResult.changedRows == 0 && queryResult.affectedRows == 0) {
      result = {
        status: 100006,
      }
    } else if (queryResult.changedRows == 0 && queryResult.affectedRows == 1) {
      result = {
        status: 104002,
      }
    } else {
      result = {
        status: 200
      }
    }
    res.json(result);
  }
})

function getPostInfo(userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT no, title, contents, item_code_1, item_count_1, item_received_1, item_code_2, item_count_2, item_received_2,
  item_code_3, item_count_3, item_received_3, item_code_4, item_count_4, item_received_4, post_confirm, post_date
  FROM user_post_info WHERE user_no = '${userNo}'`;
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

function deletePost(no, userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `UPDATE user_post_info SET post_delete = 1 WHERE no = '${no}'`;

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

function updatePost(no, itemNo, userNo) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `UPDATE user_post_info SET item_received_${itemNo} = 1 WHERE no = '${no}' AND item_code_${itemNo} IS NOT NULL`;
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