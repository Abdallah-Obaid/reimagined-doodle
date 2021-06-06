'use strict';
const superagent = require('superagent');
const SensorTypeEnum = require('../../src/enum/sensorTypeEnum.js');
const SensorAlertSeverityEnum = require('../../src/enum/sensorAlertSeverityEnum.js');

// Application setup
const CMS_URL = process.env.CMS_URL;
const IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI =  process.env.IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI;
const FIBARO_PASSWORD_MERAKI = process.env.FIBARO_PASSWORD_MERAKI;
const FIBARO_USER_NAME_MERAKI = process.env.FIBARO_USER_NAME_MERAKI;
const MERAKI_API_KEY = process.env.MERAKI_API_KEY;
const MERAKI_NETWORK_ID = process.env.MERAKI_NETWORK_ID;
const ALERT_CHECK_INTERVAL = process.env.ALERT_CHECK_INTERVAL;

// Global vars
var alerts = {};

var alertSender= function(typeId,readingValue,readingStatus,readingDate){
  superagent.post(`${CMS_URL}/Alerts/SaveAlert`)
    .send({ TypeId: typeId, Description: readingValue ,Severity: readingStatus, AlarmDate: readingDate })
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .then(done => {
      console.log('Alert sent: ',typeId);

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
  var dustDeviceID = 46;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${dustDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(dustData => {
      var dustObject = {};
      var dustDatavalue = dustData.body.properties.value;
      if (dustDatavalue) {
        if (50 >= Number(dustDatavalue) && Number(dustDatavalue) >= 0) {
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (50 < Number(dustDatavalue) && Number(dustDatavalue) <= 100) {
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.moderate;
          alertSender(SensorTypeEnum.sensorType.dust,dustObject.value,dustObject.status,new Date());
        }
        if (Number(dustDatavalue) > 100) {
          dustObject.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.dust,dustObject.value,dustObject.status,new Date());
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
  var co2DeviceID = 44;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${co2DeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(async co2Data => {
      var co2Object = {};
      var co2Datavalue = co2Data.body.properties.value;
      if (co2Datavalue) {
        if (1000 >= Number(co2Datavalue) && Number(co2Datavalue) >= 400) {
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (1000 < Number(co2Datavalue)) {
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.co2,co2Object.value,co2Object.status,new Date());
        }
        if (Number(co2Datavalue) < 400) {
          co2Object.status=SensorAlertSeverityEnum.alertSeverity.low;
          alertSender(SensorTypeEnum.sensorType.co2,co2Object.value,co2Object.status,new Date());
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
  var deviceSerial = 'Q3CA-2DY2-LG4W';
  var metric = 'temperature';
  superagent.get(`https://api.meraki.com/api/v1/networks/${MERAKI_NETWORK_ID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(temperatureData => {
      var temperatureObject = {};
      var temperatureDatavalue = temperatureData.body[0].value;
      if (temperatureDatavalue || temperatureDatavalue == 0) {
        if (27 >= Number(temperatureDatavalue) && Number(temperatureDatavalue) >= 20) {
          temperatureObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (27 < Number(temperatureDatavalue)) {
          temperatureObject.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.temperature,temperatureObject.value,temperatureObject.status,new Date());
        }
        if (Number(temperatureDatavalue) < 20) {
          temperatureObject.status=SensorAlertSeverityEnum.alertSeverity.low;
          alertSender(SensorTypeEnum.sensorType.temperature,temperatureObject.value,temperatureObject.status,new Date());
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
  var deviceSerial = 'Q3CA-2DY2-LG4W';
  var metric = 'humidity';
  superagent.get(`https://api.meraki.com/api/v1/networks/${MERAKI_NETWORK_ID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(humidityData => {
      var humidityObject = {};
      var humidityDatavalue = humidityData.body[0].value;
      if (humidityDatavalue || humidityDatavalue == 0) {
        if (50 >= Number(humidityDatavalue) && Number(humidityDatavalue) >= 30) {
          humidityObject.status=SensorAlertSeverityEnum.alertSeverity.normal;
        }
        if (50 < Number(humidityDatavalue)) {
          humidityObject.status=SensorAlertSeverityEnum.alertSeverity.high;
          alertSender(SensorTypeEnum.sensorType.humidity,humidityObject.value,humidityObject.status,new Date()); 
        }
        if (Number(humidityDatavalue) < 30) {
          humidityObject.status=SensorAlertSeverityEnum.alertSeverity.low;
          alertSender(SensorTypeEnum.sensorType.humidity,humidityObject.value,humidityObject.status,new Date()); 
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
  var deviceSerial = 'Q3CB-F4C4-L9SF';
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
          alertSender(SensorTypeEnum.sensorType.waterLeak,waterLeakObject.value,waterLeakObject.status,new Date());
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