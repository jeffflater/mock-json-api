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

describe("Test Mock Forbidden Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooForbidden';
        routePath = '/api/fooForbidden';
        statusCode = 403;
        testScope = 'forbidden';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test forbidden response (403) NOT using queryString parameters", function(done){

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

    it("Test forbidden response (403) using queryString parameters", function(done){

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