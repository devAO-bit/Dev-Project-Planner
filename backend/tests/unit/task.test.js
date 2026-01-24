const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Project = require('../../models/Project');
const Feature = require('../../models/Feature');
const Task = require('../../models/Task');

describe('Task API', () => {
    let authToken;
    let userId;
    let projectId;
    let featureId;

    beforeEach(async () => {
        // Create user
        const userData = {
            name: 'Test User',
            email: `test-task-${Date.now()}@example.com`,
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

        // Create feature
        const featureData = {
            name: 'Test Feature',
            description: 'Test Feature Description',
            projectId: projectId,
            status: 'Planned'
        };

        const feature = await Feature.create(featureData);
        featureId = feature._id;
    });

    describe('GET /api/tasks/feature/:featureId', () => {
        test('should get all tasks for a feature', async () => {
            // Create test tasks
            await Task.create({
                title: 'Task 1',
                description: 'Test Task 1',
                featureId: featureId,
                projectId: projectId,
                status: 'Todo',
                priority: 'High'
            });

            const response = await request(app)
                .get(`/api/tasks/feature/${featureId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });

        test('should require authentication', async () => {
            const response = await request(app)
                .get(`/api/tasks/feature/${featureId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/tasks', () => {
        test('should create a new task', async () => {
            const taskData = {
                title: 'New Task',
                description: 'Test Task',
                projectId: projectId,
                featureId: featureId,
                status: 'Todo',
                priority: 'Medium'
            };

            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send(taskData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(taskData.title);
        });

        test('should require authentication', async () => {
            const taskData = {
                title: 'New Task',
                featureId: featureId,
                projectId: projectId
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/tasks/:id', () => {
        test('should get a single task', async () => {
            const task = await Task.create({
                title: 'Test Task',
                description: 'Test Description',
                projectId: projectId,
                featureId: featureId,
                status: 'Todo'
            });

            const response = await request(app)
                .get(`/api/tasks/${task._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Test Task');
        });

        test('should return 404 for non-existent task', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/tasks/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/tasks/:id', () => {
        test('should update a task', async () => {
            const task = await Task.create({
                title: 'Test Task',
                featureId: featureId,
                projectId: projectId,
                status: 'Todo'
            });

            const updateData = {
                title: 'Updated Task',
                status: 'In Progress'
            };

            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Updated Task');
        });
    });

    describe('DELETE /api/tasks/:id', () => {
        test('should delete a task', async () => {
            const task = await Task.create({
                title: 'Test Task',
                featureId: featureId,
                projectId: projectId,
                status: 'Todo'
            });

            const response = await request(app)
                .delete(`/api/tasks/${task._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            const deletedTask = await Task.findById(task._id);
            expect(deletedTask).toBeNull();
        });
    });
});
