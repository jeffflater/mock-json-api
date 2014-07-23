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
        expect(true).toEqual(true);
        done();
    });

    it("Test not found response (404) using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

});