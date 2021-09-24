const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const moment = require('moment');
const dateFormat = 'YYYY-MM-DD hh:mm:ss';

const { combine, printf } = winston.format;

const timeStamp = () => moment().format(dateFormat);
const logFormat = printf(({ level, message }) => `${timeStamp()} ${level}: ${message}`);

const logger = winston.createLogger({
  format: combine(
    logFormat,
  ),

  // 하루 간격 로그 파일
  transports: [
    // // info log setting
    // new winstonDaily({
    //   level: 'info', // info 레벨의 경우
    //   datePattern: 'YYYY-MM-DD',
    //   dirname: 'log', // 로그 파일이 저장될 경로
    //   filename: `%DATE%.log`, // 생성될 파일 이름
    //   maxFiles: 30, // 30 Days saved
    //   json: false,
    //   zippedArchive: true,
    // }),
    // // error log setting
    // new winstonDaily({
    //   level: 'error',
    //   datePattern: 'YYYY-MM-DD',
    //   dirname: 'log', // 로그 파일이 저장될 경로
    //   filename: `%DATE%.error.log`, // 생성될 파일 이름
    //   maxFiles: 30, // 30 Days saved
    //   handleExceptions: true,
    //   json: false,
    //   zippedArchive: true,
    // }),

    new winston.transports.Console({
      level: "info",
      format: winston.format.combine(
        winston.format.printf(
          info => `${timeStamp()} [${info.level}] ${info.message}`
        )
      )
    }),
  ],
});

module.exports = logger;