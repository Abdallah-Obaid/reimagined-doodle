'use strict';

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

/////////////////////////////////////////////////////////////

const cors = require('cors');
const morgan = require('morgan');
const err404 = require('./middleware/404.js');
const err500 = require('./middleware/500.js');
const timestamp = require('./middleware/timestamp.js');
const userRouters = require('./router.js');


/////////////////////////////////////////////////////////////

app.use(express.static('./public'));
app.use(express.json()); // body
app.use(cors());
app.use(morgan('dev'));
app.use(timestamp);
app.use(userRouters);
app.set('view engine','ejs');


/////////////////////////////////////////////////////////////

// Global ERROR MiddleWare 
app.use('*',err404); // 404
app.use(err500); //500
/////////////////////////////////////////////////////////////


console.log('try to connect');
module.exports = {
  server: app,
  start: (port) => {
    const PORT = port || process.env.PORT || 4444;
    server.listen(PORT,'0.0.0.0', () => { console.log(`Listening on port ${PORT}`); });
  },
};
