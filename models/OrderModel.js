const { Schema, model } = require('mongoose');

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
  userAddress: String,
  status: Number, // 1-> 未支付, 2 -> 已支付
});

const OrderModel = model('order', OrderSchema);

module.exports = OrderModel;