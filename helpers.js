'use strict';
const superagent = require('superagent');
const CMS_URL = process.env.CMS_URL;
const SensorAlertSeverityEnum = require('./src/enum/sensorAlertSeverityEnum.js');
var helpers = {};
helpers.sendSmokeAlert= function(message){
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
 */
helpers.getThresholds= async function() {
  var thresholdsData = await superagent.get(`${CMS_URL}/Alerts/GetAlertThresholds`)
    .then(thresholds => {
      return thresholds.body;
    })
    .catch(err => {
      console.log('Thresholds for alert error: ', err);
    });
  return thresholdsData;
};

/** 
 * This function will send switch logs to DB
 */
helpers.switchLogGenerator= function(typeId,actionId,userId,roomId,buildingId){
  superagent.post(`${CMS_URL}/Dashboard/SaveLog`)
    .send({ TypeId: typeId, ActionId: actionId,ActionUserId:userId,VenueId:roomId,CampusId:buildingId })
    // .set('Content-Type', 'application/x-www-form-urlencoded')
    .then(done => {
      console.log('Log generated: ',typeId);
    })
    .catch(err => {
      console.log('Log generator error: ', err);
    });
};

/** 
 * This function will save history for sensors and switches to DB
 */
helpers.historicalDataGenerator= function(typeId,readingValue,readingStatus,readingDate){
  superagent.post(`${CMS_URL}/Alerts/SaveHistoryRecord`)
    .send({ TypeId: typeId, ReadingValue: readingValue ,ReadingStatus: readingStatus, ReadingDate: readingDate })
    // .set('Content-Type', 'application/x-www-form-urlencoded')
    .then(done => {
      console.log('Data appended sent: ',typeId);
    })
    .catch(err => {
      console.log('Historical data append error: ', err);
    });
};

/** 
 * This function will calculate the severity
 */
helpers.getSeverity = function(value, severityWindow, above, bellow){
  var highA= above + 2*severityWindow;
  var highB = bellow - 2*severityWindow;
  var meduimA= above + 1*severityWindow;
  var meduimB = bellow - 1*severityWindow;
  var result;
  if (value > highA || value < highB){
    result = SensorAlertSeverityEnum.alertSeverity.high;
  }
  if ((value > meduimA && value <= highA) || ( value < meduimB && value >= highB)){
    result = SensorAlertSeverityEnum.alertSeverity.medium;
  }
  if ((value >= above && value <= meduimA) ||(value <= bellow && value >= meduimA)){
    result = SensorAlertSeverityEnum.alertSeverity.low;
  }
  return result;
};

/** 
 * This function will calculate the dust severity
 * This is special case just for dust sensor where normal range under bellow "not between bellow and above"
 */
helpers.getDustSeverity = function(value, severityWindow, above, bellow){
  var high= above + severityWindow;
  var meduim= above;
  var low = bellow;
  var result;
  if (value >= low && value <= meduim){
    result = SensorAlertSeverityEnum.alertSeverity.low;
  }
  if (value > meduim && value <=high){
    result = SensorAlertSeverityEnum.alertSeverity.medium;
  }
  if(value > high){
    result = SensorAlertSeverityEnum.alertSeverity.high;
  }
  return result;
};

module.exports = helpers;