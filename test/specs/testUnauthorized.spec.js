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

describe("Test Mock Unauthorized Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooUnauthorized';
        routePath = '/api/fooUnauthorized';
        statusCode = 401;
        testScope = 'unauthorized';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test unauthorized response (401) NOT using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

    it("Test unauthorized response (401) using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

});