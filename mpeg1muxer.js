var Mpeg1Muxer, child_process, events, util;
// var cp = require('child_process')
// const fs = require('fs');
child_process = require('child_process');

util = require('util');

events = require('events');
var count1 = 0;
var count2 = 0;
var count3 = 0;
var count4 = 0;
Mpeg1Muxer = function(options) {
  var key;
  this.url = options.url;
  this.ffmpegOptions = options.ffmpegOptions;
  this.exitCode = undefined;
  this.additionalFlags = [];
  if (this.ffmpegOptions) {
    for (key in this.ffmpegOptions) {
      this.additionalFlags.push(key);
      if (String(this.ffmpegOptions[key]) !== '') {
        this.additionalFlags.push(String(this.ffmpegOptions[key]));
      }
    }
  }
  this.spawnOptions = [
    '-rtsp_transport',
    'tcp',
    '-i',
    this.url,
    // additimpeg2videoonal ffmpeg options go here
    ...this.additionalFlags,
    '-f',
    'mpegts',
    '-codec:v',
    'mpeg1video',
    '-r',
    '25',
    '-',
  ];
  this.stream = child_process.spawn(options.ffmpegPath, this.spawnOptions, {
    detached: false,
  });
  this.inputStreamStarted = true;

  this.stream.stdout.on('data',async (data) => {
  //  console.log("################",data)
  // fs.appendFile('stream-data3.txt', data, function (err) {
  //   // if (err) throw err;
  //   // console.log('Thanks, It\'s saved to the file!');
  // });
    count1 =count1 +1;
  
    // console.log('count1',count1)
    return this.emit('mpeg1data', data);
  });
  setInterval(()=>{ 
    // console.log("Pre:",{count1},{count2},{count3})
    if((count2==count1)){
      count3=count3+1
    }
    if ((count3==count4)){count3=0} 
    count2 =count1;
    if (count3==10){
      // console.log("connection lost")

 
    }
    count4=count3
    // console.log("Post:",{count1},{count2},{count3})
  },2000)
  this.stream.stderr.on('data', (data) => {
    // console.log('data2222222222222222222222222',data)
    return this.emit('ffmpegStderr', data);

  });

  this.stream.on('exit', (code, signal) => {
    if (code === 1) {
      console.error('RTSP stream exited with error');
      this.exitCode = 1;
      return this.emit('exitWithError');
    }
  });
  return this;
};

util.inherits(Mpeg1Muxer, events.EventEmitter);
function count3Fun(){
  return count3; 
}
module.exports = 
{
  Mpeg1Muxer: Mpeg1Muxer,
  count3: count3Fun,
};
 