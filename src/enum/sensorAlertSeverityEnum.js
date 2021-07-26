'use strict';

var sensorAlertSeverityEnum={};
var alertSeverity=
{
  low : 1,
  normal:2,
  medium:3,
  high:4,
  veryLow:5,
  veryHigh:6,
};
sensorAlertSeverityEnum.alertSeverity = alertSeverity ;

module.exports = sensorAlertSeverityEnum;
