var express = require('express'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    baseUrl = 'http://localhost',
    app = express(),
    server = null,
    routeName = null,
    routePath = null,
    statusCode = null,
    testScope = null;

require('rootpath')();

describe("Test Mock Not Found Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooNotFound';
        routePath = '/api/fooNotFound';
        statusCode = 404;
        testScope = 'notFound';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test not found response (404) NOT using queryString parameters", function(done){

        var route = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope
                }
            ]
        });

        app.use(route.registerRoutes);

        var url = baseUrl+':'+port+routePath;

        request(url, function(error, response, body){
            expect(response.statusCode).toEqual(statusCode);
            done();
        });

    });

    it("Test not found response (404) using queryString parameters", function(done){

        var route = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath
                }
            ]
        });

        app.use(route.registerRoutes);

        var url = baseUrl+':'+port+routePath+'?scope='+testScope;

        request(url, function(error, response, body){
            expect(response.statusCode).toEqual(statusCode);
            done();
        });

    });

});