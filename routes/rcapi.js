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
logger.level = 'trace';
const iamapi = require('./iamapi');

/**
 * Module object that is this module
 */
const rcapi = {};


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
rcapi.proxyApi = async (req, res, next) => {

    logger.trace('[proxyApi] Entering function.....');
/*
    let path=req.path;
    let results={
        path: req.path,
        url: req.url
    //    queryString: 'query string: ' + 

    }
*/
    let results = await callApi(req, req.url);

    logger.trace('[proxyApi] Exiting function.....');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(results));
    res.end();    

}

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
rcapi.getInstanceUses = async (req, res, next) => {

    // This is the use case where sensitive data is to be wrapped by a root key.  
    // In this case the DEK is the sensitive data itself
    
        // Get parameters from the Request object
        let instanceId = req.params.instanceid;

        let results ={};

        let path = '/v2/resource_instances/' + instanceId;
    
        logger.trace('[getInstanceUses] Entering function.....');
        logger.debug('[getInstanceUses] Request parameters');
        logger.debug('[getInstanceUses] Resource Instance ID: ' + instanceId);
    
        logger.debug('[getInstanceUses] getting instance data');

        let instance = await callApi(req, path);

        // NOTE:  An instance can have resource bindings but right now this function is not retrieving them!!!!


        
        logger.debug('[getInstanceUses] instance crn split is: ' + instance.target_crn.split(":"));

        // get the resource group name in which the alias is located
        instance.resource_group_name = await callApi(req, '/v2/resource_groups/' + instance.resource_group_id).name;

        logger.debug('[getInstanceUses] Storing instance data');
        // Store instance data
        results.instance = instance;
    
        logger.debug('[getInstanceUses] getting aliases');

    
        let aliases = await callApi(req, results.instance.resource_aliases_url);

        let aliasList = [];
    
        for (var i=0; i < aliases.resources.length; i++){
            item = {};

            // create the base alias object
            alias = aliases.resources[i];

            let resource = {};
            resource.id = alias.id;
            resource.guid = alias.guid;
            resource.url = alias.url;
            resource.name = alias.name;

//            logger.trace('[getInstanceUses] alias crn split is: ' + alias.target_crn.split(":"));



            let crn = alias.target_crn.split(":")
            logger.debug('[getInstanceUses] binding crn split is: ' + crn);

            // get the name of the target for the alias
            if (crn[7]) {
                let targetService = await callApi(req, '/v2/resource_instances/' + crn[7]);
                logger.trace('[getInstanceUses] target service name is: ' + targetService.name);
                resource.target_service_name = targetService.name;
                resource.target_service_url = targetService.url;
            }

                // add the target resource info
                resource.crn_resource_type = crn[8];
                resource.crn_resource = crn[9];

            let resourceGroup = await callApi(req, '/v2/resource_groups/' + alias.resource_group_id);
            resource.resource_group_name = resourceGroup.name;

            // retrieve and process the bindings
            let bList = await callApi(req, alias.resource_bindings_url);

            let bindingList = [];
            // loop through the bindings and get the details for each binding
            for (var j=0; j < bList.resources.length; j++){
                let b = bList.resources[j];
                let binding = {};

                binding.id = b.id;
                binding.guid = b.guid;
                binding.url = b.url;

                let bindingResourceGroup = await callApi(req, '/v2/resource_groups/' + b.resource_group_id);
                binding.resource_group_name = bindingResourceGroup.name;

                // get the name of the target for the binding
                // NOTE:  Also need to figure out how to get the space name and app name.  Also, put GUIDs in now.
                let bindingCrn = b.target_crn.split(":")
                if (bindingCrn[7]) {
                    let bindingTargetService = await callApi(req, '/v2/resource_instances/' + bindingCrn[7]);
                    logger.trace('[getInstanceUses] target service name is: ' + bindingTargetService.name);
                    binding.target_service_name = bindingTargetService.name;
                    binding.target_service_url = bindingTargetService.url
                }
                
                // add the target resource info
                binding.crn_resource_type = bindingCrn[8];
                binding.crn_resource = bindingCrn[9];
                bindingList.push(binding);
            }
            item.resource = resource;
            item.bindings = bindingList;
            aliasList.push(item);

        }

        logger.debug('[getInstanceUses] Storing aliases');
        // Store inital data
        results.aliases = aliasList;



        logger.trace('[getInstanceUses] Exiting function.....');
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(results));
        res.end();
    
    };

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
rcapi.getToken = async (req, res, next) => {

    logger.debug('[getToken] Entering function.....')

    logger.debug('[getToken] request headers:');
    logger.debug(JSON.stringify(req.headers));


    
//        let response = await getAuthToken(req);
    let response = await iamapi.getAuthToken(req);

    logger.debug('[getToken] Exiting function.....' + JSON.stringify(response));
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(response));
    res.end();

};

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
rcapi.getResourceGroups = async (req, res, next) => {

    let path = '/v2/resource_groups';

    logger.debug('[getResourceGroups] entering function....');
    
    let response = await callApi(req, path);

    logger.debug('[getResourceGroups] Exiting function.....');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(response));
    res.end();

}; // of function getResourceGroups


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
rcapi.getResourceInstances = async (req, res, next) => {

// This is the use case where sensitive data is to be wrapped by a root key.  
// In this case the DEK is the sensitive data itself

    // Get parameters from the Request object
    let instanceId = req.params.instanceid;
    let path = instanceId ? '/v2/resource_instances/' + instanceId : '/v2/resource_instances';

    logger.debug('[getResourceInstances] Entering function.....');
    logger.debug('[getResourceInstances] Request parameters');
    logger.debug('[getResourceInstances] Resource Instance ID: ' + instanceId);
    logger.debug('[getResourceInstances] path: ' + path);

    
    let response = await callApi(req, path);

    logger.debug('[getResourceInstances] Exiting function.....');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(response));
    res.end();

};

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
rcapi.getAliasesForInstance = async (req, res, next) => {

    // This is the use case where sensitive data is to be wrapped by a root key.  
    // In this case the DEK is the sensitive data itself
    
        // Get parameters from the Request object
        let instanceId = req.params.instanceid;
        let path = '/v2/resource_instances/' + instanceId + '/resource_aliases';
    
        logger.debug('[getAliasesForInstance] entering function....')
        logger.debug('[getAliasesForInstance] Request parameters');
        logger.debug('[getAliasesForInstance] Resource Instance ID: ' + instanceId);
    
        
        let response = await callApi(req, path);
    
        logger.debug('[getAliasesForInstance] Exiting function.....');
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(response));
        res.end();
    
    };





/**
 * internal function to call the Key Protect API and retrieve a key
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
async function callApi(req, path) {

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

    logger.trace('[callApi] The authentication token is ' + authToken);
    logger.trace('[callApi] The path is ' + path);

    const headers = {
        'Accept': 'application/json',
        'Authorization': authToken
    }

    const options = {
        hostname: 'resource-controller.cloud.ibm.com',
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
                logger.trace('[callApi] exiting with success.... returning ' + rawbody);
                body = JSON.parse(rawbody);
                resolve(body)                
            })

        });

        req.end();
    });

}; // end of function callApi




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

/*
function getAuthToken(req) {

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
                hostname: 'iam.cloud.ibm.com',
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
*/

/**
 * Internal function to validate that the configuration is correct.  If not return an error message. 
 * 
 *  Parameters:
 *     apikey - the API Key to be used to obtain the oauth token
 * 
 *  Returns a JSON object where the oath token is in the 'access_token' field.  It should be used to form
 *  an Authorization header whose value is 'Bearer <access_token>'
 * 
 */
function validateConfig() {

    logger.debug('entering validateConfig....');
/*
    const formData = querystring.stringify({
        "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
        "apikey": apikey
    });

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    const options = {
        hostname: 'iam.cloud.ibm.com',
        port: 443,
        path: '/identity/token',
        method: 'POST',
        headers: headers
    }
*/
    return new Promise ((resolve, reject) => {
        
        //Do validations.  Resolve if fine, reject if error.  Return JSON with error messages.
        //  - KEY_PROTECT_INSTANCE is set
        //  - IBM_API_KEY is set
        //  - X-Sensitive-Data header is present and the specified key is in the input.
 
        /*
        const req = https.request(options, (res) => {

            let rawbody = '';

            res.on('data', d => {
                rawbody += d;
            });

            res.on('error', err => {
                logger.debug('exiting getAuthToken with error....');
                reject(err)
            });

            res.on('end', () =>{
                logger.debug('exiting getAuthToken with success....');
                body = JSON.parse(rawbody);
                resolve(body)                
            })

        });

        logger.debug('In getAuthToken, writing form data');
        req.write(formData);
        req.end();
*/
    });
}; //end of function validateConfig




module.exports = rcapi;
