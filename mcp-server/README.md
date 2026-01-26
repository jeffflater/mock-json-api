# mock-json-api MCP Server

An MCP (Model Context Protocol) server that provides tools to create, manage, and control mock REST API servers via AI assistants.

## Installation

```bash
cd mcp-server
npm install
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mock-json-api": {
      "command": "node",
      "args": ["/absolute/path/to/mock-json-api/mcp-server/index.js"]
    }
  }
}
```

Restart Claude Desktop after configuration.

### Other MCP Clients

The server uses stdio transport. Start with:

```bash
node /path/to/mcp-server/index.js
```

## Available Tools

### Server Lifecycle

| Tool | Description |
|------|-------------|
| `create_mock_server` | Create a new mock API server with routes configuration |
| `start_server` | Start a server listening on a port (1024-65535) |
| `stop_server` | Stop a running server gracefully |
| `destroy_server` | Stop and completely remove a server instance |
| `list_servers` | List all server instances and their status |
| `get_server_info` | Get detailed server information including routes |
| `reset_server` | Reset server state to initial configuration |

### Route Management

| Tool | Description |
|------|-------------|
| `add_route` | Add a new route to an existing server |
| `update_route` | Update an existing route's configuration |
| `delete_route` | Delete a route from a server |
| `set_scenario` | Change a route's scenario and/or scope |

### Preset Management

| Tool | Description |
|------|-------------|
| `list_presets` | List available presets for a server |
| `activate_preset` | Activate a preset (use "default" to reset) |
| `add_preset` | Add a new preset configuration |

### Testing

| Tool | Description |
|------|-------------|
| `test_route` | Make a test HTTP request and return the response |

## Usage Examples

### Create a Mock Server

```javascript
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
      jsonTemplate: '{"id": "{{request.params.id}}", "name": "{{firstName}}"}'
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
    "error-mode": { "*": { "scope": "error" } },
    "slow-mode": { "*": { "latency": "1000-3000" } }
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
// Returns the mock response with status and body
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

### Add Route Dynamically

```javascript
add_route({
  serverId: "my-api",
  route: {
    name: "updateUser",
    mockRoute: "/api/users/:id",
    method: "PUT",
    testScope: "success",
    jsonTemplate: '{"id": "{{request.params.id}}", "updated": true}'
  }
})
```

## Test Scopes

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
'{"echo": "{{request.body.message}}", "userId": "{{request.params.id}}"}'
```

## Resources

The MCP server exposes resources for each server:

| URI Pattern | Description |
|-------------|-------------|
| `mock-server://{serverId}/config` | Server configuration and status |
| `mock-server://{serverId}/routes` | Route definitions |

## Limits

| Limit | Value |
|-------|-------|
| Maximum servers | 100 |
| Maximum routes per server | 1000 |
| Server ID length | 100 characters |
| Server shutdown timeout | 30 seconds |
| Valid port range | 1024-65535 |

## Error Handling

All tools return standardized responses:

**Success:**
```json
{
  "success": true,
  "message": "Operation completed",
  "...": "additional data"
}
```

**Error:**
```json
{
  "error": true,
  "message": "Error description"
}
```

## Graceful Shutdown

The MCP server handles SIGTERM and SIGINT signals, gracefully stopping all running mock servers before exiting.

## Troubleshooting

### Server won't start
- Check if the port is already in use
- Ensure port is in valid range (1024-65535)
- Use `list_servers` to check existing servers

### Routes not matching
- Parameterized routes (`:id`) are matched before regex routes
- Route matching is case-insensitive
- Use `get_server_info` to verify route configuration

### MCP connection issues
- Verify the path in claude_desktop_config.json is absolute
- Ensure Node.js is installed and in PATH
- Check server starts manually: `node index.js`

## License

MIT
