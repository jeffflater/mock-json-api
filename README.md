# mock-json-api

[![npm version](https://badge.fury.io/js/mock-json-api.svg)](https://www.npmjs.com/package/mock-json-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Node.js module for creating mock REST APIs with scenario support, perfect for frontend development and E2E testing.

## Features

- **Zero app code changes** - Just point your API URL to the mock server
- **Real HTTP server** - True REST behavior, not browser interception
- **Scenario switching** - Easily switch between test scenarios via query params or API
- **Presets** - Define named configurations to switch entire experiences at once
- **State persistence** - Optional JSON file storage simulating a database
- **State reset** - Reset all state between test runs via `POST /_reset`
- **CORS enabled** - Works out of the box with frontend dev servers
- **Body parsing** - JSON and URL-encoded body parsing included
- **Flexible routing** - Regex patterns or Express-style params (`:id`)
- **Dummy data generation** - Uses [dummy-json](https://github.com/webroo/dummy-json) for realistic test data
- **Latency simulation** - Add delays to simulate network conditions

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
| `presets` | Object | No | Named preset configurations (see Presets) |

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

## Route Matching

### Regex Routes (Original)

The `mockRoute` property is a **regex pattern** by default:

```javascript
// Matches /api/users, /api/users/, /api/users/123, etc.
{ mockRoute: '/api/users' }

// Exact match only
{ mockRoute: '^/api/users$' }

// Match any path under /api/
{ mockRoute: '/api/.*' }

// Match users with numeric ID
{ mockRoute: '/api/users/[0-9]+' }
```

### Parameterized Routes (New)

Routes containing `:param` use Express-style matching with automatic parameter extraction:

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

Multiple parameters:

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

**Note:** Parameterized routes are checked before regex routes, so you can have both:
- `/api/users/:id` - matches `/api/users/123` (checked first)
- `/api/users` - matches `/api/users` base path

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

## Presets

Presets allow you to define named configurations that set multiple routes' scenarios and scopes at once. This is useful for quickly switching between different "experiences" like happy path, error states, or new user flows.

### Defining Presets

```javascript
const mockApi = mock({
    mockRoutes: [
        { name: 'getUsers', mockRoute: '/api/users', method: 'GET', testScope: 'success', testScenario: 0, jsonTemplate: [...] },
        { name: 'getUser', mockRoute: '/api/users/:id', method: 'GET', testScope: 'success', jsonTemplate: '...' },
        { name: 'createUser', mockRoute: '/api/users', method: 'POST', testScope: 'created', jsonTemplate: '...' },
        { name: 'getOrders', mockRoute: '/api/orders', method: 'GET', testScope: 'success', jsonTemplate: '...' }
    ],
    presets: {
        'happy-path': {
            'getUsers': { scenario: 'many', scope: 'success' },
            'getUser': { scope: 'success' },
            'createUser': { scope: 'created' }
        },
        'new-user': {
            'getUsers': { scenario: 'empty' },
            'getUser': { scope: 'notFound' }
        },
        'error-mode': {
            'getUsers': { scope: 'error' },
            'createUser': { scope: 'badRequest' }
        },
        'slow-network': {
            '*': { latency: 2000 }  // Wildcard applies to all routes
        }
    }
});
```

### Preset Route Configuration

Each route in a preset can set:

| Property | Type | Description |
|----------|------|-------------|
| `scenario` | Number/String | The scenario to use for this route |
| `scope` | String | The test scope (success, error, notFound, etc.) |
| `latency` | Number/String | Response delay in ms |

### Pattern Matching

Presets support pattern matching for route names:

| Pattern | Description | Example |
|---------|-------------|---------|
| `routeName` | Exact match | `'getUsers'` matches only `getUsers` |
| `prefix*` | Prefix match | `'getUser*'` matches `getUsers`, `getUser`, `getUserById` |
| `*` | All routes | `'*'` matches every route |

### Activating a Preset

**Via API:**
```
POST /_preset
Content-Type: application/json

{ "name": "happy-path" }
```

Response:
```json
{
    "success": true,
    "preset": "happy-path",
    "message": "Preset 'happy-path' activated",
    "routesUpdated": 3
}
```

### Resetting to Default

Send `null` or `"default"` as the name to reset all routes to their original configuration:

```
POST /_preset
Content-Type: application/json

{ "name": null }
```

or

```
POST /_preset
Content-Type: application/json

{ "name": "default" }
```

### Getting Available Presets

```
GET /_preset
```

Response:
```json
{
    "active": "happy-path",
    "available": ["happy-path", "new-user", "error-mode", "slow-network"]
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

## Dummy-JSON Templates

Templates use [dummy-json](https://github.com/webroo/dummy-json) syntax for generating realistic test data:

```javascript
jsonTemplate: `{
    "users": [
        {{#repeat 5}}
        {
            "id": {{@index}},
            "firstName": "{{firstName}}",
            "lastName": "{{lastName}}",
            "email": "{{email}}",
            "company": "{{company}}",
            "age": {{int 18 65}},
            "isActive": {{boolean}}
        }
        {{/repeat}}
    ],
    "total": {{int 100 500}}
}`
```

### Available Helpers

| Helper | Example | Output |
|--------|---------|--------|
| `{{firstName}}` | - | "John" |
| `{{lastName}}` | - | "Smith" |
| `{{email}}` | - | "john@example.com" |
| `{{company}}` | - | "Acme Corp" |
| `{{int min max}}` | `{{int 1 100}}` | 42 |
| `{{float min max}}` | `{{float 0 1}}` | 0.73 |
| `{{boolean}}` | - | true |
| `{{date}}` | - | "2023-05-15" |
| `{{time}}` | - | "14:30:00" |
| `{{#repeat count}}` | `{{#repeat 3}}...{{/repeat}}` | Repeats content |

### Custom Data

Pass your own data to templates:

```javascript
{
    name: 'getConfig',
    mockRoute: '/api/config',
    method: 'GET',
    testScope: 'success',
    data: {
        regions: ['US', 'EU', 'APAC'],
        features: { darkMode: true, beta: false }
    },
    jsonTemplate: `{
        "regions": [{{#each regions}}"{{this}}"{{#unless @last}},{{/unless}}{{/each}}],
        "features": {
            "darkMode": {{features.darkMode}},
            "beta": {{features.beta}}
        }
    }`
}
```

## Latency Simulation

Simulate network delays:

```javascript
{
    name: 'slowEndpoint',
    mockRoute: '/api/slow',
    method: 'GET',
    testScope: 'success',
    latency: 2000,  // Fixed 2 second delay
    jsonTemplate: '{ "message": "Finally!" }'
}

{
    name: 'variableLatency',
    mockRoute: '/api/variable',
    method: 'GET',
    testScope: 'success',
    latency: '500-3000',  // Random delay between 500ms and 3s
    jsonTemplate: '{ "message": "Done" }'
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

### Using Presets in E2E Tests

Presets make it easy to set up complex test scenarios with a single API call:

```javascript
describe('New user onboarding', () => {
    beforeEach(async () => {
        // Activate the new-user preset - sets up empty lists, not found states, etc.
        await fetch('http://localhost:3001/_preset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'new-user' })
        });
    });

    test('shows onboarding flow for new users', async () => {
        // All routes are now configured for new user experience
        // Run your test...
    });
});

describe('Error handling', () => {
    beforeEach(async () => {
        // Activate error-mode preset
        await fetch('http://localhost:3001/_preset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'error-mode' })
        });
    });

    test('shows error states correctly', async () => {
        // All routes are now configured to return errors
        // Run your test...
    });
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

## Upgrading to 0.3.0

Version 0.3.0 introduces several improvements while maintaining backward compatibility:

**New features:**
- `createServer()` method - recommended way to start the server
- `POST /_reset` endpoint for E2E test isolation
- Built-in CORS support
- Built-in body parsing
- Express-style route parameters (`:id`)
- `created` test scope (201 status)
- **Presets** - Define named configurations to switch entire experiences at once via `POST /_preset`

**Breaking changes:**
- None - existing code continues to work

**Deprecated:**
- Using `registerRoutes` directly without body parsing middleware

## License

MIT
