/**
 * Created by jeff.flater on 4/23/2014.
 */
var dummyJson = require('dummy-json'),
    jsonStore = require('json-store');

var configOptions = ['jsonStore',
                        'mockRoutes'];

var routes,
    store;

function Mock(config) {
    // Validate JSON object
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
            if (req.query !== null || typeof req.query !== 'undefined') {

                var testScope = req.query.scope;
                if (testScope !== null || typeof testScope !== 'undefined') {
                    route.testScope = testScope;
                }

                var testScenario = req.query.scenario;
                if (testScenario !== null || typeof testScenario !== 'undefined') {
                    route.testScenario = testScenario;
                }
            }

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
        //Simulates a successful response
        case 'success':
            response = _getStore(guid);
            if (response === null || typeof response === 'undefined') {
                //choose function in array to return json result
                var jsonResults = route.jsonTemplate[route.testScenario]();
                response = _setStore(guid, dummyJson.parse(jsonResults));
            }
            break;


        //Simulates a bad response (404)
        case 'fail':
            response = 404;
            break;

        //Simulates a bad response (500)
        case 'error':
            response = 500;
            break;

        //Defaults to a 404 response
        default:
            response = 404;
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
