# mock-json-api

NPM - Mock JSON API

- Sample Usage

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
            jsonTemplate: '{ "name": {{firstName}}, "age": {{number 18 65}} }'
        },
        {
            name: 'bar',
            mockRoute: '/api/bar',
            jsonTemplate: '{ "name": {{firstName}}, "age": {{number 18 65}} }'
        }
    ]
});

app.use(mockapi.registerRoutes);
app.listen(3001);
```
