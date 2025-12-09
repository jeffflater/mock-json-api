/**
 * mock-json-api
 * A mock JSON API server for Node.js with scenario support
 */
const dummyJson = require('dummy-json');
const cors = require('cors');
const express = require('express');
const { match } = require('path-to-regexp');
const fs = require('fs');
const path = require('path');

const configOptions = ['mockRoutes'];

/**
 * In-memory data store with optional file persistence
 */
class DataStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = {};
        this._loadFromFile();
    }

    _loadFromFile() {
        if (this.filePath && fs.existsSync(this.filePath)) {
            try {
                const content = fs.readFileSync(this.filePath, 'utf8');
                this.data = JSON.parse(content);
            } catch (err) {
                this.data = {};
            }
        }
    }

    _saveToFile() {
        if (this.filePath) {
            try {
                const dir = path.dirname(this.filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
            } catch (err) {
                console.error('Error saving to file:', err);
            }
        }
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
        this._saveToFile();
        return value;
    }

    clear() {
        this.data = {};
        this._saveToFile();
    }
}

function Mock(config) {
    // Validate JSON object
    if (!config || typeof config !== 'object') {
        throw new Error('Invalid config object!');
    }

    // Validate required config options
    for (let i = 0; i < configOptions.length; i++) {
        if (!config.hasOwnProperty(configOptions[i])) {
            throw new Error(`Missing required config option: ${configOptions[i]}`);
        }
    }

    this.store = new DataStore(config.jsonStore);
    this.routes = config.mockRoutes;
    this.config = config;

    // Store original route configurations for reset
    this.originalRoutes = JSON.parse(JSON.stringify(
        config.mockRoutes.map(r => ({
            name: r.name,
            testScope: r.testScope,
            testScenario: r.testScenario
        }))
    ));

    // Pre-compile route matchers for path-to-regexp style routes
    this.routes.forEach(route => {
        if (route.mockRoute && !route.mockRoute.includes('(') && route.mockRoute.includes(':')) {
            // Express-style route with params (e.g., /api/leagues/:id)
            try {
                route._matcher = match(route.mockRoute, { decode: decodeURIComponent });
                route._isParamRoute = true;
            } catch (e) {
                route._isParamRoute = false;
            }
        } else {
            route._isParamRoute = false;
        }
    });
}

/**
 * Create Express middleware with CORS and body parsing
 */
Mock.prototype.createServer = function() {
    const app = express();

    // CORS support
    if (this.config.cors !== false) {
        const corsOptions = typeof this.config.cors === 'object' ? this.config.cors : {};
        app.use(cors(corsOptions));
    }

    // Body parsing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Reset endpoint
    app.post('/_reset', (req, res) => {
        this.reset();
        res.json({ success: true, message: 'Mock server state reset' });
    });

    // Set route scenario endpoint
    app.post('/_scenario', (req, res) => {
        this.setRouteScenario(req, res);
    });

    // Register mock routes
    app.use((req, res, next) => {
        this.registerRoutes(req, res, next);
    });

    return app;
};

/**
 * Reset all state to initial configuration
 */
Mock.prototype.reset = function() {
    // Clear the data store
    this.store.clear();

    // Reset all routes to original configuration
    this.originalRoutes.forEach(original => {
        const route = this.routes.find(r => r.name === original.name);
        if (route) {
            route.testScope = original.testScope;
            route.testScenario = original.testScenario;
        }
    });
};

Mock.prototype.registerRoutes = function(req, res, next) {
    let found = false;
    let matchedRoute = null;
    let extractedParams = {};
    const urlPath = req.originalUrl.split('?')[0]; // Remove query string

    // First pass: check parameterized routes (more specific)
    for (let i = 0; i < this.routes.length; i++) {
        const route = this.routes[i];

        if (!(typeof route.method === 'string' || route.method instanceof String)) {
            route.method = 'get';
        }

        const matchingMethod = (route.method.toLowerCase() === req.method.toLowerCase());
        if (!matchingMethod) continue;

        if (route._isParamRoute && route._matcher) {
            const matchResult = route._matcher(urlPath);
            if (matchResult) {
                found = true;
                matchedRoute = route;
                extractedParams = matchResult.params || {};
                break;
            }
        }
    }

    // Second pass: check regex/exact routes
    if (!found) {
        for (let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];

            if (!(typeof route.method === 'string' || route.method instanceof String)) {
                route.method = 'get';
            }

            const matchingMethod = (route.method.toLowerCase() === req.method.toLowerCase());
            if (!matchingMethod) continue;

            // Skip parameterized routes (already checked)
            if (route._isParamRoute) continue;

            if (route.mockRoute) {
                const urlLower = urlPath.toLowerCase();
                const routePattern = route.mockRoute.toLowerCase();

                // Check if it's a regex pattern (contains regex special chars)
                const isRegex = /[\\^$*+?.()|[\]{}]/.test(routePattern);

                if (isRegex) {
                    // Regex matching
                    if (urlLower.match(routePattern) !== null) {
                        found = true;
                        matchedRoute = route;
                        break;
                    }
                } else {
                    // Exact matching for simple routes
                    if (urlLower === routePattern) {
                        found = true;
                        matchedRoute = route;
                        break;
                    }
                }
            }
        }
    }

    if (!found) {
        if (next) {
            next();
        } else {
            res.status(404).json({ error: 'Route not found' });
        }
        return;
    }

    // Merge extracted params into req.params
    req.params = { ...req.params, ...extractedParams };

    const route = matchedRoute;

    // Override from query parameters
    if (typeof req.query !== 'undefined') {
        if (typeof req.query.scope !== 'undefined') {
            route.testScope = req.query.scope;
        }
        if (typeof req.query.scenario !== 'undefined') {
            route.testScenario = req.query.scenario;
        }
        if (typeof req.query.latency !== 'undefined') {
            route.latency = req.query.latency;
        }
    }

    // Calculate latency
    let latency = 0;
    try {
        if (route.latency) {
            if (isNaN(route.latency)) {
                const splits = route.latency.split('-');
                const min = parseInt(splits[0]);
                const max = parseInt(splits[1]);
                latency = Math.floor(Math.random() * (max - min + 1) + min);
                if (latency > max) {
                    latency = max;
                }
            } else {
                latency = parseInt(route.latency);
            }
        }
    } catch (err) {
        console.error('Error calculating latency:', err);
        latency = 0;
    }

    const response = this._routeResponse(route, req);

    setTimeout(() => {
        res.set('Content-Type', 'application/json');
        res.status(response.status).send(response.body);
    }, latency);
};

Mock.prototype.setRouteScenario = function(req, res) {
    let found = false;
    let route = null;

    const config = {
        name: req.body.name || null,
        testScope: req.body.scope || null,
        testScenario: req.body.scenario || null,
        testMethod: req.body.method || null
    };

    for (let i = 0; i < this.routes.length; i++) {
        if (this.routes[i].name === config.name) {
            found = true;
            if (config.testScenario !== null) {
                this.routes[i].testScenario = config.testScenario;
            }
            if (config.testScope) {
                this.routes[i].testScope = config.testScope;
            }
            if (config.testMethod) {
                this.routes[i].method = config.testMethod;
            }
            route = this.routes[i];
            break;
        }
    }

    res.status(found ? 200 : 404).json({
        message: found ? 'Mock route updated.' : 'Mock route name not found.',
        route: found ? route : null
    });
};

Mock.prototype._routeResponse = function(route, req) {
    let response = null;
    const guid = route.name + route.testScope + route.testScenario;

    switch (route.testScope) {
        case 'success':
            let storedData = this.store.get(guid);
            if (storedData === null || typeof storedData === 'undefined') {
                let jsonTemplate = null;
                const dummyOptions = {};

                if (typeof route.jsonTemplate === 'object') {
                    if (!route.testScenario) {
                        route.testScenario = 0;
                    }

                    // testScenario can be a function
                    if (typeof route.testScenario === 'function') {
                        route.testScenario = route.testScenario(req);
                    }

                    // testScenario is a string (named scenario)
                    if (typeof route.testScenario === 'string') {
                        const templates = route.jsonTemplate;
                        for (let template of templates) {
                            if (template.hasOwnProperty(route.testScenario)) {
                                jsonTemplate = template[route.testScenario](req);
                                break;
                            }
                        }
                    }

                    // testScenario is an index
                    if (!isNaN(route.testScenario)) {
                        const scenario = parseInt(route.testScenario);
                        if (route.jsonTemplate.length > scenario) {
                            const templateItem = route.jsonTemplate[scenario];
                            if (typeof templateItem === 'function') {
                                jsonTemplate = templateItem(req);
                            } else {
                                jsonTemplate = templateItem;
                            }
                        }
                    }
                }

                if (typeof route.jsonTemplate === 'string') {
                    jsonTemplate = route.jsonTemplate;
                }

                if (typeof route.jsonTemplate === 'function') {
                    jsonTemplate = route.jsonTemplate(req);
                }

                dummyOptions.data = route.data || {};
                dummyOptions.data.request = req;

                if (route.helpers) {
                    dummyOptions.helpers = route.helpers;
                }

                let result;
                try {
                    result = dummyJson.parse(jsonTemplate, dummyOptions);
                } catch (err) {
                    console.error('Error parsing template:', err);
                    result = jsonTemplate;
                }

                response = {
                    status: 200,
                    body: this.store.set(guid, result)
                };
            } else {
                response = {
                    status: 200,
                    body: storedData
                };
            }
            break;

        case 'notFound':
            response = {
                status: 404,
                body: route.errorBody || { error: 'Not Found' }
            };
            break;

        case 'timeout':
            response = {
                status: 408,
                body: route.errorBody || { error: 'Request Timeout' }
            };
            break;

        case 'unauthorized':
            response = {
                status: 401,
                body: route.errorBody || { error: 'Unauthorized' }
            };
            break;

        case 'forbidden':
            response = {
                status: 403,
                body: route.errorBody || { error: 'Forbidden' }
            };
            break;

        case 'conflict':
            response = {
                status: 409,
                body: route.errorBody || { error: 'Conflict' }
            };
            break;

        case 'badRequest':
            response = {
                status: 400,
                body: route.errorBody || { error: 'Bad Request' }
            };
            break;

        case 'error':
            response = {
                status: 500,
                body: route.errorBody || { error: 'Internal Server Error' }
            };
            break;

        case 'noContent':
            response = {
                status: 204,
                body: ''
            };
            break;

        case 'created':
            response = {
                status: 201,
                body: route.errorBody || { message: 'Created' }
            };
            break;

        default:
            response = {
                status: 200,
                body: route.errorBody || { message: 'OK' }
            };
            break;
    }

    return response;
};

module.exports = function(config) {
    return new Mock(config);
};
