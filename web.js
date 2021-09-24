require('dotenv').config({ path: __dirname + '/.env' });
const jwt = require('jsonwebtoken');
const passport = require('passport')
const express = require('express');
const cookieParser = require('cookie-parser');
const KakaoStrategy = require('passport-kakao').Strategy;
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';
const request = require('request');
const schedule = require('node-schedule');
const rule = new schedule.RecurrenceRule();
rule.hour = 1;
rule.minute = 0;
rule.tz = 'Etc/UTC';

const admin = require('firebase-admin');
const serviceAccount = require(__dirname + "/config/" + process.env.FCM_PRIVATE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const getConnection = require(__dirname + '/config/database.js');
const logger = require(__dirname + '/config/winston.js');

const postRouter = require("./routes/post");
const collectionRouter = require("./routes/collection");
const itemRouter = require("./routes/item");
const trashRouter = require("./routes/trash");
const missionRouter = require("./routes/mission");
const emblemRouter = require("./routes/emblem");
const articleRouter = require("./routes/article");
const infoRouter = require("./routes/info");
const receiptRouter = require("./routes/receipt");
const adminRouter = require("./routes/admin");

// passport 에 Kakao Oauth 추가
passport.use(
  new KakaoStrategy(
    {
      clientID: process.env.REST_API_KEY,
      clientSecret: process.env.SECRET_KEY,
      callbackURL: process.env.CALL_BACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      logger.info(`passport use`);
      try {
        save(accessToken, refreshToken, profile);
      } catch (err) {
        logger.error(`DB유저정보등록 실패 : ${err}`);
      }
      return done(null, profile._json.id)
    }
  )
)
passport.serializeUser(function (user, done) {
  console.log('serializeUser');
  done(null, user)
})
passport.deserializeUser(function (obj, done) {
  console.log('deserializeUser');
  done(null, obj)
})

// express 앱 설정
var app = express()
var session = require('express-session');
app.use(session({
  secret: 'secret key',
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize());
app.use(express.json());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(function (req, res, next) {
  logger.info(`${req.method} ${req.path}`);
  if (req.path == '/login' || req.path == '/oauth' || req.path == '/' ||
    req.path == '/kakao/login' || req.path == '/google/login' || req.path == '/favicon.ico' || req.path == '/version' || req.path == '/test2') {
    logger.info(`인증 제외 :  ${req.path}`);
    next();
  } else if (req.path == '/admin/add' || req.path == '/admin/list' || req.path == '/admin/delete' ||
    req.path == '/admin/update' || req.path == '/admin/login' || req.path == '/admin/creatsalt' || req.path == '/admin/logout') {
    logger.info(`관리자 페이지 :  ${req.path}`);
    if (req.path == '/admin/login') {
      next();
    } else {
      if (req.cookies.access_token != null) {
        try {
          jwt.verify(req.cookies.access_token, process.env.SECRET_KEY,
            async function (err, decoded) {
              if (err) throw err;
              logger.info(`토큰 검증 완료 : ${decoded.user_id}`);
              req.user_id = decoded.user_id;
              req.nickname = decoded.nickname;
              next();
            });
        } catch (e) {
          logger.error(e);
          res.status(503).end();
        }
      } else {
        res.redirect('/admin/login');
      }
    }
  } else {
    logger.info(`인증 :  ${req.path}`);
    let secretKey = process.env.SECRET_KEY;
    let token;
    let bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== 'undefined') {
      let bearer = bearerHeader.split(" ");
      token = bearer[1];
    } else {
      logger.warn(`권한 없음 : 헤더가 비어있음`);
      res.status(401).json({ status: 401 });
    }

    jwt.verify(token, secretKey,
      async function (err, decoded) {
        let result = await verifyJWTtoken(token).then().catch(e => {
          logger.error(`${e}`);
          res.json({ result: 100003 });
        });
        if (err != null) {
          logger.warn(`권한 없음 : ${err}`);
          res.status(401).json({ status: 401 });
        } else if (result.length == 0) { //DB에 저장된 토큰없음 또는 사용자와 소유자가 다름
          logger.warn(`권한 없음 : 해당 토큰 소지자가 없음`);
          res.status(401).json({ status: 401 });
        } else if (result[0].user_no != decoded.user_no) {
          logger.warn(`권한 없음 : 사용자와 소지자가 다름`);
          res.status(401).json({ status: 401 });
        } else {
          logger.info(`토큰 검증 완료 : ${decoded.user_no}`);// 유효한 토큰, 유저 정보 Object 반환
          req.userNo = decoded.user_no;
          next();
        }
      })
  }
});

app.use("/post", postRouter);
app.use("/collection", collectionRouter);
app.use("/item", itemRouter);
app.use("/trash", trashRouter);
app.use("/mission", missionRouter);
app.use("/emblem", emblemRouter);
app.use("/article", articleRouter);
app.use("/info", infoRouter);
app.use("/receipt", receiptRouter);
app.use("/admin", adminRouter);

const job = schedule.scheduleJob(rule, async function () {
  let registrationTokens = [];
  //한국어
  let queryResult = await getAllFCMToken(0);
  queryResult.forEach(element => {
    if (element.fcm_token != '') {
      registrationTokens.push(element.fcm_token);
    }
  });
  console.log(registrationTokens);
  // 메시지
  let payload = {
    notification: {
      title: '바다 위에 떠다니는 쓰레기를 모아주세요.',
      body: '오늘도 많은 쓰레기들이 생겼어요! 함께 같이 세상을 깨끗하게 만들어봐요!',
      icon: 'alram_icon',
      color: '#00A7C5'
    }
  }
  // 옵션
  const options = {
    priority: 'normal',
    timeToLive: 60 * 60 * 24
  }
  // 불러온 함수 값을 넣어서 실행 시켜주면 된다.
  admin.messaging().sendToDevice(registrationTokens, payload, options)
    .then((response) => {
      // Response is a message ID string.
      logger.info(`Successfully sent message: ${JSON.stringify(response)}`);
    })
    .catch((error) => {
      logger.info(`Error sending message: ${error}`);
    });

  //영어
  registrationTokens = [];
  queryResult = await getAllFCMToken(1);
  queryResult.forEach(element => {
    if (element.fcm_token != '') {
      registrationTokens.push(element.fcm_token);
    }
  });
  console.log(registrationTokens);
  // 메시지
  payload = {
    notification: {
      title: 'Please collect the garbage floating on the sea.',
      body: "There was a lot of garbage today! Let's make the world cleaner together!",
      icon: 'alram_icon',
      color: '#00A7C5'
    }
  }
  // 불러온 함수 값을 넣어서 실행 시켜주면 된다.
  admin.messaging().sendToDevice(registrationTokens, payload, options)
    .then((response) => {
      // Response is a message ID string.
      logger.info(`Successfully sent message: ${JSON.stringify(response)}`);
    })
    .catch((error) => {
      logger.info(`Error sending message: ${error}`);
    });
});

app.get('/', (req, res) => {
  console.log(req.body);
  logger.info(`로그인 실패`);
})
app.get('/test', (req, res) => {
  res.append('Access-Token', 'at');
  console.log(moment.utc().format("YYYY-MM-DD hh:mm:ss"));
  var date = new Date(moment.utc().format("YYYY-MM-DD hh:mm:ss"));
  var tmp = Date.parse(date).toString();
  res.send(tmp);
})



app.get('/test2', async (req, res) => {
  // registrationTokens = 디바이스 토큰값
  // payload = 푸시 메시지값
  // options = 옵션 값
  // 디바이스들의 토큰값

  let registrationTokens = [];
  //한국어
  let queryResult = await getAllFCMToken(0);
  queryResult.forEach(element => {
    if (element.fcm_token != '') {
      registrationTokens.push(element.fcm_token);
    }
  });
  console.log(registrationTokens);
  // 메시지
  let payload = {
    notification: {
      title: '바다 위에 떠다니는 쓰레기를 모아주세요.',
      body: '오늘도 많은 쓰레기들이 생겼어요! 함께 같이 세상을 깨끗하게 만들어봐요!',
      icon: 'alram_icon',
      color: '#00A7C5'
    }
  }
  // 옵션
  const options = {
    priority: 'normal',
    timeToLive: 60 * 60 * 24
  }
  // 불러온 함수 값을 넣어서 실행 시켜주면 된다.
  admin.messaging().sendToDevice(registrationTokens, payload, options)
    .then((response) => {
      // Response is a message ID string.
      logger.info(`Successfully sent message: ${JSON.stringify(response)}`);
    })
    .catch((error) => {
      logger.info(`Error sending message: ${error}`);
    });

  //영어
  registrationTokens = [];
  queryResult = await getAllFCMToken(1);
  queryResult.forEach(element => {
    if (element.fcm_token != '') {
      registrationTokens.push(element.fcm_token);
    }
  });
  console.log(registrationTokens);
  // 메시지
  payload = {
    notification: {
      title: 'Please collect the garbage floating on the sea.',
      body: "There was a lot of garbage today! Let's make the world cleaner together!",
      icon: 'alram_icon',
      color: '#00A7C5'
    }
  }
  // 불러온 함수 값을 넣어서 실행 시켜주면 된다.
  admin.messaging().sendToDevice(registrationTokens, payload, options)
    .then((response) => {
      // Response is a message ID string.
      logger.info(`Successfully sent message: ${JSON.stringify(response)}`);
    })
    .catch((error) => {
      logger.info(`Error sending message: ${error}`);
    });
  
  res.send();
});

function getAllFCMToken(language) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT DISTINCT fcm_token FROM user_info WHERE message_consent = 1 AND country = ${ language };`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          resolve(results);
          conn.release();
        });
    })
  });
}


app.get('/kakao/login', passport.authenticate('kakao', { failureRedirect: '/', successFlash: 'kakao' }));

app.get('/admin/login', passport.authenticate('kakao', { failureRedirect: '/', successFlash: 'admin' }));

app.get('/oauth', async (req, res) => {
  passport.authenticate('kakao', { failureRedirect: '/', successFlash: 'admin' }, async (err, user) => {

    if (!user) {
      res.redirect('/');
    }
    let at = await createJWT(user);
    logger.info(`${user} 카카오 로그인 성공`);
    res.send('<h1>Login Success</h1><script>location.href="uniwebview://action?access_token=' + at + '&expires_in=14";</script>');
  })(req, res)
});


app.get('/google/login', async (req, res) => {
  try {
    request('https://oauth2.googleapis.com/tokeninfo?id_token=' + req.body.access_token, function (error, response, body) {
      if (response.statusCode != 200) {
        logger.warn(`구글IdToken 검증 실패 : ${body}`);
        res.status(401).json({ status: 401 });
      }
    });
    await googleSave(req.body.user_no);
  } catch (err) {
    logger.error(`DB유저정보등록 실패 : ${err}`);
    res.json({ status: 100003 });
  }
  logger.info(`${req.body.user_no} 구글 로그인 성공`);
  result = {
    status: 200,
    access_token: await createJWT(req.body.user_no),
    expires_date: moment().add(14, 'days')
  }
  res.json(result);
});

app.get('/jwt', async (req, res) => {
  result = {
    status: 200,
    access_token: await createJWT(req.userNo),
    expires_date: moment().add(14, 'days')
  }
  res.json(result);
});

app.get('/version', async (req, res) => {
  let queryResult = await getVersion().then().catch(e => {
    res.json({ status: 100003 });
  });
  let result = {
    status: 200,
    version: queryResult[0].version
  }
  res.json(result);
});

app.listen(process.env.PORT, () => {
  logger.info(`Server Start!`);
})

async function googleSave(userId) {
  getConnection((conn) => {
    let sql = `INSERT user_info (user_no, login_type, connection_date, start_date) 
  VALUES ('${userId}', 1, '${moment.utc().format(dateFormat)}', '${moment.utc().format(dateFormat)}')
  ON DUPLICATE KEY
  UPDATE connection_date = '${moment.utc().format(dateFormat)}'`;
    conn.query(sql,
      function (error, results, fields) {
        if (error) throw error;
        logger.info(`SQL : ${sql}`);
        conn.release();
      });
  });
}

// 사용자 구현 부분
async function save(accessToken, refreshToken, profile) {
  //save 로직 구현
  getConnection((conn) => {
    let sql = `INSERT user_info (user_no, access_token, refresh_token, login_type, connection_date, start_date) 
  VALUES ('${profile._json.id}', '${accessToken}', '${refreshToken}', 0, '${moment.utc().format(dateFormat)}', '${moment.utc().format(dateFormat)}')
  ON DUPLICATE KEY
  UPDATE access_token = '${accessToken}', refresh_token = '${refreshToken}', connection_date = '${moment.utc().format(dateFormat)}'`;
    conn.query(sql,
      function (error, results, fields) {
        if (error) throw error;
        logger.info(`SQL : ${sql}`);
        conn.release();
      });
  });
}

function getVersion() {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT version FROM game_version`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          resolve(results);
          conn.release();
        });
    })
  });
}

function createJWT(userNo) {
  return new Promise((resolve, reject) => {
    let userInfo = { user_no: userNo };
    let secretKey = process.env.SECRET_KEY;
    let options = { expiresIn: '14d', subject: 'userInfo' }
    jwt.sign(userInfo, secretKey, options,
      function (err, token) {
        if (err) {
          logger.error(`${err}`);
        }
        else {
          updateJWTtoken(userNo, token);
          logger.info(`JWT토큰 발급 ${userNo}, ${token}`);

          resolve(token);
        }
      }
    )
  })
}

function updateJWTtoken(userNo, jwt) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `UPDATE user_info SET jwt_access_token = '${jwt}' WHERE user_no = '${userNo}'`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          resolve(results);
          conn.release();
        });
    })
  });
}

function verifyJWTtoken(token) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let sql = `SELECT user_no FROM user_info WHERE jwt_access_token = '${token}'`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          resolve(results);
          conn.release();
        });
    })
  });
}

module.exports.saveLog = function (userNo, sqlText) {
  return new Promise((resolve, reject) => {
    getConnection((conn) => {
      let log = `SQL : ${sqlText}`;
      let sql = `INSERT INTO system_log (user_no, log, date) VALUES ('${userNo}', "${log}", '${moment().utc().format(dateFormat)}')`;
      conn.query(sql,
        function (error, results, fields) {
          if (error) reject(error);
          logger.info(`SQL : ${sql}`);
          resolve(results);
          conn.release();
        });
    })
  });
}