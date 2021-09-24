const crypto = require('crypto');
const express = require("express");
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';
const jwt = require('jsonwebtoken');

const router = express.Router();

const fs = require('fs');

const getConnection = require('../config/database.js');
const logger = require("../config/winston.js");

router.get('/login', async (req, res) => {
  res.render('admin_login', { action_url: process.env.URL + '/admin/login' });
});

router.post('/login', async (req, res) => {
  const makePasswordHashed = (userId, plainPassword) =>
    new Promise(async (resolve, reject) => {
      let salt = null;
      const result = await getSalt(userId).then().catch(e => {
        res.status(503).end();
      });
      if (result.length == 0) {
        res.send(`<script>alert("비밀번호가 일치 하지 않습니다.");location.href="${process.env.URL}/admin/login";</script>`);
      } else {
        salt = result[0].salt;
      }
      crypto.pbkdf2(plainPassword, salt, 9999, 64, 'sha512', (err, key) => {
        if (err) reject(err);
        resolve(key.toString('base64'));
      });
    });
  let password = await makePasswordHashed(req.body.id, req.body.password);
  let queryResult = await matchPassword(password);
  if (queryResult.length != 0 && queryResult[0].admin_id == req.body.id) {
    let userInfo = { user_id: queryResult[0].admin_id, nickname: queryResult[0].nickname };
    let secretKey = process.env.SECRET_KEY;
    let options = { expiresIn: '1d', subject: 'adminInfo' }
    jwt.sign(userInfo, secretKey, options,
      function (err, token) {
        if (err) {
          logger.error(`${err}`);
          res.status(503).end();
        }
        else {
          logger.info(`JWT토큰 발급 ${req.body.id}, ${token}`);
          res.cookie('access_token', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
          res.redirect('./list');
        }
      }
    )
  } else {
    res.send(`<script>alert("비밀번호가 일치 하지 않습니다.");location.href="${process.env.URL}/admin/login";</script>`);
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('access_token').redirect('./login');
});

router.get('/creatsalt', async (req, res) => {
  const createSalt = () =>
    new Promise((resolve, reject) => {
      crypto.randomBytes(64, (err, buf) => {
        if (err) reject(err);
        resolve(buf.toString('base64'));
      });
    });
  const createHashedPassword = (plainPassword) =>
    new Promise(async (resolve, reject) => {
      const salt = await createSalt();
      crypto.pbkdf2(plainPassword, salt, 9999, 64, 'sha512', (err, key) => {
        if (err) reject(err);
        resolve({ password: key.toString('base64'), salt });
      });
    });
  let { password, salt } = await createHashedPassword(req.body.password);
  console.log(`password : ${password}, salt : ${salt}`);
  res.end();
});

router.get('/delete', async (req, res) => {
  await deleteArticle(req.query.no).then().catch(e => {
    logger.error(`${e}`);
    res.status(503).end();
  });
  res.redirect('./list');
});

router.get('/update', async (req, res) => {
  let queryResult = await getArticle(req.query.no).then().catch(e => {
    logger.error(`${e}`);
    res.status(503).end();
  });
  res.render('update_article', { action_url: process.env.URL + '/admin/update', result: queryResult[0], nickname: req.nickname });
});

router.post('/update', async (req, res) => {
  let { no, title, contents, link, imagelink } = req.body;
  console.log(no);
  await updateArticle(no, title, contents, link, imagelink).then().catch(e => {
    logger.error(`${e}`);
    res.status(503).end();
  });
  res.redirect('./list');
});

router.get('/list', async (req, res) => {
  let queryResult = await getArticle(req.query.no).then().catch(e => {
    logger.error(`${e}`);
    res.status(503).end();
  });
  queryResult.forEach(element => {
    element.date = new moment(element.date).format(dateFormat);
  });
  res.render('article_list', { action_url: process.env.URL + '/admin', queryResult, nickname: req.nickname });
});

router.get('/add', (req, res) => {
  res.render('add_article', { action_url: process.env.URL + '/admin/add', nickname: req.nickname });
});

router.post('/add', async (req, res) => {
  await addArticle(req.user_id, req.nickname, req.body.title, req.body.contents, req.body.link, req.body.imagelink, req.body.language);
  res.redirect('./list');
});

function getSalt(userId) {
  return new Promise((resolve, reject) => {
    let sql;
    getConnection((conn) => {
      sql = `SELECT salt FROM admin_info WHERE admin_id = ${conn.escape(userId)};`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${this.sql}`);
          conn.release();
          resolve(results);
        });
    })
  });
}

function matchPassword(password) {
  return new Promise((resolve, reject) => {
    let sql;
    getConnection((conn) => {
      sql = `SELECT admin_id, nickname FROM admin_info WHERE password = '${password}'`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${this.sql}`);
          conn.release();
          resolve(results);
        });
    })
  });
}


function getArticle(no) {
  return new Promise((resolve, reject) => {
    let sql;
    getConnection((conn) => {
      if (no != null) {
        sql = `SELECT no, nickname, title, contents, page_link, image_url, language, date FROM article WHERE no = ${conn.escape(no)};`;
      } else {
        sql = `SELECT no, nickname, title, contents, page_link, image_url, language, date FROM article;`;
      }
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

function addArticle(userId, nickname, title, contents, pageLink, imageUrl, language) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = 'INSERT INTO article (admin_id, nickname, title, contents, page_link, image_url, language, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      let date = moment().utc().format(dateFormat);
      let params = [userId, nickname, title, contents, pageLink, imageUrl, language, date];
      console.log()
      conn.query(sql, params,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results);
        });
    })
  });
}

function deleteArticle(no) {
  return new Promise((resolve, reject) => {
    let sql;
    let params = [no];
    getConnection((conn) => {
      sql = `DELETE FROM article WHERE no = ?`;
      conn.query(sql, params,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          conn.release();
          resolve(results);
        });
    })
  });
}

function updateArticle(no, title, contents, pageLink, imageUrl) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = 'UPDATE article SET title = ?, contents = ?, page_link = ?, image_url = ?, date = ? WHERE no = ?;';
      let date = moment().utc().format(dateFormat);
      let params = [title, contents, pageLink, imageUrl, date, no];
      console.log()
      conn.query(sql, params,
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