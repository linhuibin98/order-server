const { Schema, model } = require('mongoose')

const statisticsSchema = new Schema({
  visitNum: {
    type: Number,
    default: 0
  },
  time: {
    type: Date
  }
})

const statisticsModel = model('statistics', statisticsSchema)

module.exports = statisticsModel
