var express = require('express'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    validator = require('validator'),
    baseUrl = 'http://localhost',
    app = express(),
    server = null,
    routeName = null,
    routePath = null,
    statusCode = null,
    testScope = null;

require('rootpath')();

describe("Test Mock Success Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooSuccess';
        routePath = '/api/fooSuccess';
        statusCode = 200;
        testScope = 'success';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test successful response for mock api/foo NOT using queryString parameters", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    testScenario: 1,
                    jsonTemplate: [testTemplate1, testTemplate2, testTemplate3]
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+routePath;

        request(url, function(error, response, body){
            expect(validator.isJSON(body)).toEqual(true);
            expect(response.statusCode).toEqual(statusCode);
            done();
        });

    });

    it("Test successful response for mock api/foo using scope/scenario queryString parameters", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    jsonTemplate: [testTemplate1, testTemplate2, testTemplate3]
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+routePath+'?scope='+testScope+'&scenario='+testScenario;

        request(url, function(error, response, body){
            expect(validator.isJSON(body)).toEqual(true);
            expect(response.statusCode).toEqual(statusCode);
            done();
        });

    });

});