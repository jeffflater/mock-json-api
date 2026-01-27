# mock-json-api Skills for LLM Agents

> **Purpose**: This skills file teaches LLM agents how to effectively use mock-json-api for creating stateless mock REST APIs.

## Core Philosophy: Stateless by Design

**CRITICAL**: mock-json-api is a **stateless** mock server. It does NOT persist or track state between requests.

- **Never** use `jsonStore` for state management in production mocks
- **Always** use **scenarios** to represent different application states
- Think of scenarios as "snapshots" of what the API would return in various conditions
- Each scenario represents a complete, predefined response—not a mutation of state

### Why Stateless?

1. **Predictable**: Same scenario always returns the same response
2. **Parallel-safe**: Multiple tests can run simultaneously without interference
3. **Debuggable**: No hidden state to track down
4. **Fast**: No file I/O or database operations

---

## Quick Start: Creating a Stateless Mock API

### Basic Structure

```javascript
const mock = require('mock-json-api');

const mockApi = mock({
  mockRoutes: [
    {
      name: 'getUsers',
      mockRoute: '/api/users',
      method: 'GET',
      testScope: 'success',
      testScenario: 0,  // Default scenario
      jsonTemplate: [
        // Scenario 0: Standard user list
        '{"users": [{{#repeat 3}}{"id": {{@index}}, "name": "{{firstName}}"}{{/repeat}}]}',
        // Scenario 1: Empty state (new user)
        '{"users": []}',
        // Scenario 2: Large dataset
        '{"users": [{{#repeat 100}}{"id": {{@index}}, "name": "{{firstName}}"}{{/repeat}}]}',
        // Named scenario for clarity
        { 'single-user': '{"users": [{"id": 1, "name": "Test User"}]}' }
      ]
    }
  ]
});

const app = mockApi.createServer();
app.listen(3001);
```

---

## Scenarios: The Key to Stateless Mocking

### What Scenarios Represent

Scenarios are **not** mutations—they are **complete state snapshots**:

| Scenario Purpose | What It Represents |
|------------------|-------------------|
| `empty` | State after user deletes all items |
| `single-item` | State with exactly one item |
| `many-items` | State after creating many items |
| `after-create` | What GET returns after a successful POST |
| `after-delete` | What GET returns after a successful DELETE |
| `validation-error` | Response when POST data is invalid |

### Defining Multiple Scenarios

```javascript
{
  name: 'getTodos',
  mockRoute: '/api/todos',
  method: 'GET',
  testScope: 'success',
  testScenario: 'default',
  jsonTemplate: [
    // Array index scenarios (0, 1, 2...)
    '{"todos": []}',                                    // 0: empty
    '{"todos": [{"id": 1, "text": "First todo"}]}',    // 1: single
    '{"todos": [{{#repeat 10}}{"id": {{@index}}}{{/repeat}}]}', // 2: many

    // Named scenarios (recommended for clarity)
    { 'default': '{"todos": [{"id": 1, "text": "Sample"}]}' },
    { 'empty': '{"todos": []}' },
    { 'after-create': '{"todos": [{"id": 1}, {"id": 2, "text": "New!"}]}' },
    { 'completed-all': '{"todos": [{"id": 1, "done": true}]}' }
  ]
}
```

### Switching Scenarios

**Via Query Parameter** (for manual testing):
```
GET /api/todos?scenario=empty
GET /api/todos?scenario=after-create
```

**Via API Endpoint** (for automated tests):
```http
POST /_scenario
Content-Type: application/json

{"name": "getTodos", "scenario": "after-create"}
```

**Via MCP Tool** (for AI-controlled testing):
```javascript
set_scenario({
  serverId: "my-api",
  routeName: "getTodos",
  scenario: "after-create"
})
```

---

## Simulating CRUD Operations Statelessly

### The Pattern: Pair Actions with State Scenarios

For each mutation (POST/PUT/DELETE), define a corresponding GET scenario that shows what the data would look like *after* that mutation:

```javascript
const mockApi = mock({
  mockRoutes: [
    // READ - Multiple state scenarios
    {
      name: 'listItems',
      mockRoute: '/api/items',
      method: 'GET',
      testScope: 'success',
      jsonTemplate: [
        { 'initial': '{"items": [{"id": 1, "name": "Item 1"}]}' },
        { 'after-create': '{"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "New Item"}]}' },
        { 'after-delete': '{"items": []}' },
        { 'after-update': '{"items": [{"id": 1, "name": "Updated Name"}]}' }
      ]
    },

    // CREATE - Returns the created item
    {
      name: 'createItem',
      mockRoute: '/api/items',
      method: 'POST',
      testScope: 'created',
      jsonTemplate: '{"id": 2, "name": "{{request.body.name}}"}'
    },

    // UPDATE - Returns the updated item
    {
      name: 'updateItem',
      mockRoute: '/api/items/:id',
      method: 'PUT',
      testScope: 'success',
      jsonTemplate: '{"id": "{{request.params.id}}", "name": "{{request.body.name}}"}'
    },

    // DELETE - No content response
    {
      name: 'deleteItem',
      mockRoute: '/api/items/:id',
      method: 'DELETE',
      testScope: 'noContent'
    }
  ]
});
```

### Test Flow Example

```javascript
describe('Item management', () => {
  beforeEach(async () => {
    // Reset to initial state
    await fetch('http://localhost:3001/_scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'listItems', scenario: 'initial' })
    });
  });

  test('create item flow', async () => {
    // 1. POST creates the item
    const createRes = await fetch('http://localhost:3001/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Item' })
    });
    expect(createRes.status).toBe(201);

    // 2. Switch to "after-create" scenario to simulate state change
    await fetch('http://localhost:3001/_scenario', {
      method: 'POST',
      body: JSON.stringify({ name: 'listItems', scenario: 'after-create' })
    });

    // 3. GET now returns updated list
    const listRes = await fetch('http://localhost:3001/api/items');
    const data = await listRes.json();
    expect(data.items).toHaveLength(2);
  });
});
```

---

## Presets: Coordinate Multiple Route States

Presets switch multiple routes' scenarios at once—perfect for representing complex application states:

```javascript
const mockApi = mock({
  mockRoutes: [...],
  presets: {
    // Happy path - everything works
    'happy-path': {
      'listItems': { scenario: 'has-items' },
      'getUser': { scenario: 'authenticated' },
      'getCart': { scenario: 'with-items' }
    },

    // New user - empty everything
    'new-user': {
      'listItems': { scenario: 'empty' },
      'getUser': { scenario: 'authenticated' },
      'getCart': { scenario: 'empty' }
    },

    // Error states for testing error handling
    'all-errors': {
      '*': { scope: 'error' }  // Wildcard applies to all routes
    },

    // Authentication failure
    'logged-out': {
      'getUser': { scope: 'unauthorized' },
      'getCart': { scope: 'unauthorized' },
      'listItems': { scope: 'unauthorized' }
    },

    // Slow network simulation
    'slow-network': {
      '*': { latency: '1000-3000' }
    },

    // After checkout completion
    'post-checkout': {
      'getCart': { scenario: 'empty' },
      'getOrders': { scenario: 'with-recent-order' }
    }
  }
});
```

### Activating Presets

```http
POST /_preset
Content-Type: application/json

{"name": "new-user"}
```

Or via MCP:
```javascript
activate_preset({ serverId: "my-api", presetName: "new-user" })
```

---

## Test Scopes Reference

Use `testScope` to control HTTP status codes:

| Scope | Status | When to Use |
|-------|--------|-------------|
| `success` | 200 | GET requests, successful updates |
| `created` | 201 | POST that creates a resource |
| `noContent` | 204 | DELETE requests, updates with no response body |
| `badRequest` | 400 | Invalid request data, validation errors |
| `unauthorized` | 401 | Missing or invalid authentication |
| `forbidden` | 403 | Authenticated but not authorized |
| `notFound` | 404 | Resource doesn't exist |
| `timeout` | 408 | Simulating timeout scenarios |
| `conflict` | 409 | Duplicate resource, version conflict |
| `error` | 500 | Server errors |

### Dynamic Scope Changes

Switch scopes to test error handling:

```javascript
// In test setup, trigger 404 for getUser
await fetch('http://localhost:3001/_scenario', {
  method: 'POST',
  body: JSON.stringify({ name: 'getUser', scope: 'notFound' })
});

// Test that app handles missing user gracefully
```

---

## MCP Tools for AI Agents

When controlling mock-json-api via MCP, use these tools:

### Server Lifecycle

```javascript
// Create server with routes
create_mock_server({
  serverId: "test-api",
  routes: [/* route definitions */],
  presets: {/* preset definitions */}
})

// Start listening
start_server({ serverId: "test-api", port: 3001 })

// Stop when done
stop_server({ serverId: "test-api" })

// Remove completely
destroy_server({ serverId: "test-api" })
```

### State Management (via Scenarios)

```javascript
// Switch individual route scenario
set_scenario({
  serverId: "test-api",
  routeName: "listUsers",
  scenario: "empty"
})

// Switch multiple routes via preset
activate_preset({
  serverId: "test-api",
  presetName: "error-mode"
})

// Reset all routes to initial scenarios
reset_server({ serverId: "test-api" })
```

### Testing Routes

```javascript
// Make a test request
test_route({
  serverId: "test-api",
  path: "/api/users",
  method: "GET"
})

// With body
test_route({
  serverId: "test-api",
  path: "/api/users",
  method: "POST",
  body: { name: "New User" }
})

// With scenario override
test_route({
  serverId: "test-api",
  path: "/api/users?scenario=empty",
  method: "GET"
})
```

---

## Common Patterns

### Pattern 1: Paginated Lists

```javascript
{
  name: 'listUsers',
  mockRoute: '/api/users',
  method: 'GET',
  testScope: 'success',
  jsonTemplate: (req) => {
    const page = req.query.page || 1;
    const scenarios = {
      1: '{"users": [{{#repeat 10}}{"id": {{@index}}}{{/repeat}}], "page": 1, "hasMore": true}',
      2: '{"users": [{{#repeat 10}}{"id": {{add @index 10}}}{{/repeat}}], "page": 2, "hasMore": true}',
      3: '{"users": [{{#repeat 5}}{"id": {{add @index 20}}}{{/repeat}}], "page": 3, "hasMore": false}'
    };
    return scenarios[page] || scenarios[1];
  }
}
```

### Pattern 2: Error Scenarios per Route

```javascript
{
  name: 'createUser',
  mockRoute: '/api/users',
  method: 'POST',
  testScope: 'created',  // Default
  jsonTemplate: [
    { 'success': '{"id": {{int 1 999}}, "name": "{{request.body.name}}"}' },
    { 'duplicate': '{"error": "User already exists"}' },
    { 'invalid': '{"error": "Invalid email format"}' }
  ]
},

// For duplicate error test:
// 1. set_scenario({ routeName: 'createUser', scenario: 'duplicate', scope: 'conflict' })
// 2. POST /api/users -> returns 409 with error message
```

### Pattern 3: Authentication States

```javascript
presets: {
  'authenticated': {
    'getCurrentUser': { scenario: 'logged-in', scope: 'success' },
    'getProfile': { scope: 'success' },
    'getSettings': { scope: 'success' }
  },
  'guest': {
    'getCurrentUser': { scope: 'unauthorized' },
    'getProfile': { scope: 'unauthorized' },
    'getSettings': { scope: 'unauthorized' }
  },
  'expired-session': {
    'getCurrentUser': { scenario: 'expired', scope: 'unauthorized' },
    '*': { scope: 'unauthorized' }
  }
}
```

### Pattern 4: Latency Testing

```javascript
presets: {
  'instant': {
    '*': { latency: 0 }
  },
  'realistic': {
    '*': { latency: '50-200' }
  },
  'slow-3g': {
    '*': { latency: '1000-3000' }
  },
  'timeout-prone': {
    '*': { latency: '5000-10000' }
  }
}
```

---

## Anti-Patterns to Avoid

### DON'T: Use jsonStore for "State"

```javascript
// BAD - Creates actual state
const mockApi = mock({
  jsonStore: './data.json',  // Avoid this!
  mockRoutes: [...]
});
```

### DON'T: Expect POST to Affect GET

```javascript
// BAD - This won't work!
// POST /api/users creates a user
// GET /api/users still returns the same scenario data
```

### DO: Use Scenarios for State Transitions

```javascript
// GOOD - Explicit state management
// 1. POST /api/users (returns created user)
// 2. set_scenario({ routeName: 'listUsers', scenario: 'after-create' })
// 3. GET /api/users (now returns updated list)
```

---

## Dummy-JSON Template Helpers

Use these in `jsonTemplate` for realistic data:

| Helper | Example | Output |
|--------|---------|--------|
| `{{firstName}}` | `"{{firstName}}"` | `"John"` |
| `{{lastName}}` | `"{{lastName}}"` | `"Smith"` |
| `{{email}}` | `"{{email}}"` | `"john@example.com"` |
| `{{company}}` | `"{{company}}"` | `"Acme Corp"` |
| `{{int min max}}` | `{{int 1 100}}` | `42` |
| `{{float min max}}` | `{{float 0 1}}` | `0.73` |
| `{{boolean}}` | `{{boolean}}` | `true` |
| `{{date}}` | `"{{date}}"` | `"2023-05-15"` |
| `{{#repeat n}}...{{/repeat}}` | See below | Array of items |
| `{{@index}}` | Inside repeat | Current index |
| `{{request.params.id}}` | Route param | URL parameter value |
| `{{request.body.name}}` | Request body | Posted JSON field |
| `{{request.query.filter}}` | Query string | Query parameter |

### Repeat Example

```javascript
'{"items": [{{#repeat 5}}{"id": {{@index}}, "name": "Item {{@index}}"}{{/repeat}}]}'
// Output: {"items": [{"id": 0, "name": "Item 0"}, {"id": 1, "name": "Item 1"}, ...]}
```

---

## Summary: The Stateless Mindset

1. **Define scenarios** for every meaningful state your API can return
2. **Use presets** to coordinate multi-route state changes
3. **Switch scenarios explicitly** in tests when simulating state transitions
4. **Never rely on** POST/PUT/DELETE actually changing what GET returns
5. **Think declaratively**: "What would the API return if..." → create a scenario for it
