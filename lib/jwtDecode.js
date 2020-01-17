const jwt = require('jsonwebtoken');
const secret = 'lhblinhibin';

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

module.exports = jwtDecode;