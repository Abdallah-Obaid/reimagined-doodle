'use strict';

var MqttTester  = require('../mqtt');
var helpers  = require('../helpers.js');
const superagent = require('superagent');
const ewelink = require('ewelink-api'); // For Ac switch
const express = require('express');
const router = express.Router();
var cp = require('child_process');
const fs = require('fs');
const path = require('path');// to remove .mp4 from file name
var modulecount = require('./lib/mpeg1muxer');
var Stream = require('./lib/videoStream');
const SensorTypeEnum = require('../src/enum/sensorTypeEnum');
const SensorActionEnum = require('../src/enum/sensorActionEnum');
const ThresholdsEnum = require('../src/enum/thresholdsEnum');
var DynamicAlerts  = require('./dynamicAlerts/dynamicAlerts');
var HistoricalData  = require('./historicalData/historicalData');

// Main routs
// router.get('/loadRtspStream', loadRtspStream);
router.get('/recordedVideo', loadVideo);
router.get('/recordList', recordList);
router.get('/sensorsNumber', sensorsNumber);

// Fibaro routs
router.get('/getTemperatureFibaro/', getTemperatureFibaro);
router.get('/getHistoricalTemperatureFibaro/', getHistoricalTemperatureFibaro);
router.get('/getHistoricalDustFibaro/', getHistoricalDustFibaro);
router.get('/getHistoricalCo2Fibaro/', getHistoricalCo2Fibaro);
router.get('/getHistoricalPowerConsumption/', getHistoricalPowerConsumption);
router.get('/getPowerConsumption/', getPowerConsumption);
router.get('/getHumidityFibaro/', getHumidityFibaro);
router.get('/getSmoke/', getSmoke);
router.get('/getDust/', getDust);
router.get('/getCo2/', getCo2);
router.get('/checkSwitchStatus/', checkSwitchStatus);
router.get('/postPowerSwitch/', postPowerSwitch);

// Akuvox routs
router.get('/openDoorSwitch/', openDoorSwitch);

// Meraki routs
router.get('/getTemperatureMeraki/', getTemperatureMeraki);
router.get('/getHistoricalTemperatureMeraki/', getHistoricalTemperatureMeraki);
router.get('/getHistoricalHumidityMeraki/', getHistoricalHumidityMeraki);
router.get('/getHistoricalWaterLeakMeraki/', getHistoricalWaterLeakMeraki);
router.get('/getHumidityMeraki', getHumidityMeraki);
router.get('/getWaterLeakTest', getWaterLeakTest);
router.get('/getDoorStatus', getDoorStatus);
router.get('/getSoundAlarm',getSoundAlarm);

// SonOff routs
router.get('/checkAcSwitchStatus/', checkAcSwitchStatus);
router.get('/SwitchAcSwitchSonOff/', SwitchAcSwitchSonOff);

// Mqtt routs
router.get('/runMqtt/', runMqtt);

// Application setup
const IP_ADDRESS_FOR_FIBARO_SENSORS = process.env.IP_ADDRESS_FOR_FIBARO_SENSORS || '192.168.128.4';  // property  192.168.2.107  192.168.129.11;
const IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI =  process.env.IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI;
const IP_ADDRESS_FOR_AKUVOX_DOOR_PHONE = process.env.IP_ADDRESS_FOR_AKUVOX_DOOR_PHONE;
const FIBARO_PASSWORD = process.env.FIBARO_PASSWORD;
const FIBARO_USER_NAME = process.env.FIBARO_USER_NAME;
const FIBARO_PASSWORD_MERAKI = process.env.FIBARO_PASSWORD_MERAKI;
const FIBARO_USER_NAME_MERAKI = process.env.FIBARO_USER_NAME_MERAKI;
const CAMERAIP = process.env.CAMERAIP;
const CAMERAPORT = process.env.CAMERAPORT;
const RECORDING_DIRECTORY = process.env.RECORDING_DIRECTORY;
const SOCKET_PORT = process.env.SOCKET_PORT;
const MERAKI_API_KEY = process.env.MERAKI_API_KEY;
const SENSORS_NUMBER = process.env.SENSORS_NUMBER;
const SONOFF_PASSWORD = process.env.SONOFF_PASSWORD;
const SONOFF_EMAIL = process.env.SONOFF_EMAIL;
console.log(FIBARO_PASSWORD , FIBARO_USER_NAME );

// Direct calls

loadRtspStream();
rtspStreamRestarting();
runMqtt();
DynamicAlerts.initialeAlertService();
HistoricalData.initialeHistoricalDataService();

// Global Vars
var soundAlarm = false;

// Functions definitions
/** 
 * This function will run rtsp stream
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
var ffmpegPID='';
async function loadRtspStream(req, res, next) {
  // await cp.exec('pkill ffmpeg', function(err, stdout, stderr) {console.log('kill error:',err);});
  var recordDuration = 120; //in sec
  var stream = await new Stream({
    name: 'name',
    streamUrl: `rtsp://${CAMERAIP}:${CAMERAPORT}/live`,//`rtsp://${CAMERAIP}:${CAMERAPORT}/live`,//'rtsp://192.168.128.2:9000/live'
    wsPort: SOCKET_PORT,
    ffmpegOptions: { // options ffmpeg flags
      '-c': 'copy',
      '-f': 'segment',
      '-strftime': '1',
      '-segment_time': `${recordDuration}`,
      // '-segment_format' : 'mp4',
      '-codec:v': 'libx264',
      [RECORDING_DIRECTORY]: '',
    }, 
  });

  await cp.exec('pidof ffmpeg', function (err, stdout, stderr) { ffmpegPID = stdout.split(' ')[0]; console.log('ffmpegPID',stdout.split(' ')[0]);});
  process.on('SIGINT', async function () {
    await cp.exec(`kill -9 ${ffmpegPID}`, function (err, stdout, stderr) { console.log('kill ffmpeg done PID:', ffmpegPID); });
    process.exit(1);
  });
  // res.send('IT WORK');
}
function rtspStreamRestarting(){
  var refreshRtspTime = 10; // will be multiplied by 2 sec 
  setInterval(() => {
    console.log('##########', modulecount.count3());
    if (modulecount.count3() == refreshRtspTime) {
      restartStream();
    }
  }, 2000);
}
async function restartStream(){
  // var cmd = 'ffmpeg...'   //for windows
  // var child = cp.exec(cmd, function(err, stdout, stderr) {})
  // child.stdin.write('q')
  await cp.exec(`kill -9 ${ffmpegPID}`, function (err, stdout, stderr) { console.log('kill ffmpeg done PID:', ffmpegPID); });
  await modulecount.resetCount3();
  await loadRtspStream();
}

/** 
 * This function will get the temperature from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getTemperatureFibaro(req, res, next) {
  var tempDeviceID = req.query.deviceID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS}/api/devices/${tempDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME, FIBARO_PASSWORD)
    .then(tempData => {

      // console.log('TempData', TempData.body.properties.value);
      if (tempData.body.properties.value) { res.status(200).send(tempData.body.properties.value); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Temp sensor error: ', err);
      res.status(403).send('Temp sensor error');
    });
}

/** 
 * This function will get the temperature from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHistoricalTemperatureFibaro(req, res, next) {
  var tempDeviceID = req.query.deviceID;
  var dateDiff = req.query.dateDiff;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS}/api/temperature/now-${dateDiff}/now/summary-graph/devices/temperature/${tempDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME, FIBARO_PASSWORD)
    .then(historicalTempData => {

      // console.log('TempData', TempData.body.properties.value);
      if (historicalTempData.body) { res.status(200).send(historicalTempData.body); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Historical temp sensor error: ', err);
      res.status(403).send('Historical temp sensor error');
    });
}


/** 
 * This function will get the Humidity from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHumidityFibaro(req, res, next) {
  var humidityDeviceID = req.query.deviceID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS}/api/devices/${humidityDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME, FIBARO_PASSWORD)
    .then(humidityData => {

      // console.log('TempData', TempData.body.properties.value);
      if (humidityData.body.properties.value) { res.status(200).send(humidityData.body.properties.value); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Temp sensor error: ', err);
      res.status(403).send('Temp sensor error');
    });
}

/** 
 * This function will get the smoke test from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getSmoke(req, res, next) {
  var smokeDeviceID = req.query.deviceID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${smokeDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(smokeData => {
      var smokeObject = {};
      var smokeDatavalue = smokeData.body.properties.value;
      if (smokeDatavalue) {
        if (smokeDatavalue == 'true') {
          smokeObject.status=ThresholdsEnum.smokeAlarm.fire;
        }else{
          smokeObject.status=ThresholdsEnum.smokeAlarm.normal;
        }
        smokeObject.value=smokeDatavalue;
        // console.log('smokeData', smokeData.body.properties.value);
        res.status(200).send(smokeObject); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('Smoke sensor error: ', err);
      res.status(403).send('Smoke sensor error');
    });
}

/** 
 * This function will get the dust from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getDust(req, res, next) {
  var dustDeviceID = req.query.deviceID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${dustDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(async dustData => {
      var dustObject = {};
      var dustDatavalue = dustData.body.properties.value;
      if (dustDatavalue || dustDatavalue == 0) {
        var thresholds =await helpers.getThresholds();
        if (thresholds.dust.high >= Number(dustDatavalue) && Number(dustDatavalue) >= thresholds.dust.normal) {
          dustObject.status=ThresholdsEnum.dust.normal;
        }
        if (thresholds.dust.high < Number(dustDatavalue)) {
          dustObject.status=ThresholdsEnum.dust.high;
        }
        if (Number(dustDatavalue) < thresholds.dust.normal) {
          dustObject.status=ThresholdsEnum.dust.low;
        }
        dustObject.value=dustDatavalue;
        // console.log('dustData', dustData.body.properties.value);
        res.status(200).send(dustObject); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Dust sensor error: ', err);
      res.status(403).send('Dust sensor error');
    });
}

/** 
 * This function will get the historical dust data from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHistoricalDustFibaro(req, res, next) {
  var dustDeviceID = req.query.deviceID;
  var t0 = req.query.t0;
  var t1 = req.query.t1;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/energy/${t1}-${t0}/now/summary-graph/devices/energy/${dustDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(dustData => {

      // console.log('powerData', powerData.body);
      if (dustData.body) { res.status(200).send(dustData.body); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Dust sensor error: ', err);
      res.status(403).send('Dust sensor error');
    });
}

/** 
 * This function will get the Co2 from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getCo2(req, res, next) {
  var co2DeviceID = req.query.deviceID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${co2DeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(async co2Data => {
      var co2Object = {};
      var co2Datavalue = co2Data.body.properties.value;
      if (co2Datavalue || co2Datavalue == 0) {
        var thresholds =await helpers.getThresholds();
        if (thresholds.co2.high >= Number(co2Datavalue) && Number(co2Datavalue) >= thresholds.co2.low) {
          co2Object.status=ThresholdsEnum.co2.normal;
        }
        if (thresholds.co2.high < Number(co2Datavalue)) {
          co2Object.status=ThresholdsEnum.co2.high;
        }
        if (Number(co2Datavalue) < thresholds.co2.low) {
          co2Object.status=ThresholdsEnum.co2.low;
        }
        co2Object.value=co2Datavalue;
        // console.log('co2Data', co2Data.body.properties.value);
        res.status(200).send(co2Object); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Co2 sensor error: ', err);
      res.status(403).send('Co2 sensor error');
    });
}

/** 
 * This function will get the historical co2 data from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHistoricalCo2Fibaro(req, res, next) {
  var co2DeviceID = req.query.deviceID;
  var t0 = req.query.t0;
  var t1 = req.query.t1;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/energy/${t1}-${t0}/now/summary-graph/devices/energy/${co2DeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(co2Data => {

      // console.log('powerData', powerData.body);
      if (co2Data.body) { res.status(200).send(co2Data.body); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Co2 sensor error: ', err);
      res.status(403).send('Co2 sensor error');
    });
}


/** 
 * This function will get the power consumption from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getPowerConsumption(req, res, next) {
  var powerDeviceID = req.query.deviceID;
  var powerDeviceIDAmpere = req.query.deviceIDAmpere;
  var powerDeviceIDVolt = req.query.deviceIDVolt;
  var powerObject = {};
  powerObject.value={};

  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices?parentId=${powerDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(powerData => {
      const filterPowerData = powerData.body.filter((itemInArray) => {return (itemInArray.id == powerDeviceIDAmpere ||itemInArray.id == powerDeviceIDVolt)  ;});
      powerObject.value.ampere = Number(filterPowerData[1].properties.value);
      powerObject.value.volt = Math.abs(filterPowerData[0].properties.value);
      powerObject.value.watt = Math.abs(filterPowerData[0].properties.value * filterPowerData[1].properties.value);
      if (powerObject) { res.status(200).send(powerObject); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('Power sensor error: ', err);
      res.status(403).send('Power sensor error');
    });
}

/** 
 * This function will get the historical power consumption from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHistoricalPowerConsumption(req, res, next) {
  var powerDeviceID = req.query.deviceID;
  var t0 = req.query.t0;
  var t1 = req.query.t1;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS}/api/energy/${t1}-${t0}/now/summary-graph/devices/energy/${powerDeviceID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(powerData => {

      // console.log('powerData', powerData.body);
      if (powerData.body) { res.status(200).send(powerData.body); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Power sensor error: ', err);
      res.status(403).send('Power sensor error');
    });
}

/** 
 * This function will check switch status from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function checkSwitchStatus(req, res, next) {
  var CheckSwitchStatusID = req.query.deviceID;
  superagent.get(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${CheckSwitchStatusID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(checkSwitchStatus => {

      // console.log('checkSwitchStatus', checkSwitchStatus.body.properties.value);
      if (checkSwitchStatus.body.properties.value) { res.status(200).send(checkSwitchStatus.body.properties.value); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Check switch status error: ', err);
      res.status(403).send('Check switch status error');
    });
}

/** 
 * This function will change switch status from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function postPowerSwitch(req, res, next) {
  var PostPowerSwitchID = req.query.deviceID;
  var actionName = req.query.actionName;
  var userId = req.query.userId;
  var roomId = req.query.roomId;
  var buildingId = req.query.buildingId;
  superagent.post(`http://${IP_ADDRESS_FOR_FIBARO_SENSORS_MERAKI}/api/devices/${PostPowerSwitchID}/action/${actionName}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME_MERAKI, FIBARO_PASSWORD_MERAKI)
    .then(PostPowerSwitch => {

      console.log('PostPowerSwitch', PostPowerSwitch.body.result);
      if (PostPowerSwitch.body.result) {
        if(actionName=='turnOn') {
          helpers.switchLogGenerator(SensorTypeEnum.sensorType.lightSwitch,SensorActionEnum.actionID.on,userId,roomId,buildingId);
          helpers.historicalDataGenerator(SensorTypeEnum.sensorType.lightSwitch,Number(SensorActionEnum.actionID.on),SensorActionEnum.actionID.on,new Date().toUTCString());

        }
        if(actionName=='turnOff'){
          helpers.switchLogGenerator(SensorTypeEnum.sensorType.lightSwitch,SensorActionEnum.actionID.off,userId,roomId,buildingId);
          helpers.historicalDataGenerator(SensorTypeEnum.sensorType.lightSwitch,Number(SensorActionEnum.actionID.off),SensorActionEnum.actionID.off,new Date().toUTCString());
        }

        res.status(200).send(PostPowerSwitch.body.result); 
      } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Power switch sensor error: ', err);
      res.status(403).send('Power switch sensor error');
    });
}

/** 
 * This function will check Ac switch status from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function checkAcSwitchStatus(req, res, next) {
  var CheckSwitchStatusID = req.query.deviceID;
  var acSwitchObject={};
  const connection = new ewelink({
    email: SONOFF_EMAIL,
    password: SONOFF_PASSWORD,
    region: 'as',
  });
  try {
    const device = await connection.getDevice(CheckSwitchStatusID);
    if(device.params){
      if (device.params.switch == 'on'){
        acSwitchObject.status = ThresholdsEnum.acControl.on;
      }else if (device.params.switch == 'off'){
        acSwitchObject.status = ThresholdsEnum.acControl.off;
      }
      acSwitchObject.value = device.params.switch;
    }
    res.status(200).send(acSwitchObject);
  }
  catch(err) {
    console.log('Check Ac switch status error: ', err);
    res.status(403).send('Check Ac switch status error');
  }
}

/** 
 * This function will change switch status from Fibaro sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function SwitchAcSwitchSonOff(req, res, next) {
  var  switchAcSwitchID = req.query.deviceID;
  var userId = req.query.userId;
  var roomId = req.query.roomId;
  var buildingId = req.query.buildingId;
  var acSwitchObject={};
  const connection = new ewelink({
    email: SONOFF_EMAIL,
    password: SONOFF_PASSWORD,
    region: 'as',
  });
  try {
    const switchStatus = await connection.toggleDevice(switchAcSwitchID); 
    console.log('switchStatus1:',switchStatus);

    if (switchStatus.status == 'ok'){
      const device = await connection.getDevice(switchAcSwitchID);
      console.log('switchStatus2:',switchStatus);
      console.log('switchStatus.status:',switchStatus.status);
      console.log('device.params.switch:',device.params.switch);
      if(device.params){
        if (device.params.switch == 'on'){
          acSwitchObject.status = ThresholdsEnum.acControl.on;
          helpers.switchLogGenerator(SensorTypeEnum.sensorType.acSwitch,SensorActionEnum.actionID.on,userId,roomId,buildingId);
          helpers.historicalDataGenerator(SensorTypeEnum.sensorType.acSwitch,Number(SensorActionEnum.actionID.on),SensorActionEnum.actionID.on,new Date().toUTCString());
        }else if (device.params.switch == 'off'){
          acSwitchObject.status = ThresholdsEnum.acControl.off;
          helpers.switchLogGenerator(SensorTypeEnum.sensorType.acSwitch,SensorActionEnum.actionID.off,userId,roomId,buildingId);
          helpers.historicalDataGenerator(SensorTypeEnum.sensorType.acSwitch,Number(SensorActionEnum.actionID.off),SensorActionEnum.actionID.off,new Date().toUTCString());
        }
        acSwitchObject.value = switchStatus.status;
      }
    }

    res.status(200).send(acSwitchObject || []);
  }
  catch(err) {
    console.log('Switch Ac switch status error: ', err);
    res.status(403).send('Switch Ac switch status error');
  }
}

/** 
 * This function will open door switch status from Akuvox sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function openDoorSwitch(req, res, next) {
  var doorID = req.query.doorID;
  var actionName = req.query.actionName;
  var userId = req.query.userId;
  var roomId = req.query.roomId;
  var buildingId = req.query.buildingId;

  superagent.get(`http://${IP_ADDRESS_FOR_AKUVOX_DOOR_PHONE}/fcgi/do?action=${actionName}&DoorNum=${doorID}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(FIBARO_USER_NAME, FIBARO_PASSWORD)
    .then(openDoorSwitch => {

      // console.log('openDoorSwitch', openDoorSwitch.body);
      if (openDoorSwitch.body) { 
        helpers.switchLogGenerator(SensorTypeEnum.sensorType.door,SensorActionEnum.actionID.on,userId,roomId,buildingId);
        helpers.historicalDataGenerator(SensorTypeEnum.sensorType.door,Number(SensorActionEnum.actionID.on),SensorActionEnum.actionID.on,new Date().toUTCString());
        res.status(200).send(openDoorSwitch.body); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('Door switch sensor error: ', err);
      res.status(403).send('Power switch sensor error');
    });
}

/** 
 * This function will return Temperature from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getTemperatureMeraki(req, res, next) {
  var deviceSerial = req.query.deviceSerial;
  var merakiNetworkID = req.query.merakiNetworkID;
  var metric = req.query.metric;
  superagent.get(`https://api.meraki.com/api/v1/networks/${merakiNetworkID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(async temperatureData => {
      var temperatureObject = {};
      var temperatureDatavalue = temperatureData.body[0].value;
      if (temperatureDatavalue || temperatureDatavalue == 0) {
        var thresholds =await helpers.getThresholds();
        if (thresholds.temperature.high >= Number(temperatureDatavalue) && Number(temperatureDatavalue) >= thresholds.temperature.low) {
          temperatureObject.status=ThresholdsEnum.temperature.normal;
        }
        if (thresholds.temperature.high < Number(temperatureDatavalue)) {
          temperatureObject.status=ThresholdsEnum.temperature.high;
        }
        if (Number(temperatureDatavalue) < thresholds.temperature.low) {
          temperatureObject.status=ThresholdsEnum.temperature.low;
        }
        temperatureObject.value=temperatureDatavalue;
        // console.log('temperatureData', temperatureData.body.properties.value);
        res.status(200).send(temperatureObject); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('Temperature sensor error: ', err);
      res.status(403).send('Temperature sensor error');
    });
}

/** 
 * This function will get the historical temperature from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHistoricalTemperatureMeraki(req, res, next) {
  var deviceSerial = req.query.deviceSerial;
  var merakiNetworkID = req.query.merakiNetworkID;
  var metric = req.query.metric;
  var t0 = req.query.t0;
  var t1 = req.query.t1;
  var resolution  = req.query.resolution;
  superagent.get(`https://api.meraki.com/api/v1/networks/${merakiNetworkID}/sensors/stats/historicalBySensor?metric=${metric}&serial=${deviceSerial}&t0=${t0}&t1=${t1}&resolution=${resolution}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .auth(FIBARO_USER_NAME, FIBARO_PASSWORD)
    .then(historicalTempData => {

      // console.log('TempData', TempData.body.properties.value);
      if (historicalTempData.body) { res.status(200).send(historicalTempData.body); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Historical temp sensor error: ', err);
      res.status(403).send('Historical temp sensor error');
    });
}


/** 
 * This function will return humidity from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHumidityMeraki(req, res, next) {
  var deviceSerial = req.query.deviceSerial;
  var merakiNetworkID = req.query.merakiNetworkID;
  var metric = req.query.metric;
  superagent.get(`https://api.meraki.com/api/v1/networks/${merakiNetworkID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(async humidityData => {
      var humidityObject = {};
      var humidityDatavalue = humidityData.body[0].value;
      if (humidityDatavalue || humidityDatavalue == 0) {
        var thresholds =await helpers.getThresholds();
        if (thresholds.humidity.high >= Number(humidityDatavalue) && Number(humidityDatavalue) >= thresholds.humidity.low) {
          humidityObject.status=ThresholdsEnum.humidity.normal;
        }
        if (thresholds.humidity.high < Number(humidityDatavalue)) {
          humidityObject.status=ThresholdsEnum.humidity.high;
        }
        if (Number(humidityDatavalue) < thresholds.humidity.low) {
          humidityObject.status=ThresholdsEnum.humidity.low;
        }
        humidityObject.value=humidityDatavalue;
        console.log('humidityObjecthumidityObjecthumidityObjecthumidityObjecthumidityObject', humidityObject);
        res.status(200).send(humidityObject); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('Humidity sensor error: ', err);
      res.status(403).send('Humidity sensor error');
    });
}

/** 
 * This function will get the historical Humidity from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHistoricalHumidityMeraki(req, res, next) {
  var deviceSerial = req.query.deviceSerial;
  var merakiNetworkID = req.query.merakiNetworkID;
  var metric = req.query.metric;
  var t0 = req.query.t0;
  var t1 = req.query.t1;
  var resolution  = req.query.resolution;
  superagent.get(`https://api.meraki.com/api/v1/networks/${merakiNetworkID}/sensors/stats/historicalBySensor?metric=${metric}&serial=${deviceSerial}&t0=${t0}&t1=${t1}&resolution=${resolution}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .auth(FIBARO_USER_NAME, FIBARO_PASSWORD)
    .then(historicalHumidityData => {
      if (historicalHumidityData.body) { res.status(200).send(historicalHumidityData.body); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('Historical humidity sensor error: ', err);
      res.status(403).send('Historical humidity sensor error');
    });
}

/** 
 * This function will return water leak test result from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getWaterLeakTest(req, res, next) {
  var deviceSerial = req.query.deviceSerial;
  var merakiNetworkID = req.query.merakiNetworkID;
  var metric = req.query.metric;
  superagent.get(`https://api.meraki.com/api/v1/networks/${merakiNetworkID}/sensors/stats/latestBySensor?metric=${metric}&serial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(waterLeakData => {

      var waterLeakObject = {};
      var waterLeakDatavalue = waterLeakData.body[0].value;
      if (waterLeakDatavalue || waterLeakDatavalue == 0 ) {
        // console.log("waterLeakDatavalue",waterLeakDatavalue)
        if (Number(waterLeakDatavalue) == 0) {
          waterLeakObject.status=ThresholdsEnum.waterLeak.normal;
        }else{
          waterLeakObject.status=ThresholdsEnum.waterLeak.veryHigh;
        }
        waterLeakObject.value=waterLeakDatavalue;
        // console.log('waterLeakData', waterLeakData.body.properties.value);
        res.status(200).send(waterLeakObject); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('WaterLeak sensor error: ', err);
      res.status(403).send('WaterLeak sensor error');
    });
}

/** 
 * This function will get the historical waterLeak from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getHistoricalWaterLeakMeraki(req, res, next) {
  var deviceSerial = req.query.deviceSerial;
  var merakiNetworkID = req.query.merakiNetworkID;
  var metric = req.query.metric;
  var t0 = req.query.t0;
  var t1 = req.query.t1;
  var resolution  = req.query.resolution;
  superagent.get(`https://api.meraki.com/api/v1/networks/${merakiNetworkID}/sensors/stats/historicalBySensor?metric=${metric}&serial=${deviceSerial}&t0=${t0}&t1=${t1}&resolution=${resolution}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .auth(FIBARO_USER_NAME, FIBARO_PASSWORD)
    .then(historicalWaterLeakData => {

      // console.log('TempData', TempData.body.properties.value);
      if (historicalWaterLeakData.body) { res.status(200).send(historicalWaterLeakData.body); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Historical waterLeak sensor error: ', err);
      res.status(403).send('Historical waterLeak sensor error');
    });
}


/** 
 * This function will return the historical door status from Meraki sensor
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getDoorStatus(req, res, next) {
  var deviceSerial = req.query.deviceSerial;
  var eventName = req.query.eventName;
  var merakiNetworkID = req.query.merakiNetworkID;
  superagent.get(`https://api.meraki.com/api/v1/networks/${merakiNetworkID}/environmental/events?includedEventTypes[]=${eventName}&sensorSerial=${deviceSerial}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Cisco-Meraki-API-Key', MERAKI_API_KEY)
    .then(doorStatusData => {
      var doorStatusObject = {};
      var doorStatusDatavalue = doorStatusData.body[0].eventData.value;
      // console.log('############',doorStatusData.body)
      if (doorStatusDatavalue || doorStatusDatavalue == 0) {
        if (Number(doorStatusDatavalue) == 0) {
          doorStatusObject.status=ThresholdsEnum.doorStatus.open;
        }else{
          doorStatusObject.status=ThresholdsEnum.doorStatus.locked;
        }
        doorStatusObject.value=doorStatusData.body;
        // console.log('doorStatusData', doorStatusData.body.properties.value);
        res.status(200).send(doorStatusObject); } else { res.status(200).send([]); }
    })
    .catch(err => {
      console.log('Door Status sensor error: ', err);
      res.status(403).send('Door Status sensor error');
    });
}

/** 
 * This function will open the door from Akuvox sensor
 * @param {obj} req 
 * @param {obj} res threshold
 * @param {function} next 
 */
async function openDoor(req, res, next) {
  var action = req.query.deviceSerial || 'OpenDoor';
  var DoorNum = req.query.merakiNetworkID || 1;
  superagent.get(`hhttp://192.168.2.220/fcgi/do?action=${action}&DoorNum=${DoorNum}`)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .then(doorStatusData => {
      // console.log('doorStatusData', doorStatusData.body);
      if (doorStatusData.body) { res.status(200).send(doorStatusData.body); } else { res.status(200).send([]); }

    })
    .catch(err => {
      console.log('Door Status sensor error: ', err);
      res.status(403).send('Door Status sensor error');
    });
}

/** 
 * This function will get sound alarm from Meraki
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
async function getSoundAlarm(req, res, next) {
  try {
    console.log(MqttTester.soundAlarm);
    if (MqttTester.soundAlarm == 'noFire') {
      res.status(200).send(MqttTester.soundAlarm);
    } else if (MqttTester.soundAlarm == 'fireAlarm') {
      res.status(200).send(MqttTester.soundAlarm);
    }
  } catch (error){
    res.status(404).send(error);
  }

}

/** 
* This function will load the recorded video by name
* @param {obj} req 
* @param {obj} res 
* @param {function} next 
*/
function loadVideo(req, res, next) {
  var videoNameQ = req.query.videoName;
  const path = `recorded_videos/${videoNameQ}.mp4`;
  const stat = fs.statSync(path);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(path, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(path).pipe(res);
  }
}

/** 
* This function will send all the recorded video file name to front end
* @param {obj} req 
* @param {obj} res 
* @param {function} next 
*/
function recordList(req, res, next) {
  try {
    var filterDate = req.query.filterDate;
    console.log('filterDate:',filterDate);
    const testFolder = './recorded_videos/';
    var fullFileName = [];
    fs.readdir(testFolder, (err, files) => {
      files.forEach(file => {
        var fileNameWithoutExt = path.parse(file).name;
        var dateWithoutTime = fileNameWithoutExt.split('_')[0].split('-').join('/');
        if(filterDate==dateWithoutTime){
          fullFileName.push(fileNameWithoutExt);
        }
      });
      if (fullFileName) { res.status(200).send(fullFileName.reverse()); } else { res.status(200).send([]); }
    });

  } catch (error) {
    console.log('Record list error: ', error);
    res.status(403).send('Record list error');
  }
}


/** 
 * This function will return the sensors number
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
function sensorsNumber(req, res, next) {
  if (SENSORS_NUMBER) { res.status(200).send(SENSORS_NUMBER); } else { res.status(200).send(0); }

}

/** 
 * This function will initialize mqtt server
 * @param {obj} req 
 * @param {obj} res 
 * @param {function} next 
 */
function runMqtt(){
  // var topic  =  '/merakimv/Q2PV-NCFZ-QY79/raw_detections'; //  /merakimv/Q2PV-NCFZ-QY79/audio_detections  /merakimv/Q2PV-NCFZ-QY79/raw_detections
  // var hostIP = 'mqtt://test.mosquitto.org'; // mqtt://test.mosquitto.org
  // var clientId = 'PenguinIn';  // PenguinIn
  // MqttTester.mqttFunc(topic,hostIP,clientId);

  var topic  =  'obaid'; //  /merakimv/Q2PV-NCFZ-QY79/audio_detections  /merakimv/Q2PV-NCFZ-QY79/raw_detections
  var hostIP = 'mqtt://20.36.27.184'; // mqtt://test.mosquitto.org
  var port = '1883';
  var clientId = 'PenguinIn';  // PenguinIn
  MqttTester.mqttFunc(topic,hostIP,port,clientId);
}

module.exports = router;