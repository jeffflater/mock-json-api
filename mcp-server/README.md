# mock-json-api MCP Server

An MCP (Model Context Protocol) server that provides tools to create, manage, and control mock REST API servers via AI assistants.

## Installation

```bash
cd mcp-server
npm install
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/.config/claude/claude_desktop_config.json` on Linux or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "mock-json-api": {
      "command": "node",
      "args": ["/path/to/mock-json-api/mcp-server/index.js"]
    }
  }
}
```

## Available Tools

### Server Lifecycle

| Tool | Description |
|------|-------------|
| `create_mock_server` | Create a new mock API server with routes configuration |
| `start_server` | Start a server listening on a port |
| `stop_server` | Stop a running server |
| `list_servers` | List all server instances and their status |
| `get_server_info` | Get detailed server information |
| `reset_server` | Reset server state to initial configuration |

### Route Management

| Tool | Description |
|------|-------------|
| `add_route` | Add a new route to an existing server |
| `update_route` | Update an existing route configuration |
| `delete_route` | Delete a route from a server |
| `set_scenario` | Change a route's scenario and/or scope |

### Preset Management

| Tool | Description |
|------|-------------|
| `list_presets` | List available presets |
| `activate_preset` | Activate a preset to switch multiple routes |
| `add_preset` | Add a new preset configuration |

### Testing

| Tool | Description |
|------|-------------|
| `test_route` | Make a test request to a mock route |

## Example Usage

### Create a Mock Server

```javascript
// Via AI assistant
create_mock_server({
  serverId: "my-api",
  routes: [
    {
      name: "getUsers",
      mockRoute: "/api/users",
      method: "GET",
      testScope: "success",
      jsonTemplate: '{"users": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}'
    },
    {
      name: "getUser",
      mockRoute: "/api/users/:id",
      method: "GET",
      testScope: "success",
      jsonTemplate: '{"id": {{request.params.id}}, "name": "{{firstName}}"}'
    },
    {
      name: "createUser",
      mockRoute: "/api/users",
      method: "POST",
      testScope: "created",
      jsonTemplate: '{"id": {{int 100 999}}, "name": "{{request.body.name}}"}'
    }
  ],
  presets: {
    "error-mode": {
      "*": { "scope": "error" }
    },
    "slow-mode": {
      "*": { "latency": "1000-3000" }
    }
  }
})
```

### Start the Server

```javascript
start_server({
  serverId: "my-api",
  port: 3001
})
// Returns: { baseUrl: "http://localhost:3001" }
```

### Test a Route

```javascript
test_route({
  serverId: "my-api",
  path: "/api/users",
  method: "GET"
})
// Returns the mock response
```

### Switch to Error Mode

```javascript
activate_preset({
  serverId: "my-api",
  presetName: "error-mode"
})
// All routes now return 500 errors
```

### Test Individual Route Scenario

```javascript
set_scenario({
  serverId: "my-api",
  routeName: "getUsers",
  scope: "notFound"
})
// getUsers now returns 404
```

## Test Scopes

The following scopes are available for simulating different HTTP responses:

| Scope | HTTP Status | Description |
|-------|-------------|-------------|
| `success` | 200 | OK - returns jsonTemplate |
| `created` | 201 | Created |
| `noContent` | 204 | No Content |
| `badRequest` | 400 | Bad Request |
| `unauthorized` | 401 | Unauthorized |
| `forbidden` | 403 | Forbidden |
| `notFound` | 404 | Not Found |
| `timeout` | 408 | Request Timeout |
| `conflict` | 409 | Conflict |
| `error` | 500 | Internal Server Error |

## JSON Template Syntax

The mock server uses [dummy-json](https://github.com/webroo/dummy-json) for generating dynamic responses:

```javascript
// Random data
'{"id": {{int 1 100}}, "name": "{{firstName}} {{lastName}}"}'

// Repeat data
'{"users": [{{#repeat 5}}{"id": {{@index}}}{{/repeat}}]}'

// Use request data
'{"echo": "{{request.body.message}}", "userId": {{request.params.id}}}'
```

## Resources

The MCP server also exposes resources that can be read:

- `mock-server://{serverId}/config` - Server configuration and status
- `mock-server://{serverId}/routes` - Route definitions

## License

MIT
