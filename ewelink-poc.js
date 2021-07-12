const ewelink = require('ewelink-api');

/* ** POC ewelink usage POC ** */
(async () => {

  /* Authenticate */
  const connection = new ewelink({
      email: 'a.zaiter@penguinin.com',
    password: 'Penguinin123',
    region: 'as',
  });

  /* Get all devices */
  const devices = await connection.getDevices();
  /* Returns a list of devices associated to logged account with all the details and sensor data*/

  /* Toggle Specific Device Power Switch*/
    const status = await connection.toggleDevice('1000c7f40d');
    console.log("status", status)
  /* Switch specified device current power state. */
  /* response example:
    {
      status: 'ok',
      state: 'off'
    }
  */
  
  /* Get current humidity from specific Device (IF SUPPORTED) */
/*  const hum = await connection.getDeviceCurrentHumidity('DEVICE_ID')*/
  /*Return current humidity for specified device. 
  response example:
    {
      status: 'ok',
      humidity: '76'
    }
  */
      
  /* Get current temperature from specific Device (IF SUPPORTED) */
/*  const temp = await connection.getDeviceCurrentTemperature('DEVICE_ID')*/
  /*Return current temperature for specified device. 
  response example:
    {
      status: 'ok',
      temperature: '20'
    }
  */
      
  /* Get current temperature and humidity from specific Device (IF SUPPORTED) */
/*  const tempHum = await connection.getDeviceCurrentTH('DEVICE_ID')*/
  /*Return current temperature and humidity for specified device. 
  response example:
    {
      status: 'ok',
      temperature: '20',
      humidity: '76'
    }
  */


  /* to get the current Power, Current and Voltage use getDevices and access the specific device (pow) like this: 
    devices[X].params.current
    devices[X].params.voltage
    devices[X].params.power
  */
})();