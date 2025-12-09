const request = require('supertest');
const mock = require('../mock.js');
const fs = require('fs');
const path = require('path');

describe('mock-json-api', () => {
    let app;
    let mockApi;
    const testDataFile = path.join(__dirname, 'test-data.json');

    afterEach(() => {
        // Clean up test data file
        if (fs.existsSync(testDataFile)) {
            fs.unlinkSync(testDataFile);
        }
    });

    describe('Basic functionality', () => {
        beforeEach(() => {
            mockApi = mock({
                jsonStore: testDataFile,
                mockRoutes: [
                    {
                        name: 'getUsers',
                        mockRoute: '/api/users',
                        method: 'GET',
                        testScope: 'success',
                        jsonTemplate: '{ "users": [{ "name": "John" }] }'
                    }
                ]
            });
            app = mockApi.createServer();
        });

        it('should return JSON response for GET request', async () => {
            const res = await request(app).get('/api/users');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/json/);
            const body = JSON.parse(res.text);
            expect(body.users).toBeDefined();
        });

        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/api/unknown');
            expect(res.status).toBe(404);
        });
    });

    describe('CORS support', () => {
        it('should include CORS headers by default', async () => {
            mockApi = mock({
                mockRoutes: [
                    {
                        name: 'test',
                        mockRoute: '/api/test',
                        method: 'GET',
                        testScope: 'success',
                        jsonTemplate: '{}'
                    }
                ]
            });
            app = mockApi.createServer();

            const res = await request(app)
                .options('/api/test')
                .set('Origin', 'http://localhost:3000');

            expect(res.headers['access-control-allow-origin']).toBeDefined();
        });

        it('should allow disabling CORS', async () => {
            mockApi = mock({
                cors: false,
                mockRoutes: [
                    {
                        name: 'test',
                        mockRoute: '/api/test',
                        method: 'GET',
                        testScope: 'success',
                        jsonTemplate: '{}'
                    }
                ]
            });
            app = mockApi.createServer();

            const res = await request(app)
                .get('/api/test');

            expect(res.headers['access-control-allow-origin']).toBeUndefined();
        });
    });

    describe('Body parser', () => {
        beforeEach(() => {
            mockApi = mock({
                mockRoutes: [
                    {
                        name: 'createUser',
                        mockRoute: '/api/users',
                        method: 'POST',
                        testScope: 'success',
                        jsonTemplate: (req) => JSON.stringify({
                            created: true,
                            name: req.body.name
                        })
                    }
                ]
            });
            app = mockApi.createServer();
        });

        it('should parse JSON body in POST requests', async () => {
            const res = await request(app)
                .post('/api/users')
                .send({ name: 'Jane' })
                .set('Content-Type', 'application/json');

            expect(res.status).toBe(200);
            const body = JSON.parse(res.text);
            expect(body.name).toBe('Jane');
        });
    });

    describe('Route parameters', () => {
        beforeEach(() => {
            mockApi = mock({
                mockRoutes: [
                    {
                        name: 'getUser',
                        mockRoute: '/api/users/:id',
                        method: 'GET',
                        testScope: 'success',
                        jsonTemplate: (req) => JSON.stringify({
                            id: req.params.id,
                            name: 'User ' + req.params.id
                        })
                    },
                    {
                        name: 'getLeagueTeam',
                        mockRoute: '/api/leagues/:leagueId/teams/:teamId',
                        method: 'GET',
                        testScope: 'success',
                        jsonTemplate: (req) => JSON.stringify({
                            leagueId: req.params.leagueId,
                            teamId: req.params.teamId
                        })
                    }
                ]
            });
            app = mockApi.createServer();
        });

        it('should extract single route parameter', async () => {
            const res = await request(app).get('/api/users/123');
            expect(res.status).toBe(200);
            const body = JSON.parse(res.text);
            expect(body.id).toBe('123');
        });

        it('should extract multiple route parameters', async () => {
            const res = await request(app).get('/api/leagues/456/teams/789');
            expect(res.status).toBe(200);
            const body = JSON.parse(res.text);
            expect(body.leagueId).toBe('456');
            expect(body.teamId).toBe('789');
        });
    });

    describe('State reset endpoint', () => {
        beforeEach(() => {
            mockApi = mock({
                jsonStore: testDataFile,
                mockRoutes: [
                    {
                        name: 'getCounter',
                        mockRoute: '/api/counter',
                        method: 'GET',
                        testScope: 'success',
                        testScenario: 0,
                        jsonTemplate: '{ "count": 1 }'
                    }
                ]
            });
            app = mockApi.createServer();
        });

        it('should reset state via POST /_reset', async () => {
            // First request - creates data
            await request(app).get('/api/counter');

            // Verify data file exists
            expect(fs.existsSync(testDataFile)).toBe(true);

            // Reset
            const resetRes = await request(app).post('/_reset');
            expect(resetRes.status).toBe(200);
            expect(resetRes.body.success).toBe(true);

            // Data should be cleared
            const data = JSON.parse(fs.readFileSync(testDataFile, 'utf8'));
            expect(Object.keys(data).length).toBe(0);
        });

        it('should reset route scenarios to original values', async () => {
            // Change scenario via query param
            await request(app).get('/api/counter?scenario=1');

            // Reset
            await request(app).post('/_reset');

            // Scenario should be back to original (0)
            const route = mockApi.routes.find(r => r.name === 'getCounter');
            expect(route.testScenario).toBe(0);
        });
    });

    describe('Test scopes', () => {
        it('should return 404 for notFound scope', async () => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '/api/test',
                    method: 'GET',
                    testScope: 'notFound'
                }]
            });
            app = mockApi.createServer();

            const res = await request(app).get('/api/test');
            expect(res.status).toBe(404);
        });

        it('should return 401 for unauthorized scope', async () => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '/api/test',
                    method: 'GET',
                    testScope: 'unauthorized'
                }]
            });
            app = mockApi.createServer();

            const res = await request(app).get('/api/test');
            expect(res.status).toBe(401);
        });

        it('should return 500 for error scope', async () => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '/api/test',
                    method: 'GET',
                    testScope: 'error'
                }]
            });
            app = mockApi.createServer();

            const res = await request(app).get('/api/test');
            expect(res.status).toBe(500);
        });

        it('should return 201 for created scope', async () => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '/api/test',
                    method: 'POST',
                    testScope: 'created'
                }]
            });
            app = mockApi.createServer();

            const res = await request(app).post('/api/test');
            expect(res.status).toBe(201);
        });

        it('should return 204 for noContent scope', async () => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '/api/test',
                    method: 'DELETE',
                    testScope: 'noContent'
                }]
            });
            app = mockApi.createServer();

            const res = await request(app).delete('/api/test');
            expect(res.status).toBe(204);
        });
    });

    describe('Scenarios', () => {
        beforeEach(() => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '/api/test',
                    method: 'GET',
                    testScope: 'success',
                    testScenario: 0,
                    jsonTemplate: [
                        () => '{ "scenario": 0 }',
                        () => '{ "scenario": 1 }',
                        { 'named': () => '{ "scenario": "named" }' }
                    ]
                }]
            });
            app = mockApi.createServer();
        });

        it('should use default scenario (index 0)', async () => {
            const res = await request(app).get('/api/test');
            const body = JSON.parse(res.text);
            expect(body.scenario).toBe(0);
        });

        it('should switch scenario via query param', async () => {
            // Reset first to clear any cached data
            await request(app).post('/_reset');

            const res = await request(app).get('/api/test?scenario=1');
            const body = JSON.parse(res.text);
            expect(body.scenario).toBe(1);
        });

        it('should use named scenario', async () => {
            await request(app).post('/_reset');

            const res = await request(app).get('/api/test?scenario=named');
            const body = JSON.parse(res.text);
            expect(body.scenario).toBe('named');
        });
    });

    describe('Set route scenario endpoint', () => {
        beforeEach(() => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'testRoute',
                    mockRoute: '/api/test',
                    method: 'GET',
                    testScope: 'success',
                    testScenario: 0,
                    jsonTemplate: '{ "data": "test" }'
                }]
            });
            app = mockApi.createServer();
        });

        it('should update route scenario via POST /_scenario', async () => {
            const res = await request(app)
                .post('/_scenario')
                .send({ name: 'testRoute', scenario: 1 });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Mock route updated.');

            const route = mockApi.routes.find(r => r.name === 'testRoute');
            expect(route.testScenario).toBe(1);
        });

        it('should return 404 for unknown route name', async () => {
            const res = await request(app)
                .post('/_scenario')
                .send({ name: 'unknownRoute', scenario: 1 });

            expect(res.status).toBe(404);
        });
    });

    describe('Dummy JSON templates', () => {
        beforeEach(() => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '/api/test',
                    method: 'GET',
                    testScope: 'success',
                    jsonTemplate: '{ "name": "{{firstName}}", "age": {{int 18 65}} }'
                }]
            });
            app = mockApi.createServer();
        });

        it('should generate dummy data from template', async () => {
            const res = await request(app).get('/api/test');
            const body = JSON.parse(res.text);

            expect(typeof body.name).toBe('string');
            expect(body.name.length).toBeGreaterThan(0);
            expect(typeof body.age).toBe('number');
            expect(body.age).toBeGreaterThanOrEqual(18);
            expect(body.age).toBeLessThanOrEqual(65);
        });
    });

    describe('Regex route matching (backward compatibility)', () => {
        beforeEach(() => {
            mockApi = mock({
                mockRoutes: [{
                    name: 'test',
                    mockRoute: '\\/api\\/items\\/.*',
                    method: 'GET',
                    testScope: 'success',
                    jsonTemplate: '{ "matched": true }'
                }]
            });
            app = mockApi.createServer();
        });

        it('should match routes using regex patterns', async () => {
            const res = await request(app).get('/api/items/anything/here');
            expect(res.status).toBe(200);
            const body = JSON.parse(res.text);
            expect(body.matched).toBe(true);
        });
    });

    describe('HTTP methods', () => {
        beforeEach(() => {
            mockApi = mock({
                mockRoutes: [
                    { name: 'get', mockRoute: '/api/resource', method: 'GET', testScope: 'success', jsonTemplate: '{"method":"GET"}' },
                    { name: 'post', mockRoute: '/api/resource', method: 'POST', testScope: 'success', jsonTemplate: '{"method":"POST"}' },
                    { name: 'put', mockRoute: '/api/resource', method: 'PUT', testScope: 'success', jsonTemplate: '{"method":"PUT"}' },
                    { name: 'delete', mockRoute: '/api/resource', method: 'DELETE', testScope: 'success', jsonTemplate: '{"method":"DELETE"}' },
                    { name: 'patch', mockRoute: '/api/resource', method: 'PATCH', testScope: 'success', jsonTemplate: '{"method":"PATCH"}' }
                ]
            });
            app = mockApi.createServer();
        });

        it('should handle GET requests', async () => {
            const res = await request(app).get('/api/resource');
            expect(JSON.parse(res.text).method).toBe('GET');
        });

        it('should handle POST requests', async () => {
            const res = await request(app).post('/api/resource');
            expect(JSON.parse(res.text).method).toBe('POST');
        });

        it('should handle PUT requests', async () => {
            const res = await request(app).put('/api/resource');
            expect(JSON.parse(res.text).method).toBe('PUT');
        });

        it('should handle DELETE requests', async () => {
            const res = await request(app).delete('/api/resource');
            expect(JSON.parse(res.text).method).toBe('DELETE');
        });

        it('should handle PATCH requests', async () => {
            const res = await request(app).patch('/api/resource');
            expect(JSON.parse(res.text).method).toBe('PATCH');
        });
    });
});
