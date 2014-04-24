# mock-json-api

NPM - Mock JSON API

- jsonStore

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
