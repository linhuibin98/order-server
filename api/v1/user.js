const Router = require('koa-router');
const UserModel = require('../../models/UserModel');
const storeModel = require('../../models/StoreModel');
const OrderModel = require('../../models/OrderModel');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const tradeNo = require('../../lib/generateOrderNum');
const upload = require('../../middleWares/multer');
const AlipaySdk = require('alipay-sdk').default;
const AlipayFormData = require('alipay-sdk/lib/form').default;
const { alipay } = require('../../config');

const { appId, privateKey, gateway, alipayPublicKey, sellerId } = alipay;

const alipaySdk = new AlipaySdk({
  appId,
  privateKey,
  gateway,
  alipayPublicKey
});

const router = new Router({
  prefix: '/api/public/v1'
});

const secret = 'lhblinhibin';

// 登录
router.post('/user/login', async (ctx, next) => {
  let { data: { username, password } } = JSON.parse(ctx.request.rawBody);

  let user = await UserModel.findOne({ '$or': [{ username }, { user_phone: username }] });
  if (!user || crypto.createHash('sha1', secret).update(password).digest('hex') !== user.password) {
    ctx.body = {
      errorCode: 1,
      message: '用户不存在,或账号密码错误'
    }
  } else {
    let { username, user_phone: phone, _id: id, currentAvatar: avatar } = user;
    let userInfo = {
      username,
      phone,
      id
    }
    ctx.body = {
      errorCode: 0,
      message: '登录成功',
      userInfo,
      avatar,
      token: jwt.sign(userInfo, secret, {
        expiresIn: 60 * 60 * 24
      })
    }
  }
  await next();
});

// token校验
router.get('/validate/token', async (ctx, next) => {
  let token = ctx.request.headers.authorization;
  jwt.verify(token, secret, (err, decode) => {
    if (err) {
      return ctx.body = {
        errorCode: 1,
        message: 'token失效了'
      }
    } else {
      let { username, phone, id, avatar } = decode;
      let sendDada = {
        username,
        phone,
        id
      }
      ctx.body = {
        errorCode: 0,
        message: 'ok',
        userInfo: sendDada,
        token: jwt.sign(sendDada, secret, {
          expiresIn: 60 * 60 * 24
        })
      }
    }
  })
  await next();
})

// 注册
router.post('/user/register', async (ctx, next) => {
  let { data: { username, password, phone } } = JSON.parse(ctx.request.rawBody);

  let user1 = await UserModel.findOne({ username });

  let user2 = await UserModel.findOne({ user_phone: phone });

  if (user1) {
    ctx.body = {
      errorCode: 1,
      message: '该用户名已经注册'
    }
  } else if (user2) {
    ctx.body = {
      errorCode: 1,
      message: '该手机号已经注册'
    }
  } else {
    UserModel.create({
      username,
      password,
      user_phone: phone
    });
    ctx.body = {
      errorCode: 0,
      message: '注册成功'
    }
  }
  await next();
});

// 修改密码
router.post('/user/password', async (ctx, next) => {
  let token = ctx.request.headers.authorization;
  function jwtDecode(token) {
    let result = {};
    jwt.verify(token, secret, (err, decode) => {
      if (err) {
        return result = { verify: false };
      } else {
        result = { verify: true, decode };
      }
    })
    return result;
  }

  let { verify, decode } = jwtDecode(token);

  if (!verify) {
    return ctx.body = {
      errorCode: 1,
      message: '禁止访问, 请登录后再试...'
    }
  }

  const { id } = decode;
  const { oldPassword, newPassword } = JSON.parse(ctx.request.rawBody);
  const hashOldPass = crypto.createHash('sha1', secret).update(oldPassword).digest('hex');

  const user = await UserModel.findById(id);

  if (hashOldPass !== user.password) {
    return ctx.body = {
      errorCode: 1,
      message: '原密码不正确...'
    }
  }

  user.password = newPassword;

  user.save(err => {
    if (err) throw err;
    console.log('密码修改成功...');
  })

  ctx.body = {
    errorCode: 0,
    message: '密码修改成功...'
  }
  await next();
})

// 添加收货地址
router.post('/address/add', async (ctx, next) => {
  let { data: { id, address } } = JSON.parse(ctx.request.rawBody);

  const user = await UserModel.findById(id);

  user.user_address.unshift(address);

  user.save(err => {
    if (err) throw err;
    console.log('添加地址成功');
  });

  ctx.body = {
    errorCode: 0,
    message: 'ok',
    address: user.user_address
  }

  await next();
});

// 获取收货地址
router.get('/address/:id', async (ctx, next) => {
  let { id } = ctx.params;

  let user = await UserModel.findById(id);

  ctx.body = {
    errorCode: 0,
    message: 'ok',
    address: user.user_address
  }

  await next();
})

// 获取订单
router.get('/order/:id', async (ctx, next) => {
  let { id } = ctx.params;
  let user = await UserModel.findById(id);
  ctx.body = {
    errorCode: 0,
    message: 'ok',
    orders: user.user_order
  }
  await next();
});

// 生成订单
router.post('/order', async (ctx, next) => {
  let { data: { userId, storeId, storeName, storeLogoUrl, foods, price, address: { name, phone, address } } } = JSON.parse(ctx.request.rawBody);

  const formData = new AlipayFormData();
  // 调用 setMethod 并传入 get，会返回可以跳转到支付页面的 url
  formData.setMethod('get');

  formData.addField('notifyUrl', 'http://118.31.2.223/api/public/v1/notify');

  const outTradeNo = tradeNo();

  formData.addField('bizContent', {
    outTradeNo,
    productCode: 'FAST_INSTANT_TRADE_PAY',
    totalAmount: price,
    subject: '外卖订单支付',
    body: storeName + ':' + foods[0].name,
    quitUrl: 'http://118.31.2.223/client#/order'
  });

  const result = await alipaySdk.exec(
    'alipay.trade.wap.pay',
    {},
    { formData: formData },
  );

  const order = {
    num: outTradeNo,
    time: new Date().getTime(),
    storeId,
    userId,
    storeName,
    storeLogoUrl,
    foods,
    price,
    userAddress: address,
    userName: name,
    userPhone: phone,
    status: 1
  }

  OrderModel.create(order);

  ctx.body = {
    errorCode: 0,
    message: 'ok',
    result
  };

  await next();
});

// 支付宝 支付结果处理
router.post('/notify', async (ctx, next) => {
  let data = ctx.request.body;
  if (alipaySdk.checkNotifySign(data)) {
    const order = await OrderModel.findOne({ num: data['out_trade_no'] });

    // 验证out_trade_no、total_amount、seller_id、app_id
    if (order && (order.price == data['total_amount']) && (data['seller_id'] === sellerId) && (data['app_id'] === appId)) {
      // 支付成功保存订单
      if (data['trade_status'] === 'TRADE_SUCCESS') {
        // 将订单状态改为 已支付
        order.status = 2;

        const user = await UserModel.findById(order.userId);
        const store = await storeModel.findById(order.storeId);

        // 用户保存订单
        user.user_order.unshift(order);

        // 店铺保存订单
        store.orders.unshift(order);

        // 订单上的商品销量增加
        order.foods.forEach(f => {
          store.store_goods.forEach(g => {
            if (f.id == g.food_id) {
              g.food_sales += parseFloat(f.num);
            }
          });
          store.store_categories.forEach(cat => {
            cat.children.forEach(c => {
              if (f.id == c.food_id) {
                c.food_sales += parseFloat(f.num);
              }
            })
          })
        })

        // 店铺订单数+1
        store.store_sales += 1;

        user.save(err => {
          if (err) throw err;
          console.log('生成订单成功');
        });

        store.save(err => {
          if (err) throw err;
        });

        order.save(err => {
          if (err) throw err;
        });
      }
    }
  }
  ctx.body = 'success'
  await next();
})

// 更改头像
router.post('/user/avatar', upload.single('avatar'), async (ctx, next) => {
  const { id } = ctx.request.query;
  const user = await UserModel.findById(id);

  const filePath = 'http://118.31.2.223:8080/uploads/avatars/' + ctx.req.file.filename;

  user.currentAvatar = filePath;

  user.historyAvatar.unshift(filePath);

  if (user.historyAvatar.length > 5) {
    user.historyAvatar.length = 5;
  }

  user.save(err => {
    if (err) throw err;
  })

  ctx.body = {
    errorCode: 0,
    message: 'ok',
    avatar: user.currentAvatar
  }
  await next();
})

// 获取头像
router.get('/user/avatar/:id', async (ctx, next) => {
  let { id } = ctx.params;
  const user = await UserModel.findById(id);
  ctx.body = {
    errorCode: 0,
    message: 'ok',
    avatar: user.currentAvatar
  }
  await next();
})

module.exports = router;