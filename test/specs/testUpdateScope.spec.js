var express = require('express'),
    bodyParser = require('body-parser'),
    mock = require('../../mock.js'),
    port = 3001,
    request = require('request'),
    validator = require('validator'),
    baseUrl = 'http://localhost',
    app = express(),
    server = null,
    routeName = null,
    routePath = null,
    statusCode = null,
    testScope = null,
    testScenario = null;

require('rootpath')();

describe("Test Mock Scenario Types", function() {

    beforeEach(function () {
        routeName = 'realtime';
        routePath = '/api/realtime';
        statusCode = 200;
        errorCode = 500;
        testScope = 'success';
        testScenario = 'first';

        server = app.listen(port);
    });

    afterEach(function () {
        server.close();
    });

    it("Test successful response for mock api/realtime using multiple templates and changing the test scenario in realtime", function(done){

        var testTemplate1 = function(){ return '{ "name": "first", "age": {{int 18 65}} }'; };
        var testTemplate2 = function(){ return '{ "name": "second", "age": {{int 18 65}} }'; };
        var testTemplate3 = function(){ return '{ "name": "third", "age": {{int 18 65}} }'; };

        var routes = mock({
            jsonStore: 'test/data/data.json',
            mockRoutes: [
                {
                    name: routeName,
                    mockRoute: routePath,
                    testScope: testScope,
                    testScenario: testScenario,
                    jsonTemplate: [
                        { 'first': testTemplate1 },
                        { 'second': testTemplate2 },
                        { 'third': testTemplate3 }
                    ]
                }
            ]
        });

        app.use(bodyParser.json()); // support json encoded bodies
        app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

        var updatePath = '/mock/update';
        app.post(updatePath, routes.updateRoute); // must be defined first , unless will be overwritten by app.use(routes.registerRoutes);

        app.use(routes.registerRoutes);


        var url = baseUrl+':'+port+routePath;
        var updateUrl = baseUrl+':'+port+updatePath;

        request(url, function(error, response, body){
            expect(validator.isJSON(body)).toEqual(true);
            expect(response.statusCode).toEqual(statusCode);

            var data = JSON.parse(body);
            expect(data.name).toEqual(testScenario);

            var formData = {
                route: {
                    name: 'realtime',
                    scope: 'success',
                    scenario: 'first'
                },
                update: {
                    scenario: 'first',
                    scope: 'error'
                }
            };

            request.post({url: updateUrl, form: formData}, function(error, response, body){
                expect(validator.isJSON(body)).toEqual(true);
                expect(response.statusCode).toEqual(statusCode);

                var data = JSON.parse(body);
                expect(data.body.route.testScenario).toEqual(formData.update.scenario);

                request(url, function(error, response, body){

                    expect(response.statusCode).toEqual(errorCode);
                    done();
                });

            });

        });

    });

});
