/**
 * Created by jeff.flater on 4/23/2014.
 */
var dummyJson = require('dummy-json'),
    jsonStore = require('json-store'),
    validator = require('validator');

var configOptions = [
    'jsonStore',
    'mockRoutes'
];

var routes,
    store;

function Mock(config) {
    // Validate JSON object
    //todo: replace with validator
    if (!_tryParseJSON(JSON.stringify(config))) {
        throw 'Invalid json config object!';
    }

    // Validate config options
    for (var i=0; i < configOptions.length; i++) {
        if (!config.hasOwnProperty(configOptions[i])) {
            throw 'Missing required config options';
        }
    }

    store = jsonStore(config.jsonStore);
    routes = config.mockRoutes;
}

Mock.prototype.registerRoutes = function (req, res) {

    var found = false;
    var matchingMethod;

    for (var i = 0; i < routes.length; i++) {

        if (!(typeof routes[i].method === 'string' || routes[i].method instanceof String)) {
            routes[i].method = 'get';
        }

        matchingMethod = (routes[i].method.toLowerCase() === req.method.toLowerCase());

        if (routes[i].mockRoute && req.originalUrl.toLowerCase().match(routes[i].mockRoute.toLowerCase()) !== null && matchingMethod) {

            found = true;

            var route = routes[i];

            //If scope & scenario is passed via the url; then, overwrite the testScope & testScenario properties
            if (typeof req.query !== 'undefined') {

                var testScope = req.query.scope;
                if (typeof testScope !== 'undefined') {
                    route.testScope = testScope;
                }

                var testScenario = req.query.scenario;
                if (typeof testScenario !== 'undefined') {
                    route.testScenario = testScenario;
                }

                var testLatency = req.query.latency;
                if (typeof testLatency !== 'undefined') {
                    route.latency = testLatency;
                }
            }

            var latency = 0;
            try {
                if (route.latency) {
                    if (isNaN(route.latency)) {
                        var splits = route.latency.split("-");
                        var min = parseInt(splits[0]);
                        var max = parseInt(splits[1]);
                        latency = Math.floor(Math.random()*(max-min+1)+min);
                        if (latency > max){
                            latency = max;
                        }
                    } else {
                        latency = route.latency;
                    }
                }
            }
            catch(err) {
                console.log(err);
                latency = 0;
            }

            var response = _routeResponse(route, req);

            /* jshint ignore:start */
            setTimeout(function(){
                res.set('Content-Type', 'application/json');
                res.status(response.status).send(response.body);
                res.end();
            }, latency);
            /* jshint ignore:end */

            break;
        }
    }

    if(!found) {
        res.end();  //no routes found, end here!
    }
};

Mock.prototype.setRouteScenario = function (req, res) {

    var found = false;
    var route = null;

    var config = {
        name: req.body.name ? req.body.name : null,
        testScope: req.body.scope ? req.body.scope : null,
        testScenario: req.body.scenario ? req.body.scenario : null,
        testMethod: req.body.method ? req.body.method : null
    };

    for (var i=0; i < routes.length; i++) {
        // attempt to find the existing route
        if (routes[i].name === config.name) {
            // flag as found
            found = true;
            // update the new scenario
            routes[i].testScenario = config.testScenario;
            // update the new scope
            if (config.testScope) {
                routes[i].testScope = config.testScope;
            }
            if (config.testMethod) {
                routes[i].testMethod = config.testMethod;
            }
            // set route to be returned (from ths call)
            route = routes[i];
            break;
        }
    }

    res.send({
        status: found ? 200 : 404,
        body: {
            message: found ? 'mock route updated.' : 'mock route name not found.',
            route: config ? route : config
        }
    });

};


module.exports = function (config) {
    return new Mock(config);
};

/*
 * PRIVATE METHODS
 * */

function _routeResponse (route, req) {
    var response = null;
    var guid = route.name+route.testScope+route.testScenario;

    switch (route.testScope) {

        //Simulates a successful response (200) - 10.2.1 200 OK
        case 'success':
            var store = _getStore(guid);
            if (store === null || typeof store === 'undefined') {
                var jsonTemplate = null;
                var dummyOptions = {};

                if (typeof route.jsonTemplate === 'object') {

                    /*
                     handle case where testScenario is not defined,
                     default to first testScenario
                     */
                    if (!route.testScenario) {
                        route.testScenario = 0;
                    }

                    /*
                     route.testScenario - can be type function, string, or int
                     */

                    // is the testScenario a function
                    if (typeof route.testScenario === 'function') {
                        route.testScenario = route.testScenario(req);
                    }

                    // is the testScenario a string?
                    if (typeof route.testScenario === 'string') {
                        var templates = route.jsonTemplate;
                        for (var template in templates) {
                            if (templates[template].hasOwnProperty(route.testScenario)) {
                                jsonTemplate = templates[template][route.testScenario]();
                                break;
                            }
                        }
                    }

                    // is the testScenario an int?
                    if (!isNaN(route.testScenario))
                    {
                        var scenario = parseInt(route.testScenario);
                        if (route.jsonTemplate.length > scenario) {
                            jsonTemplate = route.jsonTemplate[scenario]();
                        }
                    }

                }

                if (typeof route.jsonTemplate === 'string') {
                    jsonTemplate = route.jsonTemplate;
                }

                dummyOptions.data = route.data || {};
                dummyOptions.data.request = req;

                if (route.helpers) {
                    dummyOptions.helpers = route.helpers;
                }

                //todo: use validator to enhance template validation
                var result = dummyJson.parse(jsonTemplate, dummyOptions);

                response = {
                    status: 200,
                    body: _setStore(guid, result)
                };
            } else {
                response = {
                    status: 200,
                    body: store
                };
            }

            break;


        //Simulates a bad response (404) - 10.4.5 404 Not Found
        case 'notFound':
            response = {
                status: 404,
                body: route.errorBody ? route.errorBody : '10.4.5 404 Not Found'
            };
            break;

        //Simulates a bad response (408) - 10.4.9 408 Request Timeout
        case 'timeout':
            response = {
                status: 408,
                body: route.errorBody ? route.errorBody : '10.4.9 408 Request Timeout'
            };
            break;

        //Simulates a bad response (401) - 10.4.2 401 Unauthorized
        case 'unauthorized':
            response = {
                status: 401,
                body: route.errorBody ? route.errorBody : '10.4.2 401 Unauthorized'
            };
            break;

        //Simulates a bad response (403) - 10.4.4 403 Forbidden
        case 'forbidden':
            response = {
                status: 403,
                body: route.errorBody ? route.errorBody : '10.4.4 403 Forbidden'
            };
            break;
            
        //Simulates a bad response (409) - 10.4.10 409 Bad Request
        case 'conflict':
            response = {
                status: 409,
                body: route.errorBody ? route.errorBody : '10.4.10 409 Conflict'
            };
            break;

        //Simulates a bad response (400) - 10.4.1 400 Bad Request
        case 'badRequest':
            response = {
                status: 400,
                body: route.errorBody ? route.errorBody : '10.4.1 400 Bad Request'
            };
            break;

        //Simulates a bad response (500) - 10.5.1 500 Internal Server Error
        case 'error':
            response = {
                status: 500,
                body: route.errorBody ? route.errorBody : '10.5.1 500 Internal Server Error'
            };
            break;

        //Simulates a successful response(204) - 10.2.5 204 No Content
        case 'noContent':
            response = {
                status: 204,
                body: route.errorBody ? route.errorBody : '10.2.5 204 No Content'
            };
            break;

        //Defaults to a successful response (200) - 10.2.1 200 OK
        default:
            response = {
                status: 200,
                body: route.errorBody ? route.errorBody : '10.2.1 200 OK'
            };
            break;
    }


    return response;
}

function _getStore (key) {
    return store.get(key);
}

function _setStore (key, value) {
    store.set(key, value);
    return value;
}

//todo: replace with validator
function _tryParseJSON (jsonString){
    try {
        var o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns 'null', and typeof null === "object",
        // so we must check for that, too.
        if (o && typeof o === "object" && o !== null) {
            return o;
        }
    }
    catch (e) { }

    return false;
}
