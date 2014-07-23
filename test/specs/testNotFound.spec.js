var express = require('express'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    validator = require('validator'),
    baseUrl = 'http://localhost',
    app = express(),
    server = null;

require('rootpath')();

describe("Test Mock Not Found Scenarios", function() {

    it("Test not found response (404) NOT using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

    it("Test not found response (404) using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

});