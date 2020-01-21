const crypto = require('crypto')

const { secret } = require('../config')

module.exports = function encryptPassword(value) {
  return crypto
    .createHash('sha1', secret)
    .update(value)
    .digest('hex')
}
