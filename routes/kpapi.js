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
const iamapi = require('./iamapi');

logger.info('[KPAPI] - Log level is ' + logger.level);
/**
 * Module object that is this module
 */
const kpapi = {};
const ibmcloudUrl = process.env.IBMCLOUD_URL ? process.env.IBMCLOUD_URL : 'cloud.ibm.com';
logger.info('[KPAPI] - The IBM Cloud URL is ' + ibmcloudUrl);


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
kpapi.getKeyProtectInstancePolicies = async (req, res, next) => {

    // This is the use case where sensitive data is to be wrapped by a root key.  
    // In this case the DEK is the sensitive data itself
    
        // Get parameters from the Request object
        let instanceId = req.params.instanceid;
        let path = 'api/v2/instance/policies';
    
        logger.debug('[getKeyProtectInstancePolicies] Entering function.....');
        logger.debug('[getKeyProtectInstancePolicies] Request parameters');
        logger.debug('[getKeyProtectInstancePolicies] Resource Instance ID: ' + instanceId);
        logger.debug('[getKeyProtectInstancePolicies] path: ' + path);
    
        const headers = {
            "bluemix-instance": instanceId,
            "accept": 'application/vnd.ibm.kms.policy+json'
        }
        
        let response = await callApi(req, path, headers);
    
        logger.debug('[getKeyProtectInstancePolicies] Exiting function.....');
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(response));
        res.end();
    
    };



/**
 * internal function to call the Key Protect API 
 * 
 * Method: GET
 * 
 * Parameters:
 *    keyId - the id of the root key to be retrieved
 * 
 * NOTE: This method requires the following environment variables
 *       KEY_PROTECT_INSTANCE - the GUID of your Key Protect instance
 *       IBM_API_KEY - a valid API key for a user or service id that has access to the Key Protect instance 
 */
async function callApi(req, path, headers) {

    logger.trace('[callApi] entering function....');

    let token = '';
    // need to check here if we have an authorization header and if we do, skip this call and use the header (includes 'Bearer ')
    if (req.headers.authorization) {
        authToken = req.headers.authorization;
    } else {
//        let newToken = await getAuthToken(req);
        let newToken = await iamapi.getAuthToken(req);
        authToken = 'Bearer ' + newToken.access_token;
    }
//    let newToken = await getAuthToken(req);
    // getAuthToken should return the full object as returned from the IAM API.  

//    logger.trace('[callApi] The authentication token is ' + authToken);
    logger.trace('[callApi] The path is ' + path);

    headers['Authorization'] = authToken
/*    
    const headers = {
        'Accept': 'application/json',
        'Authorization': authToken
    }
*/
    logger.debug('[KPAPI] - callApi with headers: ' + JSON.stringify(headers));    

    const options = {
        hostname: 'resource-controller.' + ibmcloudUrl ,
        port: 443,
        path: path,
        method: 'GET',
        headers: headers
    }

    return new Promise ((resolve, reject) => {
        const req = https.request(options, (res) =>{

            let rawbody = '';

            res.on('data', d => {
                rawbody += d;
            });

            res.on('error', err => {
                logger.debug('[callApi] exiting with error....');
                reject(err)
            });

            res.on('end', () =>{
                logger.trace('[callApi] exiting with success....');
                body = JSON.parse(rawbody);
                resolve(body)                
            })

        });

        req.end();
    });

}; // end of function callApi

module.exports = kpapi;

