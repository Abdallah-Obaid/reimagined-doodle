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
const MERAKI_API_KEY = process.env.MERAKI_API_KEY;
const MERAKI_NETWORK_ID = process.env.MERAKI_NETWORK_ID;
const ALERT_CHECK_INTERVAL = process.env.ALERT_CHECK_INTERVAL;
const CO2_SENSOR_ID = process.env.CO2_SENSOR_ID;
const DUST_SENSOR_ID = process.env.DUST_SENSOR_ID;
const TEMPERATURE_SENSOR_SERIAL = process.env.TEMPERATURE_SENSOR_SERIAL;
const HUMIDITY_SENSOR_ID = process.env.HUMIDITY_SENSOR_ID;
const WATERLEAK_SENSOR_ID = process.env.WATERLEAK_SENSOR_ID;

// Global vars
var alerts = {};
var defualtTempStatus = 'normal';
var defualtHumStatus  = 'normal';
var defualtCo2Status  = 'normal';
var defualtDustStatus = 'normal';

var alertSender= function(typeId,readingValue,readingStatus,readingDate){
  superagent.post(`${CMS_URL}/Alerts/SaveAlert`)
    .send({ TypeId: typeId, Description: readingValue ,Severity: readingStatus, AlarmDate: readingDate })
    // .set('Content-Type', 'application/x-www-form-urlencoded')
    .then(done => {
      console.log('Alert sent: ',{ TypeId: typeId, Description: readingValue ,Severity: readingStatus, AlarmDate: readingDate });
      console.log('Alert sent: ',`${CMS_URL}/Alerts/SaveAlert`);
    })
    .catch(err => {
      console.log('Alert sending error: ', err);

    });
};

/** 
 * This function will get the dust for alert from Fibaro sensor
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
      if (dustDatavalue) {
        var thresholds =await helper.getThresholds();
        if (thresholds.dust.normal >= Number(dustDatavalue) && Number(dustDatavalue) >= 0) {
          defualtDustStatus='normal';
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (thresholds.dust.normal < Number(dustDatavalue) && Number(dustDatavalue) <= thresholds.dust.high && (defualtDustStatus=='normal'||defualtDustStatus=='high')) {
          defualtDustStatus='moderate';
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.medium;
          alertSender(SensorTypeEnum.sensorType.dust,Number(dustDatavalue),dustObject.status,new Date().toUTCString());
        }
        if (Number(dustDatavalue) > thresholds.dust.high && (defualtDustStatus=='normal'||defualtDustStatus=='moderate')) {
          defualtDustStatus='high';
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.dust,Number(dustDatavalue),dustObject.status,new Date().toUTCString());
        }
        dustObject.value=dustDatavalue;

      }
  
    })
    .catch(err => {
      console.log('Dust alert sensor error: ', err);
    });
}

/** 
 * This function will get the co2 alert from Fibaro sensor
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
      if (co2Datavalue) {
        var thresholds =await helper.getThresholds();
        if (thresholds.co2.high  >= Number(co2Datavalue) && Number(co2Datavalue) >= thresholds.co2.low ) {
          defualtCo2Status='normal';
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (thresholds.co2.high < Number(co2Datavalue) && (defualtCo2Status=='normal'||defualtCo2Status=='low')) {
          defualtCo2Status='high';
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.co2,Number(co2Datavalue),co2Object.status,new Date().toUTCString());
        }
        if (Number(co2Datavalue) < thresholds.co2.low && (defualtCo2Status=='normal'||defualtCo2Status=='high')) {
          defualtCo2Status='low';
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.low;
          alertSender(SensorTypeEnum.sensorType.co2,Number(co2Datavalue),co2Object.status,new Date().toUTCString());
        }
        co2Object.value=co2Datavalue;
      } 
    })
    .catch(err => {
      console.log('Co2 alert sensor error: ', err);
    });
}

/** 
 * This function will return Temperature alert from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getTemperatureMeraki() {
  var deviceSerial = TEMPERATURE_SENSOR_SERIAL;
  var metric = 'temperature';
  superagent.get(`https://api.meraki.com/api/v1/networks/${MERAKI_NETWORK_ID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(async temperatureData => {
      var temperatureObject = {};
      var temperatureDatavalue = temperatureData.body[0].value;
      if (temperatureDatavalue || temperatureDatavalue == 0) {
        var thresholds =await helper.getThresholds();
        if (thresholds.temperature.high >= Number(temperatureDatavalue) && Number(temperatureDatavalue) >= thresholds.temperature.low) {
          defualtTempStatus= 'normal';
          temperatureObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (thresholds.temperature.high < Number(temperatureDatavalue) && (defualtTempStatus=='normal'||defualtTempStatus=='low')) {
          defualtTempStatus= 'high';
          temperatureObject.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.temperature,Number(temperatureDatavalue),temperatureObject.status,new Date().toUTCString());
        }
        if (Number(temperatureDatavalue) < thresholds.temperature.low && (defualtTempStatus=='normal'||defualtTempStatus=='high')) {
          defualtTempStatus= 'low';
          temperatureObject.status=SensorAlertSeverityEnum.alertSeverity.low;
          alertSender(SensorTypeEnum.sensorType.temperature,Number(temperatureDatavalue),temperatureObject.status,new Date().toUTCString());
        }
        temperatureObject.value=temperatureDatavalue;
      }
    })
    .catch(err => {
      console.log('Temperature alert sensor error: ', err);
    });
}
/** 
 * This function will return humidity alert from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHumidityMeraki() {
  var deviceSerial = HUMIDITY_SENSOR_ID;
  var metric = 'humidity';
  superagent.get(`https://api.meraki.com/api/v1/networks/${MERAKI_NETWORK_ID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(async humidityData => {
      var humidityObject = {};
      var humidityDatavalue = humidityData.body[0].value;
      if (humidityDatavalue || humidityDatavalue == 0) {
        var thresholds =await helper.getThresholds();
        if (thresholds.humidity.high >= Number(humidityDatavalue) && Number(humidityDatavalue) >= thresholds.humidity.low) {
          humidityObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
          defualtHumStatus= 'normal';
        }
        if (thresholds.humidity.high < Number(humidityDatavalue) && (defualtHumStatus=='normal'||defualtHumStatus=='low')) {
          defualtHumStatus= 'high';
          humidityObject.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.humidity,Number(humidityDatavalue),humidityObject.status,new Date().toUTCString()); 
        }
        if (Number(humidityDatavalue) < thresholds.humidity.low && (defualtHumStatus=='normal'||defualtHumStatus=='high')) {
          defualtHumStatus= 'low';
          humidityObject.status=SensorAlertSeverityEnum.alertSeverity.low;
          alertSender(SensorTypeEnum.sensorType.humidity,Number(humidityDatavalue),humidityObject.status,new Date().toUTCString()); 
        }
        humidityObject.value=humidityDatavalue;
      } 
    })
    .catch(err => {
      console.log('Humidity sensor error: ', err);
    });
}

/** 
 * This function will return water leak alert from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getWaterLeakTest() {
  var deviceSerial = WATERLEAK_SENSOR_ID;
  var metric = 'water_detection';
  superagent.get(`https://api.meraki.com/api/v1/networks/${MERAKI_NETWORK_ID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(waterLeakData => {
  
      var waterLeakObject = {};
      var waterLeakDatavalue = waterLeakData.body[0].value;
      if (waterLeakDatavalue || waterLeakDatavalue == 0 ) {
        console.log('waterLeakDatavalue',waterLeakDatavalue);
        if (Number(waterLeakDatavalue) == 0) {
          waterLeakObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }else{
          waterLeakObject.status=SensorAlertSeverityEnum.alertSeverity.leak;
          alertSender(SensorTypeEnum.sensorType.waterLeak,Number(waterLeakDatavalue),waterLeakObject.status,new Date().toUTCString());
        }
        waterLeakObject.value=waterLeakDatavalue;
      }
    })
    .catch(err => {
      console.log('WaterLeak alert sensor error: ', err);
    });
}
var initialeAlertService= function(){
  setInterval(()=>{
    getDust();
    getSmoke();
    getTemperatureMeraki();
    getHumidityMeraki();
    getWaterLeakTest();
  }, ALERT_CHECK_INTERVAL); 
};
alerts.initialeAlertService= initialeAlertService;
alerts.alertSender=alertSender;
module.exports = alerts;