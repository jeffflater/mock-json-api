/**
 * Created by jeff.flater on 4/23/2014.
 */
var mock = require('./mock');
var assert = require('assert');


var template1 = {};
var template2 = {};

var mockapi = mock({
    jsonStore: 'test',
    mockRoutes: [
        {
            name: 'foo',
            mockRoute: '/api/foo',
            jsonTemplate: template1
        },
        {
            name: 'bar',
            mockRoute: '/api/bar',
            jsonTemplate: template2
        }
    ]
});

// app.use(mockapi.registerRoutes);
