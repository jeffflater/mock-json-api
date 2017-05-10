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
    testScope = null;

require('rootpath')();

describe("Test Mock Misuse Scenarios", function() {

    beforeEach(function () {
        routeName = 'fooSuccess';
        routePath = '/api/fooSuccess';
        testScope = 'success';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test malformed JSON template", function(done){

        var testTemplate = ' "name": "{{firstName}}", "age: {{int XX 55}} }';

        try {

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

        }catch (e) {
            console.log(e);
            expect(e).toBeDefined();
        }

        done();

    });


    it("Test using wrong config options", function(done){

        try{

            var routes = mock({
                jsonStore: 'test/data/data.json',
                mockRoutx: []
            });

            app.use(routes.registerRoutes);

        }catch(e){
            console.log(e);
            expect(e).toBeDefined();
        }

        done();

    });

});