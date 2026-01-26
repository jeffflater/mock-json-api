# AI Agent Installation Guide

> **For AI Assistants**: This document provides instructions for installing and configuring mock-json-api when a user asks you to set it up.

## Quick Reference

| Component | Purpose | Installation |
|-----------|---------|--------------|
| **mock-json-api** | Node.js library for creating mock REST APIs | `npm install mock-json-api` |
| **MCP Server** | Control mock APIs via AI assistants (Claude, etc.) | See MCP Setup below |

---

## Installation Instructions

### Step 1: Install the Mock Server Library

```bash
npm install mock-json-api
```

Or add to package.json:
```json
{
  "dependencies": {
    "mock-json-api": "^0.5.0"
  }
}
```

### Step 2: Create a Basic Mock Server

Create a file (e.g., `mock-server.js`):

```javascript
const mock = require('mock-json-api');

const mockApi = mock({
  mockRoutes: [
    {
      name: 'getUsers',
      mockRoute: '/api/users',
      method: 'GET',
      testScope: 'success',
      jsonTemplate: '{"users": [{"id": 1, "name": "{{firstName}}"}]}'
    }
  ]
});

const app = mockApi.createServer();
app.listen(3001, () => console.log('Mock API running on http://localhost:3001'));
```

Run it:
```bash
node mock-server.js
```

---

## MCP Server Setup (For AI Control)

The MCP server allows AI assistants to create and control mock APIs dynamically.

### Step 1: Install MCP Server Dependencies

```bash
cd /path/to/mock-json-api/mcp-server
npm install
```

### Step 2: Configure Claude Desktop

Add to Claude Desktop config file:

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

### Step 3: Restart Claude Desktop

The MCP tools will be available after restart.

---

## MCP Tools Reference

Once configured, these tools are available:

### Server Management
| Tool | Description |
|------|-------------|
| `create_mock_server` | Create a mock server with routes |
| `start_server` | Start server on a port |
| `stop_server` | Stop a running server |
| `destroy_server` | Stop and remove server |
| `list_servers` | List all servers |
| `get_server_info` | Get server details |
| `reset_server` | Reset to initial state |

### Route Management
| Tool | Description |
|------|-------------|
| `add_route` | Add a route to a server |
| `update_route` | Update route configuration |
| `delete_route` | Remove a route |
| `set_scenario` | Change route's response behavior |

### Preset Management
| Tool | Description |
|------|-------------|
| `list_presets` | List available presets |
| `activate_preset` | Switch multiple routes at once |
| `add_preset` | Create a new preset |

### Testing
| Tool | Description |
|------|-------------|
| `test_route` | Make HTTP request to mock route |

---

## Example: Create a CRUD API via MCP

When a user asks to create a mock API, use these tools:

```javascript
// 1. Create the server
create_mock_server({
  serverId: "my-api",
  routes: [
    {
      name: "listUsers",
      mockRoute: "/api/users",
      method: "GET",
      testScope: "success",
      jsonTemplate: '{"users": [{{#repeat 3}}{"id": {{@index}}, "name": "{{firstName}}"}{{/repeat}}]}'
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
    },
    {
      name: "deleteUser",
      mockRoute: "/api/users/:id",
      method: "DELETE",
      testScope: "noContent"
    }
  ],
  presets: {
    "all-errors": { "*": { "scope": "error" } },
    "slow-network": { "*": { "latency": "1000-3000" } }
  }
})

// 2. Start the server
start_server({ serverId: "my-api", port: 3001 })

// 3. Test a route
test_route({ serverId: "my-api", path: "/api/users", method: "GET" })
```

---

## Test Scopes (HTTP Status Codes)

| Scope | Status | Use Case |
|-------|--------|----------|
| `success` | 200 | Normal successful response |
| `created` | 201 | Resource created (POST) |
| `noContent` | 204 | Success with no body (DELETE) |
| `badRequest` | 400 | Invalid request data |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Permission denied |
| `notFound` | 404 | Resource not found |
| `timeout` | 408 | Request timeout |
| `conflict` | 409 | Resource conflict |
| `error` | 500 | Server error |

---

## JSON Template Syntax (dummy-json)

Templates use [dummy-json](https://github.com/webroo/dummy-json) helpers:

```javascript
// Random data
'{"id": {{int 1 100}}, "name": "{{firstName}} {{lastName}}"}'

// Repeat data
'{"items": [{{#repeat 5}}{"id": {{@index}}}{{/repeat}}]}'

// Request data access
'{"echo": "{{request.body.message}}", "userId": "{{request.params.id}}"}'

// Available helpers: firstName, lastName, email, company,
// int, float, boolean, date, time, and more
```

---

## Troubleshooting

### MCP Server Not Connecting
1. Verify the path in claude_desktop_config.json is absolute
2. Ensure node is in PATH
3. Check MCP server starts manually: `node /path/to/mcp-server/index.js`

### Routes Not Matching
1. Parameterized routes (`:id`) are matched before regex routes
2. Routes are case-insensitive
3. Use `get_server_info` to verify route configuration

### Port Already in Use
1. Use a different port (1024-65535)
2. Stop other servers: `stop_server({ serverId: "..." })`
3. Check: `lsof -i :PORT` (macOS/Linux) or `netstat -ano | findstr :PORT` (Windows)

---

## Project Structure

```
mock-json-api/
├── mock.js              # Main library
├── index.d.ts           # TypeScript definitions
├── package.json         # Library package
├── README.md            # Library documentation
├── AGENTS.md            # This file (AI installation guide)
└── mcp-server/
    ├── index.js         # MCP server implementation
    ├── package.json     # MCP server package
    └── README.md        # MCP server documentation
```
