const jwt = require('jsonwebtoken')
const { secret } = require('../config')
const { AuthException } = require('../core/http-exception')

const verifyAuth = () => {
  return async (ctx, next) => {
    const token =
      ctx.request.headers.authorization || ctx.request.headers['x-token']

    if (!token) {
      throw new AuthException('没有访问权限')
    }

    const decode = jwt.verify(token, secret)

    if (!decode) {
      throw new AuthException('没有访问权限')
    }

    ctx.state.decode = decode

    await next()
  }
}

module.exports = verifyAuth
