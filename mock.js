/**
 * Created by jeff.flater on 4/23/2014.
 */
var dummyJson = require('dummy-json'),
    jsonStore = require('json-store'),
    validator = require('validator');

var configOptions = ['jsonStore',
    'mockRoutes'];

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

    for (var i = 0; i < routes.length; i++) {
        if (routes[i].mockRoute === req.path) {

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
            }

            res.set('Content-Type', 'application/json');
            res.send(_routeResponse(route));
            break;
        }
    }
    res.end();  //no routes found, end here!
};

module.exports = function (config) {
    return new Mock(config);
};

/*
 * PRIVATE METHODS
 * */

function _routeResponse (route) {
    var response = null;
    var guid = route.name+route.testScope+route.testScenario;

    switch (route.testScope) {

        //Simulates a successful response (200) - 10.2.1 200 OK
        case 'success':
            response = _getStore(guid);
            if (response === null || typeof response === 'undefined') {
                var jsonTemplate = null;
				var dummyOptions = {};

                if (typeof route.jsonTemplate === 'object') {

                    var scenario = parseInt(route.testScenario);
                    if (isNaN(scenario)) {
                        scenario = 0;
                    }
                    if (route.jsonTemplate.length > scenario) {
                        jsonTemplate = route.jsonTemplate[scenario]();
                    }
                }

                if (typeof route.jsonTemplate === 'string') {
                    jsonTemplate = route.jsonTemplate;
                }
				
				if (route.data) {
					dummyOptions.data = route.data;
				}
				if (route.helpers) {
					dummyOptions.helpers = route.helpers;
				}

                //todo: use validator to enhance template validation
                response = _setStore(guid, dummyJson.parse(jsonTemplate, dummyOptions));
            }

            //todo: use validator to enhance response validation

            break;


        //Simulates a bad response (404) - 10.4.5 404 Not Found
        case 'notFound':
            response = 404;
            break;

        //Simulates a bad response (408) - 10.4.9 408 Request Timeout
        case 'timeout':
            response = 408;
            break;

        //Simulates a bad response (401) - 10.4.2 401 Unauthorized
        case 'unauthorized':
            response = 401;
            break;

        //Simulates a bad response (403) - 10.4.4 403 Forbidden
        case 'forbidden':
            response = 403;
            break;

        //Simulates a bad response (400) - 10.4.1 400 Bad Request
        case 'badRequest':
            response = 400;
            break;

        //Simulates a bad response (500) - 10.5.1 500 Internal Server Error
        case 'error':
            response = 500;
            break;

        //Defaults to a successful response (200) - 10.2.1 200 OK
        default:
            response = 200;
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

