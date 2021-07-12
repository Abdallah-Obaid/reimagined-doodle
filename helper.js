'use strict';
const superagent = require('superagent');
const CMS_URL = process.env.CMS_URL;
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

/** 
 * This function will get the thresholds for alerts from Cms DB
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
helper.getThresholds= async function() {
  var thresholdsData = await superagent.get(`${CMS_URL}/Alerts/GetAlertThresholds`)
    .then(thresholds => {
      return thresholds.body;
    })
    .catch(err => {
      console.log('Thresholds for alert error: ', err);
    });
  return thresholdsData;
};
module.exports = helper;