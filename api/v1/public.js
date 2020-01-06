const Router = require('koa-router');

const router = new Router();

router.get('/client', async (ctx, next) => {
  ctx.redirect('http:118.31.2.223/client');
  await next();
})

router.get('/blog', async (ctx, next) => {
  ctx.redirect('http:118.31.2.223/');
  await next();
})

router.get('/cms', async (ctx, next) => {
  ctx.redirect('http:118.31.2.223/cms');
  await next();
})

module.exports = router;