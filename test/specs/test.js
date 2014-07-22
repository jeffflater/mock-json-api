/**
 * Created by jeff.flater on 4/23/2014.
 */
var express = require('express');
var mock = require('./../../mock');
var port = 3001;

app = express();

var template1 = function(){ return '{ "name": {{firstName}}, "age": {{number 18 65}} }' };
var template2 = function(){ return '{ "name": {{firstName}}, "age": {{number 18 65}} }' };
var template3 = function(){ return '{ "name": {{firstName}}, "age": {{number 18 65}} }' };

var mockapi = mock({
    jsonStore: __dirname + '/test/data/data.json',
    mockRoutes: [
        {
            name: 'foo',
            mockRoute: '/api/foo',
            testScope: 'success',       //success | fail | error
            testScenario: 1,
            jsonTemplate: [template1, template2, template3]
        },
        {
            name: 'bar',
            mockRoute: '/api/bar',
            testScope: 'fail',
            jsonTemplate: template2
        },
        {
            name: 'foobar',
            mockRoute: '/api/foobar',
            testScope: 'error',
            jsonTemplate: template3
        }
    ]
});

app.use(mockapi.registerRoutes);

app.listen(port);
console.log('listening on port: '+port);
