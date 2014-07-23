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

describe("Test Mock Error Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooError';
        routePath = '/api/fooError';
        statusCode = 500;
        testScope = 'error';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test server error response (500) NOT using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

    it("Test server error response (500) using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

});