# mock-json-api

NPM - Mock JSON API

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
    - **mockRoute**: The URL of the route to mock - a regex
    - **testScope**: The behavior of the route response; success, fail, or error
    - **errorBody**: The text that will be displayed in the response of any error thrown
    - **testScenario**: Determines which JSON template to return in the array when testScope is "success"
    - **latency**: in milliseconds.  Will delay the response by set number of miliseconds.  Can be a single number like 3000, a string like '3000' or a range of numbers as a string like '2000-7000'.  If a range, it will randomly select a number in that range on each request.
    - **jsonTemplate**: The actual object to be returned from the mock route.  This will also tell node how to construct the dummy data the first time the route is requested.  It's simply an array of functions that return string representations of json objects laced with dummy json notation.
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
		name: 'myFirstRoute',
		mockRoute: '/api/foo',
		testScope: 'success',
		testScenario: 1,
		latency: 300,
		jsonTemplate: [
			function() { return //Scenario 0
				'{'+
					'"people": ['+
					'{{#repeat 2}} {'+
						'"id": {{index}},'+
						'"firstName": "{{firstName}}",'+
						'"lastName": "{{lastName}}",'+
						'"email": "{{email}}",'+
						'"work": "{{company}}",'+
						'"age": {{number 20 50}},'+
						'"optedin": {{boolean}}'+
					'} {{/repeat}}],'+
					'"images": ['+
						'{{#repeat 3 6}}'+
							'"img{{index}}.png"'+
						'{{/repeat}} ],'+
					'"revision": {{uniqueIndex}},'+
					'"tolerance": {{number '0' '2'}},'+
				'}'; 
			},
			function() { return //Scenario 1
				'{'+
					'"people": ['+
						'{{#repeat 300}} {'+
							'"id": {{index}},'+
							'"firstName": "{{firstName}}",'+
							'"lastName": "{{lastName}}",'+
							'"email": "{{email}}",'+
							'"work": "{{company}}",'+
							'"age": {{number 18 35}},'+
							'"optedin": {{boolean}}'+
						'} {{/repeat}}],'+
					'"images": ['+
						'{{#repeat 6 9}}'+
							'"img{{index}}.png"'+
						'{{/repeat}} ],'+
					'"revision": {{uniqueIndex}},'+
					'"tolerance": {{number '0' '2'}},'+
				'}'; 
            		};]
        },
        {
		name: 'anotherRoute',
		mockRoute: '/api/bar',
		testScope: 'fail',
		jsonTemplate: [ function() { return 
			'{' +
				'"name": "{{firstName}}",'+
				'"age": {{number 18 65}}'+
			'}'; 
		};]
        },
        {
		name: 'routeUsingCustomData',
		mockRoute: '/api/customData',
		testScope: 'success',
		latency: '300-7000',
		data: {
			drawers: [
				{name: 'Drawer 1', id: '1'}, 
				{name: 'Drawer 2', id: '2'}, 
				{name: 'Drawer 3', id: '3'}, 
				{name: 'Drawer 4', id: '4'}],
			attributes: [{
					PropertyType: 0, 
					DisplayName: 'Bool', 
					Id: 'ir:attrdef_1'
				},
				{
					PropertyType: 3, 
					DisplayName: 'Date', 
					Id: 'ir:attrdef_2'
				},
				{
					PropertyType: 6, 
					DisplayName: 'String', 
					Id: 'ir:attrdef_3'
				},
				{
					PropertyType: 6, 
					DisplayName: 'String with choices', 
					Id: 'ir:attrdef_4', 
					Choices: [{
							DisplayName: 'Choice 1', 
							Value: 'Choice 1'
						}, 
						{
							DisplayName: 'Choice 2', 
							Value: 'Choice 2'
						}
					]
				},
				{
					PropertyType: 4, 
					DisplayName: 'Attr Float no min max', 
					Id: 'ir:attrdef_8', 
					MaximumValue: 2147483647, 
					MinimumValue: -2147483648
				},
				{
					PropertyType: 1, 
					DisplayName: 'Attr User', 
					Id: 'ir:attrdef_11', 
					Choices: [{
							DisplayName: 'Corey', 
							Value: 'Corey'
						}, 
						{
							DisplayName: 'Scott', 
							Value: 'Scott'
						}, 
						{
							DisplayName: 'Derek', 
							Value: 'Derek'
						}]
				}]
		},
		jsonTemplate: [ function() { return
			'{' +
				'"drawers":[' +
				'       {{#repeat drawers}}' +
				'       {' +
				'       "fileTypes":' +
				'           [' +
				'               {{#repeat 1 5}}' +
				'               {{number 5}}' +
				'               {{/repeat}}' +
				'           ],' +
				'       "id":"{{this.id}}",' +
				'       "name":"{{this.name}}"' +
				'       }{{/repeat}}' +
				'   ],' +
				'"fileTypes":[' +
				'   {{#repeat 5 8}}' +
				'   	{' +
				'       "attributes":[' +
				'           {{#repeat attributes}}' +
				'           {' +
				'           {{#if this.Choices}}'+
				'           "Choices": [' +
				'           {{#repeat this.Choices}}' +
				'           {"DisplayName": "{{this.DisplayName}}", "Value": "{{this.Value}}"}' +
				'           {{/repeat}}' +
				'           ],' +
				'           {{else}}' +
				'           "Choices": [],' +
				'           {{/if}}' +
				'           {{#if this.MinimumValue}}' +
				'           "MinimumValue":"{{this.MinimumValue}}",' +
				'           {{/if}}' +
				'           {{#if this.MaximumValue}}' +
				'           "MaximumValue":"{{this.MaximumValue}}",' +
				'           {{/if}}' +
				'           "Id":"{{this.Id}}",' +
				'           "DisplayName":"{{this.DisplayName}}",' +
				'           "PropertyType":{{this.PropertyType}}' +
				'           }' +
				'           {{/repeat}}' +
				'       ],' +
				'       "id": "{{uniqueIndex}}",' +
				'       "name": "{{company}}",' +       
				'   	}' +
				'	 {{/repeat}}' +
				']' +
        		'}';
		};
     	     ]
        }
    ]
});

server.use(mockapi.registerRoutes);
server.listen(3001);
```
