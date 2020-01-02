const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const staticMiddleware = require('koa-static');
const path = require('path');
const registerRouter = require('./api/v1');
const catchError = require('./middleWares/catchError');
const connectDB = require('./middleWares/connectDB');
const cors = require('koa2-cors');
const fs = require('fs');
const zlib = require('zlib');

const app = new Koa();
app.use(catchError());
app.use(cors());
app.use(connectDB());
app.use(bodyParser());
app.use(staticMiddleware(path.resolve(__dirname, './static')));
app.use(registerRouter());

// 404
app.use(async (ctx, next) => {
  if (ctx.url === '/') {
    ctx.redirect('http://118.31.2.223/blog');
  } else {
    const rs = fs.createReadStream(path.resolve(__dirname, './public/404.html'), 'utf8');
    ctx.status = 404;
    ctx.type = 'html';
    ctx.body = rs.pipe(zlib.createGunzip());
  }
})

app.listen(8080, () => {
  console.log('server is runing at port 8080');
})