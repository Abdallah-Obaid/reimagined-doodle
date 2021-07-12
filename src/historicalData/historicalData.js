'use strict';
const superagent = require('superagent');
const SensorTypeEnum = require('../../src/enum/sensorTypeEnum.js');
const SensorAlertSeverityEnum = require('../../src/enum/sensorAlertSeverityEnum.js');
const helper = require('../../helper.js');

// Application setup
const CMS_URL = process.env.CMS_URL;
const IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI =  process.env.IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI;
const FIBARO_PASSWORD_MERAKI = process.env.FIBARO_PASSWORD_MERAKI;
const FIBARO_USER_NAME_MERAKI = process.env.FIBARO_USER_NAME_MERAKI;
const HISTORICAL_DATA_INTERVAL = process.env.HISTORICAL_DATA_INTERVAL;
const CO2_SENSOR_ID = process.env.CO2_SENSOR_ID;
const DUST_SENSOR_ID = process.env.DUST_SENSOR_ID;
const AMPERE_SENSOR_ID = process.env.AMPERE_SENSOR_ID;
const VOLT_SENSOR_ID = process.env.VOLT_SENSOR_ID;
const WATT_SENSOR_ID = process.env.WATT_SENSOR_ID;

// Global vars
var historicalData={};
var historicalDataGenerator= function(typeId,readingValue,readingStatus,readingDate){
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
 * This function will get the dust data and generator historical data from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getDust() {
  var dustDeviceID = DUST_SENSOR_ID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${dustDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(async dustData => {
      var dustObject = {};
      var dustDatavalue = dustData.body.properties.value;
      if (dustDatavalue || dustDatavalue == 0) {
        var thresholds =await helper.getThresholds();
        if (thresholds.dust.low >= Number(dustDatavalue) && Number(dustDatavalue) >= 0) {
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (thresholds.dust.low < Number(dustDatavalue) && Number(dustDatavalue) <= thresholds.dust.high) {
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.moderate;
        }
        if (Number(dustDatavalue) > thresholds.dust.high) {
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.high;
        }
        historicalDataGenerator(SensorTypeEnum.sensorType.dust,Number(dustDatavalue),dustObject.status,new Date().toUTCString());

        dustObject.value=dustDatavalue;

      }
  
    })
    .catch(err => {
      console.log('Dust alert sensor error: ', err);
    });
}

/** 
 * This function will get the data and generator historical data from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getSmoke() {
  var co2DeviceID = CO2_SENSOR_ID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${co2DeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(async co2Data => {
      var co2Object = {};
      var co2Datavalue = co2Data.body.properties.value;
      if (co2Datavalue ||co2Datavalue == 0) {
        var thresholds =await helper.getThresholds();
        if (thresholds.co2.high >= Number(co2Datavalue) && Number(co2Datavalue) >= thresholds.co2.low) {
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (thresholds.co2.high < Number(co2Datavalue)) {
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.high;
        }
        if (Number(co2Datavalue) < thresholds.co2.low) {
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.low;
        }
        historicalDataGenerator(SensorTypeEnum.sensorType.co2,Number(co2Datavalue),co2Object.status,new Date().toUTCString());

        co2Object.value=co2Datavalue;
      } 
    })
    .catch(err => {
      console.log('Co2 alert sensor error: ', err);
    });
}

/** 
 * This function will get the data and generator historical data from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getPower() {
  var powerDeviceID = WATT_SENSOR_ID;
  var powerDeviceIDAmpere = AMPERE_SENSOR_ID;
  var powerDeviceIDVolt = VOLT_SENSOR_ID;
  var powerObject = {};
  powerObject.value={};
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices?parentId=${powerDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(powerData => {
      powerObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
      const filterPowerData = powerData.body.filter((itemInArray) => {return (itemInArray.id == powerDeviceIDAmpere ||itemInArray.id == powerDeviceIDVolt)  ;});
      powerObject.value = Math.abs(filterPowerData[0].properties.value * filterPowerData[1].properties.value);
      historicalDataGenerator(SensorTypeEnum.sensorType.power,Number(powerObject.value),powerObject.status,new Date().toUTCString());
    })
    .catch(err => {
      console.log('Power alert sensor error: ', err);
    });
}

var initialeHistoricalDataService= function(){
  setInterval(()=>{
    getDust();
    getSmoke();
    getPower();
  }, HISTORICAL_DATA_INTERVAL); 
};
historicalData.initialeHistoricalDataService= initialeHistoricalDataService;

module.exports = historicalData;