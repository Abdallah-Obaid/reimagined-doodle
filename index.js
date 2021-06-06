  
'use strict';

require('dotenv').config();
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
const server = require('./src/server');

server.start();