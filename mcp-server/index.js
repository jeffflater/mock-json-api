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
import mock from 'mock-json-api';

// Store for active mock server instances
const servers = new Map();

// Server configuration
const server = new Server(
  {
    name: 'mock-json-api-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define available tools
const tools = [
  {
    name: 'create_mock_server',
    description: 'Create a new mock API server instance with routes configuration. Returns a server ID that can be used to manage the server.',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: {
          type: 'string',
          description: 'Unique identifier for this mock server instance',
        },
        routes: {
          type: 'array',
          description: 'Array of route configurations',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Unique name for the route',
              },
              mockRoute: {
                type: 'string',
                description: 'URL pattern to match (e.g., "/api/users" or "/api/users/:id")',
              },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                description: 'HTTP method',
              },
              testScope: {
                type: 'string',
                enum: ['success', 'created', 'noContent', 'badRequest', 'unauthorized', 'forbidden', 'notFound', 'timeout', 'conflict', 'error'],
                description: 'Response scope determining HTTP status code',
              },
              jsonTemplate: {
                type: 'string',
                description: 'JSON response template (supports dummy-json syntax for data generation)',
              },
              latency: {
                type: ['number', 'string'],
                description: 'Response delay in ms (number) or range (e.g., "100-500")',
              },
            },
            required: ['name', 'mockRoute', 'method'],
          },
        },
        presets: {
          type: 'object',
          description: 'Named presets for switching multiple routes at once',
          additionalProperties: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                scenario: { type: ['string', 'number'] },
                scope: { type: 'string' },
                latency: { type: ['number', 'string'] },
              },
            },
          },
        },
        jsonStore: {
          type: 'string',
          description: 'Path to JSON file for persisting mock data',
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server to start',
        },
        port: {
          type: 'number',
          description: 'Port number to listen on',
        },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server to stop',
        },
      },
      required: ['serverId'],
    },
  },
  {
    name: 'list_servers',
    description: 'List all mock server instances and their status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_server_info',
    description: 'Get detailed information about a mock server including routes, presets, and state',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
        route: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Unique name for the route' },
            mockRoute: { type: 'string', description: 'URL pattern to match' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
            testScope: { type: 'string' },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
        routeName: {
          type: 'string',
          description: 'Name of the route to update',
        },
        updates: {
          type: 'object',
          properties: {
            mockRoute: { type: 'string' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
            testScope: { type: 'string' },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
        routeName: {
          type: 'string',
          description: 'Name of the route to delete',
        },
      },
      required: ['serverId', 'routeName'],
    },
  },
  {
    name: 'set_scenario',
    description: 'Change a route\'s scenario and/or scope for testing different responses',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
        routeName: {
          type: 'string',
          description: 'Name of the route to update',
        },
        scope: {
          type: 'string',
          enum: ['success', 'created', 'noContent', 'badRequest', 'unauthorized', 'forbidden', 'notFound', 'timeout', 'conflict', 'error'],
          description: 'Response scope (determines HTTP status code)',
        },
        scenario: {
          type: ['string', 'number'],
          description: 'Scenario index or name to activate',
        },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
        presetName: {
          type: 'string',
          description: 'Name of the preset to activate (use "default" to reset)',
        },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
        presetName: {
          type: 'string',
          description: 'Name for the new preset',
        },
        config: {
          type: 'object',
          description: 'Preset configuration mapping route patterns to settings',
          additionalProperties: {
            type: 'object',
            properties: {
              scenario: { type: ['string', 'number'] },
              scope: { type: 'string' },
              latency: { type: ['number', 'string'] },
            },
          },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server to reset',
        },
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
        serverId: {
          type: 'string',
          description: 'ID of the mock server',
        },
        path: {
          type: 'string',
          description: 'URL path to request (e.g., "/api/users")',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          description: 'HTTP method',
          default: 'GET',
        },
        body: {
          type: 'object',
          description: 'Request body for POST/PUT/PATCH requests',
        },
        queryParams: {
          type: 'object',
          description: 'Query parameters to include',
        },
      },
      required: ['serverId', 'path'],
    },
  },
];

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

  try {
    switch (name) {
      case 'create_mock_server': {
        const { serverId, routes, presets, jsonStore, logging } = args;

        if (servers.has(serverId)) {
          throw new Error(`Server with ID "${serverId}" already exists`);
        }

        // Convert routes to mock-json-api format
        const mockRoutes = routes.map(r => ({
          name: r.name,
          mockRoute: r.mockRoute,
          method: r.method.toUpperCase(),
          testScope: r.testScope || 'success',
          testScenario: r.testScenario || 0,
          jsonTemplate: r.jsonTemplate || '{}',
          latency: r.latency,
        }));

        const config = {
          mockRoutes,
          presets: presets || {},
          jsonStore,
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                serverId,
                message: `Mock server "${serverId}" created with ${routes.length} routes`,
                routes: mockRoutes.map(r => r.name),
                presets: Object.keys(presets || {}),
              }, null, 2),
            },
          ],
        };
      }

      case 'start_server': {
        const { serverId, port } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        if (serverData.httpServer) {
          throw new Error(`Server "${serverId}" is already running on port ${serverData.port}`);
        }

        return new Promise((resolve, reject) => {
          serverData.httpServer = serverData.app.listen(port, () => {
            serverData.port = port;
            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    serverId,
                    port,
                    message: `Mock server "${serverId}" started on port ${port}`,
                    baseUrl: `http://localhost:${port}`,
                  }, null, 2),
                },
              ],
            });
          });

          serverData.httpServer.on('error', (err) => {
            reject(new Error(`Failed to start server: ${err.message}`));
          });
        });
      }

      case 'stop_server': {
        const { serverId } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        if (!serverData.httpServer) {
          throw new Error(`Server "${serverId}" is not running`);
        }

        return new Promise((resolve) => {
          serverData.httpServer.close(() => {
            const port = serverData.port;
            serverData.httpServer = null;
            serverData.port = null;

            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    serverId,
                    message: `Mock server "${serverId}" stopped (was on port ${port})`,
                  }, null, 2),
                },
              ],
            });
          });
        });
      }

      case 'list_servers': {
        const serverList = [];

        for (const [serverId, serverData] of servers) {
          serverList.push({
            serverId,
            status: serverData.httpServer ? 'running' : 'stopped',
            port: serverData.port,
            routeCount: serverData.mockInstance.routes.length,
            activePreset: serverData.mockInstance.activePreset,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                servers: serverList,
                total: serverList.length,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_server_info': {
        const { serverId } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        const info = {
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
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      }

      case 'add_route': {
        const { serverId, route } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        // Check for duplicate name
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

        serverData.mockInstance.routes.push(newRoute);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Route "${route.name}" added to server "${serverId}"`,
                route: newRoute,
              }, null, 2),
            },
          ],
        };
      }

      case 'update_route': {
        const { serverId, routeName, updates } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        const route = serverData.mockInstance.routes.find(r => r.name === routeName);

        if (!route) {
          throw new Error(`Route "${routeName}" not found`);
        }

        // Apply updates
        if (updates.mockRoute !== undefined) route.mockRoute = updates.mockRoute;
        if (updates.method !== undefined) route.method = updates.method.toUpperCase();
        if (updates.testScope !== undefined) route.testScope = updates.testScope;
        if (updates.testScenario !== undefined) route.testScenario = updates.testScenario;
        if (updates.jsonTemplate !== undefined) route.jsonTemplate = updates.jsonTemplate;
        if (updates.latency !== undefined) route.latency = updates.latency;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
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
              }, null, 2),
            },
          ],
        };
      }

      case 'delete_route': {
        const { serverId, routeName } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        const index = serverData.mockInstance.routes.findIndex(r => r.name === routeName);

        if (index === -1) {
          throw new Error(`Route "${routeName}" not found`);
        }

        serverData.mockInstance.routes.splice(index, 1);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Route "${routeName}" deleted from server "${serverId}"`,
                remainingRoutes: serverData.mockInstance.routes.map(r => r.name),
              }, null, 2),
            },
          ],
        };
      }

      case 'set_scenario': {
        const { serverId, routeName, scope, scenario } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        const route = serverData.mockInstance.routes.find(r => r.name === routeName);

        if (!route) {
          throw new Error(`Route "${routeName}" not found`);
        }

        if (scope !== undefined) route.testScope = scope;
        if (scenario !== undefined) route.testScenario = scenario;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Scenario updated for route "${routeName}"`,
                route: {
                  name: route.name,
                  testScope: route.testScope,
                  testScenario: route.testScenario,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'list_presets': {
        const { serverId } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                activePreset: serverData.mockInstance.activePreset,
                presets: Object.keys(serverData.mockInstance.presets),
                presetDetails: serverData.mockInstance.presets,
              }, null, 2),
            },
          ],
        };
      }

      case 'activate_preset': {
        const { serverId, presetName } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        if (presetName === 'default') {
          serverData.mockInstance.reset();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Reset to default configuration',
                  activePreset: null,
                }, null, 2),
              },
            ],
          };
        }

        if (!serverData.mockInstance.presets.hasOwnProperty(presetName)) {
          throw new Error(`Preset "${presetName}" not found. Available: ${Object.keys(serverData.mockInstance.presets).join(', ')}`);
        }

        // Simulate preset activation by directly manipulating routes
        const preset = serverData.mockInstance.presets[presetName];
        let routesUpdated = 0;

        // Reset first
        serverData.mockInstance.reset();

        // Apply preset
        for (const [pattern, config] of Object.entries(preset)) {
          const matchingRoutes = serverData.mockInstance._matchRoutesByPattern(pattern);

          for (const route of matchingRoutes) {
            if (config.scenario !== undefined) route.testScenario = config.scenario;
            if (config.scope !== undefined) route.testScope = config.scope;
            if (config.latency !== undefined) route.latency = config.latency;
            routesUpdated++;
          }
        }

        serverData.mockInstance.activePreset = presetName;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                preset: presetName,
                message: `Preset "${presetName}" activated`,
                routesUpdated,
              }, null, 2),
            },
          ],
        };
      }

      case 'add_preset': {
        const { serverId, presetName, config } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        serverData.mockInstance.presets[presetName] = config;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Preset "${presetName}" added`,
                preset: config,
              }, null, 2),
            },
          ],
        };
      }

      case 'reset_server': {
        const { serverId } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        serverData.mockInstance.reset();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                serverId,
                message: 'Server state reset to initial configuration',
                activePreset: null,
              }, null, 2),
            },
          ],
        };
      }

      case 'test_route': {
        const { serverId, path, method = 'GET', body, queryParams } = args;
        const serverData = servers.get(serverId);

        if (!serverData) {
          throw new Error(`Server "${serverId}" not found`);
        }

        if (!serverData.httpServer) {
          throw new Error(`Server "${serverId}" is not running. Start it first with start_server.`);
        }

        // Build URL with query params
        let url = `http://localhost:${serverData.port}${path}`;
        if (queryParams) {
          const params = new URLSearchParams(queryParams);
          url += `?${params.toString()}`;
        }

        // Make the request
        const fetchOptions = {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        let responseBody;

        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                request: {
                  method: method.toUpperCase(),
                  url,
                  body,
                },
                response: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: Object.fromEntries(response.headers.entries()),
                  body: responseBody,
                },
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('mock-json-api MCP server running on stdio');
}

main().catch(console.error);
