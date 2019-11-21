/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


const express = require('express');
var app = express();
const log4js = require('log4js');
const appName = require('./package').name;
const bodyParser = require('body-parser');
const rcapi = require('./routes/rcapi');
const logger = log4js.getLogger(appName);
logger.level ='trace';


// enabling Cross Origin support
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With, x-api-key, content-type, Authorization');
	next();
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

app.get('/',(req,res) => {
    res.send({"message" : "Yay.. I'm running!  But I am an API so there is nothing to see here!!"});
});

app.get('/health',(req,res) => {
    res.send({ "status" : "UP" });
});


app.get('/v2/*', rcapi.proxyApi);
app.post('/token', rcapi.getToken);
app.get('/instances', rcapi.getResourceInstances);
app.get('/instances/:instanceid', rcapi.getResourceInstances);
app.get('/instances/:instanceid/uses', rcapi.getInstanceUses);
app.get('/instances/:instanceid/aliases', rcapi.getAliasesForInstance);
//app.post('/encrypt/:keyid', keyprotect.encrypt);
//app.post('/decrypt/:keyid', keyprotect.decrypt);

var port = process.env.PORT || 3000;

app.listen(port, function(){
//    console.log("Listening on http://localhost:" + port);
    logger.info("Listening on http://localhost:" + port);
});