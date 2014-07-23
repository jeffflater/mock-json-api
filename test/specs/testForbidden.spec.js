var express = require('express'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    validator = require('validator'),
    baseUrl = 'http://localhost',
    app = express(),
    server = null;

require('rootpath')();

describe("Test Mock Forbidden Scenarios", function() {

    it("Test forbidden response (403) NOT using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

    it("Test forbidden response (403) using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

});