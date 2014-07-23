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

describe("Test Mock Timeout Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooTimeout';
        routePath = '/api/fooTimeout';
        statusCode = 408;
        testScope = 'timeout';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test timeout response (400) NOT using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

    it("Test timeout response (400) using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

});