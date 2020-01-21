const { Schema, model } = require('mongoose')
const encryptPassword = require('../lib/encryptPassword')

let OrderSchema = new Schema({
  num: String,
  time: Date,
  storeId: Schema.Types.ObjectId,
  userId: Schema.Types.ObjectId,
  storeName: String,
  storeLogoUrl: String,
  foods: Array,
  price: Number,
  userName: String,
  userPhone: String,
  userAddress: String
})

let userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  user_phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    set(value) {
      return encryptPassword(value)
    }
  },
  currentAvatar: String,
  historyAvatar: Array,
  user_address: [
    {
      name: String,
      phone: String,
      address: String,
      detail: String
    }
  ],
  user_order: [OrderSchema]
})

const UserModel = model('user', userSchema)

module.exports = UserModel
