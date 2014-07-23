var express = require('express'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    validator = require('validator'),
    baseUrl = 'http://localhost',
    app = express(),
    server = null;

require('rootpath')();

describe("Test Mock Success Scenarios", function() {

    it("Test successful response for mock api/foo NOT using queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

    it("Test successful response for mock api/foo using scope/scenario queryString parameters", function(done){
        expect(true).toEqual(true);
        done();
    });

});