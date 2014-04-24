/**
 * Created by jeff.flater on 4/23/2014.
 */
var dummyJson = require('dummy-json'),
    jsonStore = require('json-store');

var configOptions = ['jsonStore',
                        'mockRoutes'];

var routes;
var store;

function Mock(config) {
    // Validate JSON object
    if (!tryParseJSON(JSON.stringify(config))) {
        throw 'Invalid json config object!'
    }

    // Validate config options
    for (var i=0; i < configOptions.length; i++) {
        if (!config.hasOwnProperty(configOptions[i])) {
            throw 'Missing required config options'
        }
    }

    store = jsonStore(config.jsonStore);
    routes = config.mockRoutes;
}

Mock.prototype.registerRoutes = function (req, res) {

    for (var i = 0; i < routes.length; i++) {
        if (routes[i].mockRoute == req.path) {
            res.send(routeResponse(routes[i]));
            break;
        }
    }
    res.end();  //no routes found, end here!
};

module.exports = function (config) {
  return new Mock(config);
};

/*
* private methods
* */

function routeResponse (route) {
    var data = getStore(route.name);
    if (data == null) {
        data = setStore(route.name, dummyJson.parse(route.jsonTemplate));
    }
    return data;
}

function getStore (key) {
    return store.get(key);
}

function setStore (key, value) {
    store.set(key, value);
    return value;
}

function tryParseJSON (jsonString){
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
};