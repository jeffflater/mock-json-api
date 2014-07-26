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

describe("Test Mock Success Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooSuccess';
        routePath = '/api/fooSuccess';
        statusCode = 200;
        testScope = 'success';
        testScenario = 1;

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test successful response for mock api/fooSuccess NOT using queryString parameters with multiple templates defining the test scenario", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    testScenario: testScenario,
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

    it("Test successful response for mock api/fooSuccess using scope/scenario queryString parameters with multiple templates defining the test scenario", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };

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

    it("Test successful response for mock api/fooSuccess NOT using queryString parameters with multiple templates NOT defining the test scenario", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
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

    it("Test successful response for mock api/fooSuccess using scope/scenario queryString parameters with multiple templates NOT defining the test scenario", function(done){

        var testTemplate1 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };

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

        var url = baseUrl+':'+port+routePath+'?scope='+testScope;

        request(url, function(error, response, body){
            expect(validator.isJSON(body)).toEqual(true);
            expect(response.statusCode).toEqual(statusCode);
            done();
        });

    });

    it("Test successful response for mock api/fooSuccess NOT using queryString parameters for a single template NOT wrapped in a function", function(done){

        var testTemplate = '{ "name": "{{firstName}}", "age": {{number 18 65}} }';

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    jsonTemplate: testTemplate
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

    it("Test successful response for mock api/fooSuccess using queryString parameters for a single template NOT wrapped in a function", function(done){

        var testTemplate = '{ "name": "{{firstName}}", "age": {{number 18 65}} }';

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    jsonTemplate: testTemplate
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+routePath+'?scope='+testScope;

        request(url, function(error, response, body){
            expect(validator.isJSON(body)).toEqual(true);
            expect(response.statusCode).toEqual(statusCode);
            done();
        });
    });

    it("Test successful response for mock api/fooSuccess NOT using queryString parameters for a single template wrapped in a function", function(done){

        var testTemplate = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    jsonTemplate: testTemplate
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

    it("Test successful response for mock api/fooSuccess using queryString parameters for a single template wrapped in a function", function(done){

        var testTemplate = function(){ return '{ "name": "{{firstName}}", "age": {{number 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    jsonTemplate: testTemplate
                }
            ]
        });

        app.use(routes.registerRoutes);

        var url = baseUrl+':'+port+routePath+'?scope='+testScope;

        request(url, function(error, response, body){
            expect(validator.isJSON(body)).toEqual(true);
            expect(response.statusCode).toEqual(statusCode);
            done();
        });

    });
});