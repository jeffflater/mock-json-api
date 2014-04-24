/**
 * Created by jeff.flater on 4/23/2014.
 */
var dummyJson = require('dummy-json'),
    jsonStore = require('json-store');

var configOptions = ['jsonStore',
                        'mockRoutes'];

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

    this.store = jsonStore(config.jsonStore);
    this.routes = config.mockRoutes;

}

Mock.prototype.registerRoutes = function (req, res) {

    for (var i = 0; i < this.routes.length; i++) {
        if (this.routes[i].mockRoute == req.path) {
            res.send(routeResponse(this.routes[i]));
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
    var jsonTemplate = getStore(route.mockRoute);
    if (!tryParseJSON(jsonTemplate)) {
        setStore(route.name, rotue.jsonTemplate);
    } else {
        jsonTemplate = rotue.jsonTemplate;
    }
    return renderJsonTemplate(jsonTemplate);
}

function renderJsonTemplate(jsonTemplate) {
    return dummyJson.parse(JSON.stringify(jsonTemplate));
}

function getStore (key) {
    return this.store.get(key);
}

function setStore (key, value) {
    this.store.set(key, value);
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