const { HttpException } = require('../core/http-exception.js');
const fs = require('fs');
const path = require('path');

const catchError = () => {
  return async (ctx, next) => {
    try {
      await next();
      // 所有路由未匹配, 走404
      if (ctx.status === 404) {
        const rs = fs.createReadStream(path.resolve(__dirname, '../public/404.html'), 'utf8');
        ctx.status = 404;
        ctx.type = 'html';
        ctx.body = rs;
      }
    } catch (e) {
      if (e instanceof HttpException) {
        let sendMsg = {
          message: e.message,
          errorCode: e.errorCode
        }
        ctx.status = e.code;
        ctx.body = sendMsg;
      } else {
        console.log(e)
        ctx.body = {
          message: '服务端未知错误',
          errorCode: 1
        };
      }
    }
  }
}

module.exports = catchError;