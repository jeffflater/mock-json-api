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
    testScope = null,
    testScenario = null;

require('rootpath')();

describe("Test Mock Scenario Types", function() {

    beforeEach(function () {
        routeName = 'fooSuccess';
        routePath = '/api/fooSuccess';
        statusCode = 200;
        testScope = 'success';
        testScenario = 'second';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test successful response for mock api/fooSuccess using multiple templates defining the test scenario as text", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    testScenario: testScenario,
                    jsonTemplate: [
                      { 'first': testTemplate1 },
                      { 'second': testTemplate2 },
                      { 'third': testTemplate3 }
                    ]
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+routePath;

        request(url, function(error, response, body){
            // expect(validator.isJSON(body)).toEqual(true);
            // expect(response.statusCode).toEqual(statusCode);
            done();
        });

    });

    xit("Test successful response for mock api/fooSuccess using multiple templates defining the test scenario as function that returns a string", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    testScenario: function(req){
                      if (req.body) {
                        return 'second';
                      }
                      return 'first'; //defaults
                    },
                    jsonTemplate: [
                      { 'first': testTemplate1 },
                      { 'second': testTemplate2 },
                      { 'third': testTemplate3 }
                    ]
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

    xit("Test successful response for mock api/fooSuccess using multiple templates defining the test scenario as function that returns an int", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{int 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    testScenario: function(req){
                      if (req.body) {
                        return 1;
                      }
                      return 0; //defaults
                    },
                    jsonTemplate: [
                      testTemplate1,
                      testTemplate2,
                      testTemplate3
                    ]
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

});
