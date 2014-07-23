var express = require('express'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    validator = require('validator'),
    baseUrl = 'http://localhost',
    app = express(),
    server = null;

require('rootpath')();

describe("Test Mock Scenarios", function() {

    beforeEach(function () {
        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test JSON for mock api/foo route...", function(done) {

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }' };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: 'foo',
                    mockRoute: '/api/foo',
                    testScope: 'success',
                    testScenario: 1,
                    jsonTemplate: [testTemplate1, testTemplate2, testTemplate3]
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+'/api/foo?scope=success&scenario=1';
        request(url, function(error, response, body){
            expect(validator.isJSON(body)).toEqual(true);
            done();
        });
    });

    it("Test 404 for mock api/bar route...", function(done) {

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: 'bar',
                    mockRoute: '/api/bar',
                    testScope: 'fail'
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+'/api/bar?scope=fail';
        request(url, function(error, response, body){
            expect(response.statusCode).toEqual(404);
            done();
        });
    });

    it("Test 500 for mock api/bar route...", function(done) {

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: 'foobar',
                    mockRoute: '/api/foobar',
                    testScope: 'error'
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+'/api/foobar?scope=error';
        request(url, function(error, response, body){
            expect(response.statusCode).toEqual(500);
            done();
        });
    });

});