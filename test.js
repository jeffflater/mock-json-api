/**
 * Created by jeff.flater on 4/23/2014.
 */
var express = require('express');
var mock = require('./mock');

app = express();

var template1 = '{ "name": {{firstName}}, "age": {{number 18 65}} }';
var template2 = '{ "name": {{firstName}}, "age": {{number 18 65}} }';
var template3 = '{ "name": {{firstName}}, "age": {{number 18 65}} }';

var mockapi = mock({
    jsonStore: __dirname + '/data.json',
    mockRoutes: [
        {
            name: 'foo',
            mockRoute: '/api/foo',
            testScope: 'success',       //success | fail | error
            jsonTemplate: template1
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

app.listen(3001);