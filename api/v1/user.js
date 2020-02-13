const Router = require('koa-router')
const UserModel = require('../../models/UserModel')
const storeModel = require('../../models/StoreModel')
const OrderModel = require('../../models/OrderModel')
const encryptPassword = require('../../lib/encryptPassword')
const verifyAuth = require('../../middleWares/verifyAuth')
const { ParameterException } = require('../../core/http-exception')
const jwt = require('jsonwebtoken')
const tradeNo = require('../../lib/generateOrderNum')
const upload = require('../../middleWares/multer')
const AlipaySdk = require('alipay-sdk').default
const AlipayFormData = require('alipay-sdk/lib/form').default
const { alipay, secret } = require('../../config')

const { appId, privateKey, gateway, alipayPublicKey, sellerId } = alipay

const alipaySdk = new AlipaySdk({
  appId,
  privateKey,
  gateway,
  alipayPublicKey
})

const router = new Router({
  prefix: '/api/public/v1'
})

// 登录
router.post('/user/login', async (ctx, next) => {
  let {
    data: { username, password }
  } = JSON.parse(ctx.request.rawBody)

  let user = await UserModel.findOne({
    $or: [{ username }, { user_phone: username }]
  })
  if (!user || encryptPassword(password) !== user.password) {
    ctx.body = {
      errorCode: 1,
      message: '用户不存在,或账号密码错误'
    }
  } else {
    let { username, user_phone: phone, _id: id, currentAvatar: avatar } = user
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
  await next()
})

// token校验
router.get('/validate/token', verifyAuth(), async (ctx, next) => {
  const { decode } = ctx.state

  let { username, phone, id } = decode
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
  await next()
})

// 注册
router.post('/user/register', async (ctx, next) => {
  let {
    data: { username, password, phone }
  } = JSON.parse(ctx.request.rawBody)

  let user1 = await UserModel.findOne({ username })

  let user2 = await UserModel.findOne({ user_phone: phone })

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
    })
    ctx.body = {
      errorCode: 0,
      message: '注册成功'
    }
  }
  await next()
})

// 修改密码
router.post('/user/password', verifyAuth(), async (ctx, next) => {
  const { decode } = ctx.state

  const { id } = decode
  const { oldPassword, newPassword } = JSON.parse(ctx.request.rawBody)
  const hashOldPass = encryptPassword(oldPassword)

  const user = await UserModel.findById(id)

  if (hashOldPass !== user.password) {
    return (ctx.body = {
      errorCode: 1,
      message: '原密码不正确...'
    })
  }

  user.password = newPassword

  user.save(err => {
    if (err) throw err
    console.log('密码修改成功...')
  })

  ctx.body = {
    errorCode: 0,
    message: '密码修改成功...'
  }
  await next()
})

// 添加收货地址
router.post('/address/add', async (ctx, next) => {
  let {
    data: { id, address }
  } = JSON.parse(ctx.request.rawBody)

  const user = await UserModel.findById(id)

  user.user_address.unshift(address)

  user.save(err => {
    if (err) throw err
    console.log('添加地址成功')
  })

  ctx.body = {
    errorCode: 0,
    message: '添加成功'
  }

  await next()
})

// 修改地址
router.put('/address/update/:id', verifyAuth(), async (ctx, next) => {
  const { decode } = ctx.state

  const { id } = decode
  let { id: addressId } = ctx.params

  const user = await UserModel.findById(id)

  if (user) {
    let address = JSON.parse(ctx.request.rawBody)
    let index = user.user_address.findIndex(item => item['_id'] == addressId)
    user.user_address[index] = address

    user.save(err => {
      if (err) throw err
      console.log('地址更新成功')
    })

    ctx.body = {
      errorCode: 0,
      message: '更新成功'
    }
  }

  await next()
})

// 获取指定地址
router.get('/address/one/:id', verifyAuth(), async (ctx, next) => {
  const { decode } = ctx.state

  const { id } = decode
  let { id: addressId } = ctx.params

  const user = await UserModel.findById(id)

  if (user) {
    let address = user.user_address.find(item => item['_id'] == addressId)

    ctx.body = {
      errorCode: 0,
      message: 'ok',
      data: address
    }
  }

  await next()
})

// 删除地址
router.delete('/address/delete/:id', verifyAuth(), async (ctx, next) => {
  const { decode } = ctx.state

  const { id } = decode
  let { id: addressId } = ctx.params

  const user = await UserModel.findById(id)

  if (user) {
    let index = user.user_address.findIndex(item => item['_id'] == addressId)

    user.user_address.splice(index, 1)

    user.save(err => {
      if (err) throw err
      console.log('地址更新成功')
    })

    ctx.body = {
      errorCode: 0,
      message: '删除成功'
    }
  }
  await next()
})

// 获取所有收货地址
router.get('/address', verifyAuth(), async (ctx, next) => {
  const { decode } = ctx.state

  const { id } = decode

  let user = await UserModel.findById(id)

  ctx.body = {
    errorCode: 0,
    message: 'ok',
    address: user.user_address
  }

  await next()
})

// 获取订单
router.get('/order', verifyAuth(), async (ctx, next) => {
  const { decode } = ctx.state

  const { id } = decode

  let user = await UserModel.findById(id)
  ctx.body = {
    errorCode: 0,
    message: 'ok',
    orders: user.user_order
  }
  await next()
})

// 生成订单
router.post('/order', async (ctx, next) => {
  let {
    data: {
      userId,
      storeId,
      storeName,
      storeLogoUrl,
      foods,
      price,
      address: { name, phone, address }
    }
  } = JSON.parse(ctx.request.rawBody)

  const formData = new AlipayFormData()
  // 调用 setMethod 并传入 get，会返回可以跳转到支付页面的 url
  formData.setMethod('get')

  formData.addField(
    'notifyUrl',
    'http://www.linhuibin.com/api/public/v1/notify'
  )

  const outTradeNo = tradeNo()

  formData.addField('bizContent', {
    outTradeNo,
    productCode: 'FAST_INSTANT_TRADE_PAY',
    totalAmount: price,
    subject: '外卖订单支付',
    body: storeName + ':' + foods[0].name,
    quitUrl: 'http://www.linhuibin.com/client#/order'
  })

  const result = await alipaySdk.exec(
    'alipay.trade.wap.pay',
    {},
    { formData: formData }
  )

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

  OrderModel.create(order)

  ctx.body = {
    errorCode: 0,
    message: 'ok',
    result
  }

  await next()
})

// 根据orderNum(订单号)获取订单详情
router.get('/order/detail/:orderNum', verifyAuth(), async (ctx, next) => {
  let { decode: {id: userId} } = ctx.state
  let { orderNum } = ctx.params

  try {
    let user = await UserModel.findById(userId)

    let orders = user.user_order

    let order = orders.find(order => order.num === orderNum)

    ctx.body = {
      errorCode: 0,
      message: 'ok',
      data: order
    }
  } catch(e) {
    console.log(e)
    throw new ParameterException()
  }
  await next()
})

// 支付宝 支付结果处理
router.post('/notify', async (ctx, next) => {
  let data = ctx.request.body
  if (alipaySdk.checkNotifySign(data)) {
    const order = await OrderModel.findOne({ num: data['out_trade_no'] })

    // 验证out_trade_no、total_amount、seller_id、app_id
    if (
      order &&
      order.price == data['total_amount'] &&
      data['seller_id'] === sellerId &&
      data['app_id'] === appId
    ) {
      // 支付成功保存订单
      if (data['trade_status'] === 'TRADE_SUCCESS') {
        // 将订单状态改为 已支付
        order.status = 2

        const user = await UserModel.findById(order.userId)
        const store = await storeModel.findById(order.storeId)

        // 用户保存订单
        user.user_order.unshift(order)

        // 店铺保存订单
        store.orders.unshift(order)

        // 订单上的商品销量增加
        order.foods.forEach(f => {
          store.store_goods.forEach(g => {
            if (f.id == g.food_id) {
              g.food_sales += parseFloat(f.num)
            }
          })
          store.store_categories.forEach(cat => {
            cat.children.forEach(c => {
              if (f.id == c.food_id) {
                c.food_sales += parseFloat(f.num)
              }
            })
          })
        })

        // 店铺订单数+1
        store.store_sales += 1

        user.save(err => {
          if (err) throw err
          console.log('生成订单成功')
        })

        store.save(err => {
          if (err) throw err
        })

        order.save(err => {
          if (err) throw err
        })
      }
    }
  }
  ctx.body = 'success'
  await next()
})

// 更改头像
router.post('/user/avatar', upload.single('avatar'), async (ctx, next) => {
  const { id } = ctx.request.query
  const user = await UserModel.findById(id)

  if (user) {
    const filePath =
      'http://118.31.2.223:8080/uploads/avatars/' + ctx.req.file.filename

    user.currentAvatar = filePath

    user.historyAvatar.unshift(filePath)

    if (user.historyAvatar.length > 5) {
      user.historyAvatar.length = 5
    }

    user.save(err => {
      if (err) throw err
    })

    ctx.body = {
      errorCode: 0,
      message: 'ok',
      avatar: user.currentAvatar
    }
  }

  await next()
})

// 获取头像
router.get('/user/avatar/:id', async (ctx, next) => {
  let { id } = ctx.params
  const user = await UserModel.findById(id)
  ctx.body = {
    errorCode: 0,
    message: 'ok',
    avatar: user.currentAvatar
  }
  await next()
})

module.exports = router
