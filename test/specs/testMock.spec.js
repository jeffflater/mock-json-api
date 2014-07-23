var express = require('express'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    validator = require('validator'),
    baseUrl = 'http://localhost';

require('rootpath')();

var app = express();

var template1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
var template2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
var template3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };

var mockapi = mock({
    jsonStore: 'test/data/data.json',
    mockRoutes: [
        {
            name: 'foo',
            mockRoute: '/api/foo',
            //testScope: 'success',       //success | fail | error
            //testScenario: 1,
            jsonTemplate: [template1, template2, template3]
        },
        {
            name: 'bar',
            mockRoute: '/api/bar',
            //testScope: 'fail',
            jsonTemplate: template2
        },
        {
            name: 'foobar',
            mockRoute: '/api/foobar',
            //testScope: 'error',
            jsonTemplate: template3
        }
    ]
});

app.use(mockapi.registerRoutes);

app.listen(port);
console.log('listening on port: '+port);

describe("Test Mock Scenarios", function() {

    it("Test JSON for mock api/foo route...", function(done) {
        var url = baseUrl+':'+port+'/api/foo?scope=success&scenario=1';
        console.log(url);
        request(url, function(error, response, body){
            console.log('JSON: '+body);
            expect(validator.isJSON(body)).toEqual(true);
            done();
        });
    });

    it("Test 404 for mock api/bar route...", function(done) {
        var url = baseUrl+':'+port+'/api/bar?scope=fail';
        request(url, function(error, response, body){
            expect(response.statusCode).toEqual(404);
            done();
        });
    });

    it("Test 500 for mock api/bar route...", function(done) {
        var url = baseUrl+':'+port+'/api/foobar?scope=error';
        request(url, function(error, response, body){
            expect(response.statusCode).toEqual(500);
            done();
        });
    });

});