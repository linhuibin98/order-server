// 获取七天内订单销售数量

function filterOrderData(orders, day) {
  //设置日期，当前日期的前七天
  var myDate = new Date() //获取今天日期
  myDate.setDate(myDate.getDate() - day + 1)
  var xData = []
  var seriesData = []
  var dateTemp
  var flag = 1
  for (var i = 0; i < day; i++) {
    var y1 = myDate.getFullYear() // 当前年份
    let m1 = myDate.getMonth() + 1
    let d1 = myDate.getDate()
    dateTemp = m1 + '-' + d1
    xData.push(dateTemp)
    // 记录当天订单数
    let count = 0

    // 计算七天各订单数
    orders.forEach(item => {
      let t = new Date(item.time)
      let y2 = t.getFullYear()
      let m2 = t.getMonth() + 1
      let d2 = t.getDate()

      if (y2 === y1 && m2 === m1 && d2 === d1) {
        count++
      }
    })
    seriesData.push(count)
    myDate.setDate(myDate.getDate() + flag)
  }

  return {
    xData,
    seriesData
  }
}

module.exports = filterOrderData
