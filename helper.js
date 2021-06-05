'use strict';
const superagent = require('superagent');
var helper = {};
helper.sendSmokeAlert= function(message){
  superagent.get(`https://test.penguinin.com/cms_ahmad/Alerts/SendALert?type=3&message=${message}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .then(done => {
      console.log('Smoke alert sent: ',message);

    })
    .catch(err => {
      console.log('Smoke alert error: ', err);

    });

};
module.exports = helper;