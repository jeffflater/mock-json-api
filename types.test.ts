// TypeScript compilation test - verifies type definitions are correct
// This file is only compiled, not executed

import mock = require('./index');

// Test basic config
const basicApi = mock({
    mockRoutes: [
        {
            name: 'getUsers',
            mockRoute: '/api/users',
            method: 'GET',
            testScope: 'success',
            jsonTemplate: '{ "users": [] }'
        }
    ]
});

// Test full config with all options
const fullApi = mock({
    jsonStore: './data.json',
    cors: {
        origin: 'http://localhost:3000',
        credentials: true
    },
    logging: 'verbose',
    presets: {
        'error-mode': {
            '*': { scope: 'error' }
        },
        'slow-mode': {
            'getUsers': { latency: 1000, scenario: 'empty' }
        }
    },
    mockRoutes: [
        {
            name: 'getUsers',
            mockRoute: '/api/users',
            method: 'GET',
            testScope: 'success',
            testScenario: 0,
            latency: '100-500',
            jsonTemplate: [
                (req) => JSON.stringify({ users: [], query: req.query }),
                { 'empty': (req) => '{ "users": [] }' }
            ],
            data: { customField: 'value' },
            helpers: { customHelper: () => 'result' }
        },
        {
            name: 'getUser',
            mockRoute: '/api/users/:id',
            method: 'GET',
            testScope: 'success',
            testScenario: (req) => req.params.id === '0' ? 'notFound' : 0,
            jsonTemplate: (req) => JSON.stringify({ id: req.params.id })
        },
        {
            name: 'createUser',
            mockRoute: '/api/users',
            method: 'POST',
            testScope: 'created',
            errorBody: { error: 'Custom error' }
        }
    ]
});

// Test custom logging function
const customLogApi = mock({
    logging: (info) => {
        console.log(info.method, info.url, info.status, info.notFound);
    },
    mockRoutes: [{ name: 'test', mockRoute: '/test', testScope: 'success', jsonTemplate: '{}' }]
});

// Test createServer returns Express app
const app = basicApi.createServer();

// Test instance properties
const routes: mock.MockRoute[] = basicApi.routes;
const activePreset: string | null = basicApi.activePreset;
const presets: Record<string, mock.Preset> = basicApi.presets;

// Test methods exist
basicApi.reset();

// Test type exports are accessible
type Scope = mock.TestScope;
type Route = mock.MockRoute;
type Config = mock.MockConfig;
type Instance = mock.MockInstance;
type Log = mock.LogInfo;

const scope: Scope = 'success';
const logInfo: Log = {
    method: 'GET',
    url: '/api/test',
    routeName: 'test',
    scope: 'success',
    scenario: 0,
    latency: 100,
    status: 200
};

console.log('Types are valid!');
