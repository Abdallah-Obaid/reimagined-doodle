'use strict';

var SensorTypeEnum={};
var sensorType ={ 
  dust :1,
  co2 :2,
  fire :3,
  temperature :4,
  humidity:5,
  waterLeak:6,
  power:7,
  lightSwitch:8,
  acSwitch:9,
  fireAlarm:10,
  door:11,
};
SensorTypeEnum.sensorType = sensorType ;
module.exports = SensorTypeEnum;
