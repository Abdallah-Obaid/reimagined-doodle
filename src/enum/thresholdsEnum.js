'use strict';

var thresholdsEnum={};
var temperature={
  normal: 1,
  high: 2,
  low:3,
};
thresholdsEnum.temperature;

var humidity={
  normal: 1,
  high: 2,
  low:3,
};
thresholdsEnum.humidity;

var dust={
  normal: 1,
  moderate: 2,
  unhealthy:3,
};
thresholdsEnum.dust;

var co2={
  normal: 1,
  high: 2,
  low:3,
};
thresholdsEnum.co2;

var waterLeak = {
  normal : 1,
  leak:2,
};
thresholdsEnum.waterLeak;

var doorStatus = {
  open : 1,
  locked:2,
};
thresholdsEnum.doorStatus;

var smokeAlarm = {
  normal : 1,
  fire:2,
};
thresholdsEnum.smokeAlarm;

var soundAlarm = {
  normal : 1,
  fire:2,
};
thresholdsEnum.soundAlarm;

var lightsControl = {
  On : 1,
  Off:2,
};
thresholdsEnum.lightsControl;

module.exports = thresholdsEnum;

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