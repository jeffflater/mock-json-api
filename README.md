# mock-json-api

NPM - Mock JSON API

A node module for generating dummy data quickly and mocking an API to deliver that data as json objects defined by the developer

Dependencies:
- jsonStore

Properties
- *jsonStore*: This is the local file location for the actual data that gets generated.  The data will be stored in this json file and served up on request by node.  This allows us to serve up well-known data vs. generating it everytime, thus simulating a database (of sorts).
- *mockRoutes*: An array of routes to mock
    - *name*: The unique identifier of the service method to be mocked
    - *mockRoute*: The URl of the route to mock
    - *jsonTemplate*: The actual object to be returned from the mock route.  This will also tell node how to construct the dummy data the first time the route is requested

```javascript
var express = require('express');
var mock = require('mock-json-api');

app = express();

var mockapi = mock({
    jsonStore: __dirname + '/data.json',
    mockRoutes: [
        {
            name: 'foo',
            mockRoute: '/api/foo',
            jsonTemplate: '{
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
            }'
        },
        {
            name: 'bar',
            mockRoute: '/api/bar',
            jsonTemplate: '{ 
                "name": {{firstName}}, 
                "age": {{number 18 65}} 
            }'
        }
    ]
});

app.use(mockapi.registerRoutes);
app.listen(3001);
```
