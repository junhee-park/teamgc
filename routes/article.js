const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const router = express.Router();

const fs = require('fs');

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");

router.get('/', async (req, res) => {
  let queryResult = await getArticle(req.userNo).then().catch(e => {
    logger.error(`${e}`);
    let result = {
      status: 100003,
      article_array: []
    }
    res.json(result);
  });
  let result = {
    status: 200,
    article_array: queryResult
  }
  res.json(result);
});


function getArticle(userNo) {
  return new Promise((resolve, reject) => {
    let sql;
    getConnection((conn) => {
      sql = `SELECT no, nickname, title, contents, page_link, image_url, date FROM article WHERE language = (SELECT country FROM user_info WHERE user_no = '${ userNo }')`;
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