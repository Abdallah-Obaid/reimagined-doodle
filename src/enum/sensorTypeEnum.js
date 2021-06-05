'use strict';

var SensorTypeEnum={};
var sensorType ={ 
  dust :1,
  co2 :2,
  fire :3,
  temperature :4,
  humidity:5,
  waterLeak:6,
};
SensorTypeEnum.sensorType = sensorType ;
module.exports = SensorTypeEnum;
