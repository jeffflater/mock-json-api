#!/usr/bin/env node

/**
 * MCP Server for mock-json-api
 *
 * Provides tools to create, manage, and control mock REST API servers
 * via the Model Context Protocol.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { match } from 'path-to-regexp';
import { createRequire } from 'module';

// Import mock-json-api (CommonJS module)
const require = createRequire(import.meta.url);
const mock = require('mock-json-api');
const { version } = require('./package.json');

// Constants
const TEST_SCOPES = Object.freeze([
  'success', 'created', 'noContent', 'badRequest',
  'unauthorized', 'forbidden', 'notFound', 'timeout', 'conflict', 'error'
]);

const HTTP_METHODS = Object.freeze(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const MAX_ROUTES_PER_SERVER = 1000;
const MAX_SERVERS = 100;
const SERVER_SHUTDOWN_TIMEOUT = 30000;

// Store for active mock server instances
const servers = new Map();

// Server configuration
const server = new Server(
  {
    name: 'mock-json-api-mcp-server',
    version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * Compile route matcher for parameterized routes
 * @param {object} route - Route configuration
 */
function compileRouteMatcher(route) {
  if (route.mockRoute && !route.mockRoute.includes('(') && route.mockRoute.includes(':')) {
    try {
      route._matcher = match(route.mockRoute, { decode: decodeURIComponent });
      route._isParamRoute = true;
    } catch (e) {
      route._isParamRoute = false;
    }
  } else {
    route._isParamRoute = false;
  }
}

/**
 * Create a standardized success response
 */
function successResponse(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Create a standardized error response
 */
function errorResponse(message) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: true, message }, null, 2) }],
    isError: true,
  };
}

/**
 * Validate server exists
 */
function getServer(serverId) {
  const serverData = servers.get(serverId);
  if (!serverData) {
    throw new Error(`Server "${serverId}" not found`);
  }
  return serverData;
}

/**
 * Validate server ID format
 */
function validateServerId(serverId) {
  if (!serverId || typeof serverId !== 'string') {
    throw new Error('Server ID must be a non-empty string');
  }
  if (serverId.length > 100) {
    throw new Error('Server ID must be 100 characters or less');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) {
    throw new Error('Server ID must contain only alphanumeric characters, hyphens, and underscores');
  }
}

// Tool definitions
const tools = [
  {
    name: 'create_mock_server',
    description: 'Create a new mock API server instance with routes configuration. Returns a server ID that can be used to manage the server.',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: {
          type: 'string',
          description: 'Unique identifier for this mock server instance (alphanumeric, hyphens, underscores only)',
        },
        routes: {
          type: 'array',
          description: 'Array of route configurations',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Unique name for the route' },
              mockRoute: { type: 'string', description: 'URL pattern to match (e.g., "/api/users" or "/api/users/:id")' },
              method: { type: 'string', enum: HTTP_METHODS, description: 'HTTP method' },
              testScope: { type: 'string', enum: TEST_SCOPES, description: 'Response scope determining HTTP status code' },
              jsonTemplate: { type: 'string', description: 'JSON response template (supports dummy-json syntax)' },
              latency: { type: ['number', 'string'], description: 'Response delay in ms or range (e.g., "100-500")' },
            },
            required: ['name', 'mockRoute', 'method'],
          },
        },
        presets: {
          type: 'object',
          description: 'Named presets for switching multiple routes at once',
        },
        logging: {
          type: ['boolean', 'string'],
          description: 'Enable logging (true, false, or "verbose")',
        },
      },
      required: ['serverId', 'routes'],
    },
  },
  {
    name: 'start_server',
    description: 'Start a mock server listening on a specified port',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server to start' },
        port: { type: 'number', description: 'Port number to listen on (1024-65535)' },
      },
      required: ['serverId', 'port'],
    },
  },
  {
    name: 'stop_server',
    description: 'Stop a running mock server',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server to stop' },
      },
      required: ['serverId'],
    },
  },
  {
    name: 'destroy_server',
    description: 'Stop and completely remove a mock server instance',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server to destroy' },
      },
      required: ['serverId'],
    },
  },
  {
    name: 'list_servers',
    description: 'List all mock server instances and their status',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_server_info',
    description: 'Get detailed information about a mock server including routes, presets, and state',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
      },
      required: ['serverId'],
    },
  },
  {
    name: 'add_route',
    description: 'Add a new route to an existing mock server',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
        route: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Unique name for the route' },
            mockRoute: { type: 'string', description: 'URL pattern to match' },
            method: { type: 'string', enum: HTTP_METHODS },
            testScope: { type: 'string', enum: TEST_SCOPES },
            jsonTemplate: { type: 'string' },
            latency: { type: ['number', 'string'] },
          },
          required: ['name', 'mockRoute', 'method'],
        },
      },
      required: ['serverId', 'route'],
    },
  },
  {
    name: 'update_route',
    description: 'Update an existing route configuration',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
        routeName: { type: 'string', description: 'Name of the route to update' },
        updates: {
          type: 'object',
          properties: {
            mockRoute: { type: 'string' },
            method: { type: 'string', enum: HTTP_METHODS },
            testScope: { type: 'string', enum: TEST_SCOPES },
            testScenario: { type: ['string', 'number'] },
            jsonTemplate: { type: 'string' },
            latency: { type: ['number', 'string'] },
          },
        },
      },
      required: ['serverId', 'routeName', 'updates'],
    },
  },
  {
    name: 'delete_route',
    description: 'Delete a route from a mock server',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
        routeName: { type: 'string', description: 'Name of the route to delete' },
      },
      required: ['serverId', 'routeName'],
    },
  },
  {
    name: 'set_scenario',
    description: "Change a route's scenario and/or scope for testing different responses",
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
        routeName: { type: 'string', description: 'Name of the route to update' },
        scope: { type: 'string', enum: TEST_SCOPES, description: 'Response scope (determines HTTP status code)' },
        scenario: { type: ['string', 'number'], description: 'Scenario index or name to activate' },
      },
      required: ['serverId', 'routeName'],
    },
  },
  {
    name: 'list_presets',
    description: 'List available presets for a mock server',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
      },
      required: ['serverId'],
    },
  },
  {
    name: 'activate_preset',
    description: 'Activate a preset to switch multiple routes at once',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
        presetName: { type: 'string', description: 'Name of the preset to activate (use "default" to reset)' },
      },
      required: ['serverId', 'presetName'],
    },
  },
  {
    name: 'add_preset',
    description: 'Add a new preset configuration',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
        presetName: { type: 'string', description: 'Name for the new preset' },
        config: {
          type: 'object',
          description: 'Preset configuration mapping route patterns to settings',
        },
      },
      required: ['serverId', 'presetName', 'config'],
    },
  },
  {
    name: 'reset_server',
    description: 'Reset mock server state to initial configuration',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server to reset' },
      },
      required: ['serverId'],
    },
  },
  {
    name: 'test_route',
    description: 'Make a test request to a mock server route and return the response',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: { type: 'string', description: 'ID of the mock server' },
        path: { type: 'string', description: 'URL path to request (e.g., "/api/users")' },
        method: { type: 'string', enum: HTTP_METHODS, description: 'HTTP method', default: 'GET' },
        body: { type: 'object', description: 'Request body for POST/PUT/PATCH requests' },
        queryParams: { type: 'object', description: 'Query parameters to include' },
      },
      required: ['serverId', 'path'],
    },
  },
];

// Tool handlers
const toolHandlers = {
  async create_mock_server({ serverId, routes, presets, logging }) {
    validateServerId(serverId);

    if (servers.has(serverId)) {
      throw new Error(`Server with ID "${serverId}" already exists`);
    }

    if (servers.size >= MAX_SERVERS) {
      throw new Error(`Maximum number of servers (${MAX_SERVERS}) reached`);
    }

    if (!routes || routes.length === 0) {
      throw new Error('At least one route is required');
    }

    if (routes.length > MAX_ROUTES_PER_SERVER) {
      throw new Error(`Maximum ${MAX_ROUTES_PER_SERVER} routes per server`);
    }

    // Convert routes to mock-json-api format and compile matchers
    const mockRoutes = routes.map(r => {
      const route = {
        name: r.name,
        mockRoute: r.mockRoute,
        method: r.method.toUpperCase(),
        testScope: r.testScope || 'success',
        testScenario: r.testScenario || 0,
        jsonTemplate: r.jsonTemplate || '{}',
        latency: r.latency,
      };
      compileRouteMatcher(route);
      return route;
    });

    const config = {
      mockRoutes,
      presets: presets || {},
      logging: logging || false,
    };

    const mockInstance = mock(config);
    const app = mockInstance.createServer();

    servers.set(serverId, {
      mockInstance,
      app,
      config,
      httpServer: null,
      port: null,
    });

    return successResponse({
      success: true,
      serverId,
      message: `Mock server "${serverId}" created with ${routes.length} route(s)`,
      routes: mockRoutes.map(r => r.name),
      presets: Object.keys(presets || {}),
    });
  },

  async start_server({ serverId, port }) {
    const serverData = getServer(serverId);

    if (serverData.httpServer) {
      throw new Error(`Server "${serverId}" is already running on port ${serverData.port}`);
    }

    if (port < 1024 || port > 65535) {
      throw new Error('Port must be between 1024 and 65535');
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const httpServer = serverData.app.listen(port, () => {
        if (resolved) return;
        resolved = true;
        serverData.httpServer = httpServer;
        serverData.port = port;
        resolve(successResponse({
          success: true,
          serverId,
          port,
          message: `Mock server "${serverId}" started on port ${port}`,
          baseUrl: `http://localhost:${port}`,
        }));
      });

      httpServer.on('error', (err) => {
        if (resolved) return;
        resolved = true;
        reject(new Error(`Failed to start server: ${err.message}`));
      });
    });
  },

  async stop_server({ serverId }) {
    const serverData = getServer(serverId);

    if (!serverData.httpServer) {
      throw new Error(`Server "${serverId}" is not running`);
    }

    return new Promise((resolve, reject) => {
      const port = serverData.port;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        // Force close
        serverData.httpServer.closeAllConnections?.();
        serverData.httpServer = null;
        serverData.port = null;
        resolve(successResponse({
          success: true,
          serverId,
          message: `Mock server "${serverId}" force-stopped after timeout (was on port ${port})`,
          warning: 'Server was force-stopped due to timeout',
        }));
      }, SERVER_SHUTDOWN_TIMEOUT);

      serverData.httpServer.close((err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        if (err) {
          reject(new Error(`Failed to stop server: ${err.message}`));
          return;
        }

        serverData.httpServer = null;
        serverData.port = null;

        resolve(successResponse({
          success: true,
          serverId,
          message: `Mock server "${serverId}" stopped (was on port ${port})`,
        }));
      });
    });
  },

  async destroy_server({ serverId }) {
    const serverData = getServer(serverId);

    // Stop if running
    if (serverData.httpServer) {
      await toolHandlers.stop_server({ serverId });
    }

    servers.delete(serverId);

    return successResponse({
      success: true,
      serverId,
      message: `Mock server "${serverId}" destroyed`,
    });
  },

  async list_servers() {
    const serverList = [];

    for (const [serverId, serverData] of servers) {
      serverList.push({
        serverId,
        status: serverData.httpServer ? 'running' : 'stopped',
        port: serverData.port,
        baseUrl: serverData.port ? `http://localhost:${serverData.port}` : null,
        routeCount: serverData.mockInstance.routes.length,
        activePreset: serverData.mockInstance.activePreset,
      });
    }

    return successResponse({
      servers: serverList,
      total: serverList.length,
    });
  },

  async get_server_info({ serverId }) {
    const serverData = getServer(serverId);

    return successResponse({
      serverId,
      status: serverData.httpServer ? 'running' : 'stopped',
      port: serverData.port,
      baseUrl: serverData.port ? `http://localhost:${serverData.port}` : null,
      activePreset: serverData.mockInstance.activePreset,
      routes: serverData.mockInstance.routes.map(r => ({
        name: r.name,
        mockRoute: r.mockRoute,
        method: r.method,
        testScope: r.testScope,
        testScenario: r.testScenario,
        latency: r.latency,
      })),
      presets: Object.keys(serverData.mockInstance.presets),
    });
  },

  async add_route({ serverId, route }) {
    const serverData = getServer(serverId);

    if (serverData.mockInstance.routes.length >= MAX_ROUTES_PER_SERVER) {
      throw new Error(`Maximum ${MAX_ROUTES_PER_SERVER} routes per server`);
    }

    if (serverData.mockInstance.routes.find(r => r.name === route.name)) {
      throw new Error(`Route with name "${route.name}" already exists`);
    }

    const newRoute = {
      name: route.name,
      mockRoute: route.mockRoute,
      method: route.method.toUpperCase(),
      testScope: route.testScope || 'success',
      testScenario: route.testScenario || 0,
      jsonTemplate: route.jsonTemplate || '{}',
      latency: route.latency,
    };

    // Compile matcher for parameterized routes
    compileRouteMatcher(newRoute);

    serverData.mockInstance.routes.push(newRoute);

    return successResponse({
      success: true,
      message: `Route "${route.name}" added to server "${serverId}"`,
      route: {
        name: newRoute.name,
        mockRoute: newRoute.mockRoute,
        method: newRoute.method,
        testScope: newRoute.testScope,
      },
    });
  },

  async update_route({ serverId, routeName, updates }) {
    const serverData = getServer(serverId);
    const route = serverData.mockInstance.routes.find(r => r.name === routeName);

    if (!route) {
      throw new Error(`Route "${routeName}" not found`);
    }

    // Track if mockRoute changed (needs recompilation)
    const mockRouteChanged = updates.mockRoute !== undefined && updates.mockRoute !== route.mockRoute;

    // Apply updates
    if (updates.mockRoute !== undefined) route.mockRoute = updates.mockRoute;
    if (updates.method !== undefined) route.method = updates.method.toUpperCase();
    if (updates.testScope !== undefined) route.testScope = updates.testScope;
    if (updates.testScenario !== undefined) route.testScenario = updates.testScenario;
    if (updates.jsonTemplate !== undefined) route.jsonTemplate = updates.jsonTemplate;
    if (updates.latency !== undefined) route.latency = updates.latency;

    // Recompile matcher if mockRoute changed
    if (mockRouteChanged) {
      compileRouteMatcher(route);
    }

    return successResponse({
      success: true,
      message: `Route "${routeName}" updated`,
      route: {
        name: route.name,
        mockRoute: route.mockRoute,
        method: route.method,
        testScope: route.testScope,
        testScenario: route.testScenario,
        latency: route.latency,
      },
    });
  },

  async delete_route({ serverId, routeName }) {
    const serverData = getServer(serverId);
    const index = serverData.mockInstance.routes.findIndex(r => r.name === routeName);

    if (index === -1) {
      throw new Error(`Route "${routeName}" not found`);
    }

    serverData.mockInstance.routes.splice(index, 1);

    return successResponse({
      success: true,
      message: `Route "${routeName}" deleted from server "${serverId}"`,
      remainingRoutes: serverData.mockInstance.routes.map(r => r.name),
    });
  },

  async set_scenario({ serverId, routeName, scope, scenario }) {
    const serverData = getServer(serverId);
    const route = serverData.mockInstance.routes.find(r => r.name === routeName);

    if (!route) {
      throw new Error(`Route "${routeName}" not found`);
    }

    if (scope !== undefined) {
      if (!TEST_SCOPES.includes(scope)) {
        throw new Error(`Invalid scope "${scope}". Must be one of: ${TEST_SCOPES.join(', ')}`);
      }
      route.testScope = scope;
    }
    if (scenario !== undefined) route.testScenario = scenario;

    return successResponse({
      success: true,
      message: `Scenario updated for route "${routeName}"`,
      route: {
        name: route.name,
        testScope: route.testScope,
        testScenario: route.testScenario,
      },
    });
  },

  async list_presets({ serverId }) {
    const serverData = getServer(serverId);

    return successResponse({
      activePreset: serverData.mockInstance.activePreset,
      presets: Object.keys(serverData.mockInstance.presets),
      presetDetails: serverData.mockInstance.presets,
    });
  },

  async activate_preset({ serverId, presetName }) {
    const serverData = getServer(serverId);

    if (presetName === 'default') {
      serverData.mockInstance.reset();
      return successResponse({
        success: true,
        message: 'Reset to default configuration',
        activePreset: null,
      });
    }

    if (!Object.hasOwn(serverData.mockInstance.presets, presetName)) {
      throw new Error(`Preset "${presetName}" not found. Available: ${Object.keys(serverData.mockInstance.presets).join(', ') || 'none'}`);
    }

    // Reset first
    serverData.mockInstance.reset();

    // Apply preset
    const preset = serverData.mockInstance.presets[presetName];
    let routesUpdated = 0;

    for (const [pattern, config] of Object.entries(preset)) {
      // Match routes by pattern
      let matchingRoutes;
      if (pattern === '*') {
        matchingRoutes = serverData.mockInstance.routes;
      } else if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        matchingRoutes = serverData.mockInstance.routes.filter(r => r.name?.startsWith(prefix));
      } else {
        const route = serverData.mockInstance.routes.find(r => r.name === pattern);
        matchingRoutes = route ? [route] : [];
      }

      for (const route of matchingRoutes) {
        if (config.scenario !== undefined) route.testScenario = config.scenario;
        if (config.scope !== undefined) route.testScope = config.scope;
        if (config.latency !== undefined) route.latency = config.latency;
        routesUpdated++;
      }
    }

    serverData.mockInstance.activePreset = presetName;

    return successResponse({
      success: true,
      preset: presetName,
      message: `Preset "${presetName}" activated`,
      routesUpdated,
    });
  },

  async add_preset({ serverId, presetName, config }) {
    const serverData = getServer(serverId);

    if (!presetName || typeof presetName !== 'string') {
      throw new Error('Preset name must be a non-empty string');
    }

    serverData.mockInstance.presets[presetName] = config;

    return successResponse({
      success: true,
      message: `Preset "${presetName}" added`,
      preset: config,
    });
  },

  async reset_server({ serverId }) {
    const serverData = getServer(serverId);

    serverData.mockInstance.reset();

    return successResponse({
      success: true,
      serverId,
      message: 'Server state reset to initial configuration',
      activePreset: null,
    });
  },

  async test_route({ serverId, path, method = 'GET', body, queryParams }) {
    const serverData = getServer(serverId);

    if (!serverData.httpServer) {
      throw new Error(`Server "${serverId}" is not running. Start it first with start_server.`);
    }

    // Build URL with query params
    let url = `http://localhost:${serverData.port}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        params.append(key, String(value));
      }
      url += `?${params.toString()}`;
    }

    // Make the request
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    let responseBody;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }
    } else {
      responseBody = await response.text();
    }

    return successResponse({
      request: {
        method: method.toUpperCase(),
        url,
        body: body || null,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      },
    });
  },
};

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [];

  for (const [serverId, serverData] of servers) {
    resources.push({
      uri: `mock-server://${serverId}/config`,
      name: `${serverId} Configuration`,
      description: `Configuration for mock server ${serverId}`,
      mimeType: 'application/json',
    });

    resources.push({
      uri: `mock-server://${serverId}/routes`,
      name: `${serverId} Routes`,
      description: `Route definitions for mock server ${serverId}`,
      mimeType: 'application/json',
    });
  }

  return { resources };
});

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^mock-server:\/\/([^/]+)\/(.+)$/);

  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const [, serverId, resourceType] = match;
  const serverData = servers.get(serverId);

  if (!serverData) {
    throw new Error(`Server not found: ${serverId}`);
  }

  let content;

  switch (resourceType) {
    case 'config':
      content = {
        serverId,
        status: serverData.httpServer ? 'running' : 'stopped',
        port: serverData.port,
        activePreset: serverData.mockInstance.activePreset,
        logging: serverData.mockInstance.logging,
        routeCount: serverData.mockInstance.routes.length,
        presetCount: Object.keys(serverData.mockInstance.presets).length,
      };
      break;

    case 'routes':
      content = serverData.mockInstance.routes.map(r => ({
        name: r.name,
        mockRoute: r.mockRoute,
        method: r.method,
        testScope: r.testScope,
        testScenario: r.testScenario,
        latency: r.latency,
        hasTemplate: !!r.jsonTemplate,
      }));
      break;

    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(content, null, 2),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    return errorResponse(`Unknown tool: ${name}`);
  }

  try {
    return await handler(args);
  } catch (error) {
    return errorResponse(error.message);
  }
});

// Graceful shutdown
async function shutdown() {
  console.error('Shutting down mock servers...');

  const shutdownPromises = [];
  for (const [serverId, serverData] of servers) {
    if (serverData.httpServer) {
      shutdownPromises.push(
        new Promise((resolve) => {
          serverData.httpServer.close(() => resolve());
          setTimeout(resolve, 5000); // Force resolve after 5s
        })
      );
    }
  }

  await Promise.all(shutdownPromises);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('mock-json-api MCP server running on stdio');
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
