# mock-json-api

A Node.js module for creating mock REST APIs with scenario support, perfect for frontend development and E2E testing.

## Features

- **Zero app code changes** - Just point your API URL to the mock server
- **Real HTTP server** - True REST behavior, not browser interception
- **Scenario switching** - Easily switch between test scenarios via query params or API
- **State persistence** - Optional JSON file storage simulating a database
- **State reset** - Reset all state between test runs via `POST /_reset`
- **CORS enabled** - Works out of the box with frontend dev servers
- **Body parsing** - JSON and URL-encoded body parsing included
- **Route parameters** - Express-style route params (e.g., `/api/users/:id`)
- **Dummy data generation** - Uses [dummy-json](https://github.com/webroo/dummy-json) for realistic test data

## Installation

```bash
npm install mock-json-api
```

## Quick Start

```javascript
const mock = require('mock-json-api');

const mockApi = mock({
    jsonStore: './data.json', // Optional: persist data to file
    mockRoutes: [
        {
            name: 'getUsers',
            mockRoute: '/api/users',
            method: 'GET',
            testScope: 'success',
            jsonTemplate: '{ "users": [{{#repeat 5}}{ "id": {{@index}}, "name": "{{firstName}}" }{{/repeat}}] }'
        },
        {
            name: 'getUser',
            mockRoute: '/api/users/:id',  // Route parameters supported!
            method: 'GET',
            testScope: 'success',
            jsonTemplate: (req) => JSON.stringify({ id: req.params.id, name: 'John' })
        },
        {
            name: 'createUser',
            mockRoute: '/api/users',
            method: 'POST',
            testScope: 'success',
            jsonTemplate: (req) => JSON.stringify({ id: 1, name: req.body.name })
        }
    ]
});

const app = mockApi.createServer();
app.listen(3001, () => console.log('Mock API running on port 3001'));
```

## Configuration

### Top-level options

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `mockRoutes` | Array | Yes | Array of route configurations |
| `jsonStore` | String | No | File path for data persistence |
| `cors` | Boolean/Object | No | CORS settings (default: enabled) |

### Route options

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | Unique identifier for the route |
| `mockRoute` | String | URL pattern (supports Express params like `:id` or regex) |
| `method` | String | HTTP method: GET, POST, PUT, DELETE, PATCH |
| `testScope` | String | Response behavior (see Test Scopes below) |
| `testScenario` | Number/String/Function | Which scenario template to use |
| `jsonTemplate` | String/Function/Array | Response template(s) |
| `latency` | Number/String | Response delay in ms (e.g., `300` or `"200-500"`) |
| `errorBody` | Any | Custom error response body |
| `data` | Object | Custom data for dummy-json templates |
| `helpers` | Object | Custom dummy-json helper functions |

### Test Scopes

| Scope | Status Code | Description |
|-------|-------------|-------------|
| `success` | 200 | Successful response with template data |
| `created` | 201 | Resource created |
| `noContent` | 204 | Success with no body |
| `badRequest` | 400 | Bad request error |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Access denied |
| `notFound` | 404 | Resource not found |
| `timeout` | 408 | Request timeout |
| `conflict` | 409 | Conflict error |
| `error` | 500 | Internal server error |

## API Endpoints

### Reset State

Reset all data and route configurations to initial state:

```
POST /_reset
```

Response:
```json
{ "success": true, "message": "Mock server state reset" }
```

### Set Route Scenario

Change a route's scenario programmatically:

```
POST /_scenario
Content-Type: application/json

{ "name": "getUsers", "scenario": 1, "scope": "success" }
```

## Scenarios

Define multiple response scenarios for a route:

```javascript
{
    name: 'getUsers',
    mockRoute: '/api/users',
    method: 'GET',
    testScope: 'success',
    testScenario: 0,  // Default scenario
    jsonTemplate: [
        // Scenario 0: Few users
        () => '{ "users": [{{#repeat 2}}{ "name": "{{firstName}}" }{{/repeat}}] }',
        // Scenario 1: Many users
        () => '{ "users": [{{#repeat 100}}{ "name": "{{firstName}}" }{{/repeat}}] }',
        // Named scenario
        { 'empty': () => '{ "users": [] }' }
    ]
}
```

### Switching scenarios

**Via query parameter:**
```
GET /api/users?scenario=1
GET /api/users?scenario=empty
```

**Via API:**
```
POST /_scenario
{ "name": "getUsers", "scenario": "empty" }
```

## Route Parameters

Use Express-style route parameters:

```javascript
{
    name: 'getUser',
    mockRoute: '/api/users/:id',
    method: 'GET',
    testScope: 'success',
    jsonTemplate: (req) => JSON.stringify({
        id: req.params.id,
        name: 'User ' + req.params.id
    })
}
```

Multiple parameters work too:

```javascript
{
    name: 'getTeamPlayer',
    mockRoute: '/api/teams/:teamId/players/:playerId',
    method: 'GET',
    testScope: 'success',
    jsonTemplate: (req) => JSON.stringify({
        teamId: req.params.teamId,
        playerId: req.params.playerId
    })
}
```

## Request Body Access

POST/PUT request bodies are automatically parsed:

```javascript
{
    name: 'createUser',
    mockRoute: '/api/users',
    method: 'POST',
    testScope: 'success',
    jsonTemplate: (req) => JSON.stringify({
        id: Date.now(),
        name: req.body.name,
        email: req.body.email
    })
}
```

## E2E Testing Example

```javascript
// In your E2E test setup
beforeEach(async () => {
    // Reset mock server state before each test
    await fetch('http://localhost:3001/_reset', { method: 'POST' });
});

test('shows empty state when no users', async () => {
    // Switch to empty scenario
    await fetch('http://localhost:3001/_scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'getUsers', scenario: 'empty' })
    });

    // Run your test...
});

test('handles server error gracefully', async () => {
    // Switch to error scope
    await fetch('http://localhost:3001/_scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'getUsers', scope: 'error' })
    });

    // Run your test...
});
```

## CORS Configuration

CORS is enabled by default. To customize or disable:

```javascript
// Disable CORS
const mockApi = mock({
    cors: false,
    mockRoutes: [...]
});

// Custom CORS options
const mockApi = mock({
    cors: {
        origin: 'http://localhost:5173',
        credentials: true
    },
    mockRoutes: [...]
});
```

## Legacy Middleware Usage

For backward compatibility, you can still use `registerRoutes` as middleware:

```javascript
const express = require('express');
const mock = require('mock-json-api');

const app = express();
app.use(express.json());

const mockApi = mock({
    mockRoutes: [...]
});

app.use(mockApi.registerRoutes.bind(mockApi));
app.listen(3001);
```

However, `createServer()` is recommended as it includes CORS and body parsing automatically.

## License

MIT
