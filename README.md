# mock-json-api

NPM - Mock JSON API (BETA)

A node module for generating dummy data quickly and mocking an API to deliver that data as json objects defined by the developer

Dependencies:
- dummy-json
- json-store
- validator
- express

Properties
- **jsonStore**: This is the local file location for the actual data that gets generated.  The data will be stored in this json file and served up on request by node.  This allows us to serve up well-known data vs. generating it everytime, thus simulating a database (of sorts).
- **mockRoutes**: An array of routes to mock
    - **name**: The unique identifier of the service method to be mocked
    - **mockRoute**: The URl of the route to mock
    - **testScope**: The behavior of the route response; success, fail, or error
    - **testScenario**: Determines which JSON template to return in the array when testScope is "success"
    - **jsonTemplate**: The actual object to be returned from the mock route.  This will also tell node how to construct the dummy data the first time the route is requested
	- **data**: Your own data to be used with dummy-json.
	- **helpers**: Custom helpers to be used with dummy-json. Refer to the [dummy-json documention](https://github.com/webroo/dummy-json) for more information.

```javascript
var express = require('express');
var mock = require('mock-json-api');

server = express();

var mockapi = mock({
    jsonStore: __dirname + '/data.json',
    mockRoutes: [
        {
            name: 'foo',
            mockRoute: '/api/foo',
            testScope: 'success',
            testScenario: 1,
            jsonTemplate: [function(){ return '{
                "people": [
                    {{#repeat 2}} {
                        "id": {{index}},
                        "firstName": "{{firstName}}",
                        "lastName": "{{lastName}}",
                        "email": "{{email}}",
                        "work": "{{company}}",
                        "age": {{number 20 50}},
                        "optedin": {{boolean}}
                    } {{/repeat}}],
                "images": [
                    {{#repeat 3 6}}
                        'img{{index}}.png'
                    {{/repeat}} ],
                "revision": {{uniqueIndex}},
                "tolerance": {{number '0' '2'}},
            }'; };]
        },
        {
            name: 'bar',
            mockRoute: '/api/bar',
            testScope: 'fail',
            jsonTemplate: [function(){ return '{
                "name": "{{firstName}}",
                "age": {{number 18 65}}
            }'; };]
        },
        {
            name: 'bar',
            mockRoute: '/api/foobar',
            testScope: 'error',
            jsonTemplate: [function(){ return '{
                "name": "{{firstName}}",
                "age": {{number 18 65}}
            }'; };]
        }
    ]
});

server.use(mockapi.registerRoutes);
server.listen(3001);
```
