'use strict';
var mqtt  = require('mqtt');

// Global vars
var MqttTester={};
var soundAlarm = 'noFire';
MqttTester.soundAlarm=soundAlarm;
var mqttFunc = function (topic,hostIP,port,clientId){
var topic =  topic;
var options = {
  port: port,
  host: hostIP,
  clientId: clientId,

};
var client  = mqtt.connect(hostIP,port,options);
client.on('connect',function(){	
  console.log('connected');
  client.subscribe(topic,{qos:1});
  client.on('message',function(topic, message, packet){
    // console.log("message",message)
    var jsonArr=JSON.parse(message);
    console.log("jsonArr",jsonArr)
    //  if (jsonArr.class == "fireAlarm"){
    //   if(jsonArr.objects){
    //     if (jsonArr.objects[0]) {
    //     if (jsonArr.objects[0].type == "person"){
    //       // console.log("fireAlarm")
    //       soundAlarm = 'fireAlarm';
    //       MqttTester.soundAlarm=soundAlarm;
    //   }
    // }
    if(jsonArr){

      if (jsonArr.class == "fireAlarm"){
        // console.log("fireAlarm")
        soundAlarm = 'fireAlarm';
        MqttTester.soundAlarm=soundAlarm;
    }
     }else{
      // console.log("noFire")
      soundAlarm = 'noFire';
      MqttTester.soundAlarm=soundAlarm;
     }



  });
  client.on('error',function(error){ console.log('Can\'t connect'+error);});
  // client.end();
});

}

// { objects:
//   [ { confidence: 53,
//       frame: 18201699,
//       oid: 837,
//       type: 'person',
//       x0: 0.639,
//       x1: 0.577,
//       y0: 0.283,
//       y1: 0.184 } ],
//  ts: 1622027970650 }


MqttTester.mqttFunc=mqttFunc;
module.exports = MqttTester;