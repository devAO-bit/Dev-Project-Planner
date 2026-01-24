const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Project = require('../../models/Project');
const Feature = require('../../models/Feature');

describe('Feature API', () => {
    let authToken;
    let userId;
    let projectId;

    beforeEach(async () => {
        // Create user
        const userData = {
            name: 'Test User',
            email: `test-feature-${Date.now()}@example.com`,
            password: 'password123'
        };

        const user = await User.create(userData);
        userId = user._id;

        // Generate token
        const jwt = require('jsonwebtoken');
        authToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        // Create project
        const projectData = {
            name: 'Test Project',
            description: 'Test Description',
            userId: userId,
            status: 'Planning',
            category: 'Web App',
            targetTimeline: 4
        };

        const project = await Project.create(projectData);
        projectId = project._id;
    });

    describe('GET /api/features/project/:projectId', () => {
        test('should get all features for a project', async () => {
            // Create test features
            await Feature.create({
                name: 'Feature 1',
                description: 'Test Feature 1',
                projectId: projectId,
                status: 'Planned',
                type: 'core',
                priority: 'High'
            });

            const response = await request(app)
                .get(`/api/features/project/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.count).toBeGreaterThan(0);
        });

        test('should require authentication', async () => {
            const response = await request(app)
                .get(`/api/features/project/${projectId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('should return empty array if no features exist', async () => {
            const response = await request(app)
                .get(`/api/features/project/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.count).toBe(0);
        });
    });

    describe('POST /api/features', () => {
        test('should create a new feature', async () => {
            const featureData = {
                name: 'New Feature',
                description: 'Test Feature',
                projectId: projectId,
                status: 'Planned',
                type: 'core',
                priority: 'Medium'
            };

            const response = await request(app)
                .post('/api/features')
                .set('Authorization', `Bearer ${authToken}`)
                .send(featureData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(featureData.name);
        });

        test('should require authentication', async () => {
            const featureData = {
                name: 'New Feature',
                projectId: projectId
            };

            const response = await request(app)
                .post('/api/features')
                .send(featureData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/features')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/features/:id', () => {
        test('should get a single feature', async () => {
            const feature = await Feature.create({
                name: 'Test Feature',
                description: 'Test Description',
                projectId: projectId,
                status: 'Planned',
                type: 'core'
            });

            const response = await request(app)
                .get(`/api/features/${feature._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Test Feature');
        });

        test('should return 404 for non-existent feature', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/features/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/features/:id', () => {
        test('should update a feature', async () => {
            const feature = await Feature.create({
                name: 'Test Feature',
                description: 'Test Description',
                projectId: projectId,
                status: 'Planned'
            });

            const updateData = {
                name: 'Updated Feature',
                status: 'In Progress'
            };

            const response = await request(app)
                .put(`/api/features/${feature._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Updated Feature');
        });
    });

    describe('DELETE /api/features/:id', () => {
        test('should delete a feature', async () => {
            const feature = await Feature.create({
                name: 'Test Feature',
                description: 'Test Description',
                projectId: projectId,
                status: 'Planned'
            });

            const response = await request(app)
                .delete(`/api/features/${feature._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            const deletedFeature = await Feature.findById(feature._id);
            expect(deletedFeature).toBeNull();
        });
    });
});
