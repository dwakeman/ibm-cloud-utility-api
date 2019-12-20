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

const appName = require('../package').name;
const https = require('https');
var url = require('url');
const querystring = require('querystring');
const log4js = require('log4js');
const logger = log4js.getLogger(appName);
logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
logger.info('[IAMAPI] - Log level is ' + logger.level);

/**
 * Module object that is this module
 */
const iamapi = {};

const ibmcloudUrl = process.env.IBMCLOUD_URL ? process.env.IBMCLOUD_URL : 'cloud.ibm.com';
logger.info('[IAMAPI] - The IBM Cloud URL is ' + ibmcloudUrl);

/**
 * Get a key from Key Protect
 * 
 * This function is mapped to the '/key/:keyid' route in the API
 * It will retrieve a key from an instance of Key Protect
 * 
 * Method: GET
 * 
 * NOTE: This method requires the following environment variables
 *       KEY_PROTECT_INSTANCE - the GUID of your Key Protect instance
 *       IBM_API_KEY - a valid API key for a user or service id that has access to the Key Protect instance
 */
iamapi.getToken = async (req, res, next) => {

    logger.debug('[getToken] Entering function.....')

    logger.debug('[getToken] request headers:');
    logger.debug(JSON.stringify(req.headers));

    let response = await iamapi.getAuthToken(req);

    logger.debug('[getToken] Exiting function.....');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(response));
    res.end();

};


/**
 * Internal function to exchange an IBM Cloud API Key for an IAM oauth token for authentication to 
 * the Key Protect API
 * 
 *  Parameters:
 *     apikey - the API Key to be used to obtain the oauth token
 * 
 *  Returns a JSON object where the oath token is in the 'access_token' field.  It should be used to form
 *  an Authorization header whose value is 'Bearer <access_token>'
 * 
 */
iamapi.getAuthToken = (req) => {

    logger.trace('[getAuthToken] entering function....');
//    logger.trace('[getAuthToken] Authorization header is ' + req.headers.authorization);
    logger.debug('[getAuthToken] x-api-key header is ' + req.headers['x-api-key']);
    logger.debug('[getAuthToken] headers: ' + JSON.stringify(req.headers));

    let apiKey = req.headers['x-api-key'];
    return new Promise ((resolve, reject) => {

        logger.debug('[getAuthToken] exchanging API key for auth token ');

        const formData = querystring.stringify({
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": apiKey
        });
    
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    
        const options = {
            hostname: 'iam.' + ibmcloudUrl,
            port: 443,
            path: '/identity/token',
            method: 'POST',
            headers: headers
        }

        const req = https.request(options, (res) => {

            let rawbody = '';

            res.on('data', d => {
                rawbody += d;
            });

            res.on('error', err => {
                logger.debug('[getAuthToken] exiting with error....');
                reject(err);
            });

            res.on('end', () =>{
                logger.debug('[getAuthToken] exiting with success....');
                body = JSON.parse(rawbody);
                resolve(body);                
            });

        })

        logger.debug('[getAuthToken] writing form data');
        req.write(formData);
        req.end();

    });
}; //end of function getAuthToken



module.exports = iamapi;