'use strict';

var ThresholdsEnum={};
var temperature={
  normal: 1,
  high: 2,
  low:3,
};
ThresholdsEnum.temperature=temperature;

var humidity={
  normal: 1,
  high: 2,
  low:3,
};
ThresholdsEnum.humidity=humidity;

var dust={
  normal: 1,
  high: 2,
  low:3,
};
ThresholdsEnum.dust=dust;

var co2={
  normal: 1,
  high: 2,
  low:3,
};
ThresholdsEnum.co2=co2;

var waterLeak = {
  normal : 1,
  leak:2,
};
ThresholdsEnum.waterLeak=waterLeak;

var doorStatus = {
  open : 1,
  locked:2,
};
ThresholdsEnum.doorStatus=doorStatus;

var smokeAlarm = {
  normal : 1,
  fire:2,
};
ThresholdsEnum.smokeAlarm=smokeAlarm;

var soundAlarm = {
  normal : 1,
  fire:2,
};
ThresholdsEnum.soundAlarm=soundAlarm;

var lightsControl = {
  on : 1,
  off:2,
};
ThresholdsEnum.lightsControl=lightsControl;

var acControl = {
  on : 1,
  off:2,
};
ThresholdsEnum.acControl=acControl;

module.exports = ThresholdsEnum;

// # Thresholds:

// * Temp:  27 - 20 normal
//          +27 hot
//          -20 cold

// * Humidity: 30% - 50% Normal
//             +50 High   
//             -30 Low 

// * Dust : 0 - 50 Normal
//          51 - 100  Moderate
//          +100 Unhealthy

// * Co2: 400ppm - 1000ppm Normal
//        +1000 High   
//        -400  Low

// * WaterLeak: Normal            No Leak
//              There is a leak   Leak

// * Door status: Open
//                Closed

// * Smoke alarm: Normal
//                Fire

// * Lights control: On
//                   Off