/**
 * Tests for mock-json-api MCP Server
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const mock = require('mock-json-api');

describe('mock-json-api integration', () => {
  let mockInstance;
  let app;
  let server;

  beforeEach(() => {
    mockInstance = mock({
      mockRoutes: [
        {
          name: 'getUsers',
          mockRoute: '/api/users',
          method: 'GET',
          testScope: 'success',
          jsonTemplate: '{"users": [{"id": 1, "name": "Test"}]}'
        },
        {
          name: 'getUser',
          mockRoute: '/api/users/:id',
          method: 'GET',
          testScope: 'success',
          jsonTemplate: '{"id": "test", "name": "Test User"}'
        }
      ],
      presets: {
        'error-mode': {
          '*': { scope: 'error' }
        }
      }
    });
    app = mockInstance.createServer();
  });

  afterEach(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      server = null;
    }
  });

  it('should create a mock instance with routes', () => {
    assert.strictEqual(mockInstance.routes.length, 2);
    assert.strictEqual(mockInstance.routes[0].name, 'getUsers');
    assert.strictEqual(mockInstance.routes[1].name, 'getUser');
  });

  it('should have presets configured', () => {
    assert.ok(mockInstance.presets['error-mode']);
    assert.deepStrictEqual(mockInstance.presets['error-mode']['*'], { scope: 'error' });
  });

  it('should reset state correctly', () => {
    mockInstance.routes[0].testScope = 'error';
    mockInstance.activePreset = 'error-mode';

    mockInstance.reset();

    assert.strictEqual(mockInstance.routes[0].testScope, 'success');
    assert.strictEqual(mockInstance.activePreset, null);
  });

  it('should start and respond to requests', async () => {
    const port = 3999 + Math.floor(Math.random() * 1000);

    server = await new Promise((resolve, reject) => {
      const s = app.listen(port, () => resolve(s));
      s.on('error', reject);
    });

    const response = await fetch(`http://localhost:${port}/api/users`);
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.ok(data.users);
    assert.strictEqual(data.users.length, 1);
  });

  it('should handle parameterized routes', async () => {
    const port = 3999 + Math.floor(Math.random() * 1000);

    server = await new Promise((resolve, reject) => {
      const s = app.listen(port, () => resolve(s));
      s.on('error', reject);
    });

    const response = await fetch(`http://localhost:${port}/api/users/123`);
    assert.strictEqual(response.status, 200);
  });

  it('should return 404 for unknown routes', async () => {
    const port = 3999 + Math.floor(Math.random() * 1000);

    server = await new Promise((resolve, reject) => {
      const s = app.listen(port, () => resolve(s));
      s.on('error', reject);
    });

    const response = await fetch(`http://localhost:${port}/unknown`);
    assert.strictEqual(response.status, 404);
  });

  it('should respond to reset endpoint', async () => {
    const port = 3999 + Math.floor(Math.random() * 1000);

    server = await new Promise((resolve, reject) => {
      const s = app.listen(port, () => resolve(s));
      s.on('error', reject);
    });

    const response = await fetch(`http://localhost:${port}/_reset`, {
      method: 'POST'
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.strictEqual(data.success, true);
  });
});

describe('route matching', () => {
  it('should match exact routes', () => {
    const mockInstance = mock({
      mockRoutes: [
        {
          name: 'exactRoute',
          mockRoute: '^/api/exact$',
          method: 'GET',
          testScope: 'success',
          jsonTemplate: '{}'
        }
      ]
    });

    assert.strictEqual(mockInstance.routes.length, 1);
    assert.strictEqual(mockInstance.routes[0]._isParamRoute, false);
  });

  it('should compile parameterized route matchers', () => {
    const mockInstance = mock({
      mockRoutes: [
        {
          name: 'paramRoute',
          mockRoute: '/api/users/:id',
          method: 'GET',
          testScope: 'success',
          jsonTemplate: '{}'
        }
      ]
    });

    assert.strictEqual(mockInstance.routes[0]._isParamRoute, true);
    assert.ok(mockInstance.routes[0]._matcher);
  });
});

describe('test scopes', () => {
  const scopes = [
    { scope: 'success', status: 200 },
    { scope: 'created', status: 201 },
    { scope: 'noContent', status: 204 },
    { scope: 'badRequest', status: 400 },
    { scope: 'unauthorized', status: 401 },
    { scope: 'forbidden', status: 403 },
    { scope: 'notFound', status: 404 },
    { scope: 'timeout', status: 408 },
    { scope: 'conflict', status: 409 },
    { scope: 'error', status: 500 },
  ];

  for (const { scope, status } of scopes) {
    it(`should return ${status} for ${scope} scope`, async () => {
      const mockInstance = mock({
        mockRoutes: [
          {
            name: 'testRoute',
            mockRoute: '/test',
            method: 'GET',
            testScope: scope,
            jsonTemplate: '{}'
          }
        ]
      });

      const app = mockInstance.createServer();
      const port = 4999 + Math.floor(Math.random() * 1000);

      const server = await new Promise((resolve, reject) => {
        const s = app.listen(port, () => resolve(s));
        s.on('error', reject);
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        assert.strictEqual(response.status, status, `Expected ${status} for scope ${scope}`);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    });
  }
});

describe('presets', () => {
  it('should activate preset and update routes', async () => {
    const mockInstance = mock({
      mockRoutes: [
        {
          name: 'route1',
          mockRoute: '/api/route1',
          method: 'GET',
          testScope: 'success',
          jsonTemplate: '{}'
        },
        {
          name: 'route2',
          mockRoute: '/api/route2',
          method: 'GET',
          testScope: 'success',
          jsonTemplate: '{}'
        }
      ],
      presets: {
        'all-errors': {
          '*': { scope: 'error' }
        }
      }
    });

    const app = mockInstance.createServer();
    const port = 5999 + Math.floor(Math.random() * 1000);

    const server = await new Promise((resolve, reject) => {
      const s = app.listen(port, () => resolve(s));
      s.on('error', reject);
    });

    try {
      // Activate preset
      const presetResponse = await fetch(`http://localhost:${port}/_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'all-errors' })
      });

      assert.strictEqual(presetResponse.status, 200);

      // Check routes return errors
      const route1Response = await fetch(`http://localhost:${port}/api/route1`);
      assert.strictEqual(route1Response.status, 500);

      const route2Response = await fetch(`http://localhost:${port}/api/route2`);
      assert.strictEqual(route2Response.status, 500);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('should reset to default when preset is null', async () => {
    const mockInstance = mock({
      mockRoutes: [
        {
          name: 'route1',
          mockRoute: '/api/route1',
          method: 'GET',
          testScope: 'success',
          jsonTemplate: '{}'
        }
      ],
      presets: {
        'error-mode': { '*': { scope: 'error' } }
      }
    });

    const app = mockInstance.createServer();
    const port = 6999 + Math.floor(Math.random() * 1000);

    const server = await new Promise((resolve, reject) => {
      const s = app.listen(port, () => resolve(s));
      s.on('error', reject);
    });

    try {
      // Activate error preset
      await fetch(`http://localhost:${port}/_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'error-mode' })
      });

      // Reset to default
      await fetch(`http://localhost:${port}/_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: null })
      });

      // Should be back to success
      const response = await fetch(`http://localhost:${port}/api/route1`);
      assert.strictEqual(response.status, 200);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
