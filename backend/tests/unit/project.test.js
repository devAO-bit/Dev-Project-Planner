const request = require('supertest');
const express = require('express');
const projectRoutes = require('../../routes/project.routes');
const errorHandler = require('../../middleware/errorHandler');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/api/projects', projectRoutes);
app.use(errorHandler);

let authToken;
let userId;

describe('Project API', () => {
    beforeEach(async () => {
        // Create a test user and get auth token
        const user = await User.create({
            name: 'Test User',
            email: 'project-test@example.com',
            password: 'password123'
        });

        userId = user._id;
        authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-secret');
    });

    describe('POST /api/projects', () => {
        it('should create a new project', async () => {
            const projectData = {
                name: 'Test Project',
                description: 'Test Description',
                category: 'Web App',
                targetTimeline: 4,
                difficulty: 'Medium'
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(projectData.name);
            expect(response.body.data.userId.toString()).toBe(userId.toString());
        });

        it('should require authentication', async () => {
            const projectData = {
                name: 'Test Project',
                description: 'Test Description',
                category: 'Web App',
                targetTimeline: 4
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/projects', () => {
        it('should get all user projects', async () => {
            // Create some test projects
            await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Project 1',
                    description: 'Description 1',
                    category: 'Web App',
                    targetTimeline: 4
                });

            const response = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.count).toBeGreaterThan(0);
        });
    });
});