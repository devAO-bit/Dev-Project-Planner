// Regression tests for SEC-01 (mass assignment), SEC-02 (cross-project mutation)
// and SEC-03 (referential inconsistency).
//
// Every protected-field test follows the same pattern:
//   1. create the legitimate resource
//   2. send the unauthorized payload
//   3. check the HTTP response
//   4. reload the document from MongoDB and check the protected field is unchanged

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Project = require('../../models/Project');
const Feature = require('../../models/Feature');
const Task = require('../../models/Task');

let userCounter = 0;

const createUser = async (label) => {
    userCounter += 1;
    const user = await User.create({
        name: `User ${label}`,
        email: `sec-${label}-${userCounter}-${Date.now()}@example.com`,
        password: 'password123'
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { user, token };
};

const createProject = (userId, overrides = {}) =>
    Project.create({
        name: 'Project',
        description: 'Project description',
        category: 'Web App',
        targetTimeline: 4,
        userId,
        ...overrides
    });

const createFeature = (projectId, overrides = {}) =>
    Feature.create({
        name: 'Feature',
        description: 'Feature description',
        projectId,
        ...overrides
    });

const createTask = (projectId, overrides = {}) =>
    Task.create({
        title: 'Task',
        projectId,
        ...overrides
    });

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const id = (value) => String(value);

describe('P1 security hardening: client-controlled fields', () => {
    let alice; // owner under test
    let bob; // a different user
    let aliceProject;
    let aliceOtherProject;
    let bobProject;
    let bobFeature;
    let bobTask;

    beforeEach(async () => {
        alice = await createUser('alice');
        bob = await createUser('bob');

        aliceProject = await createProject(alice.user._id, { name: 'Alice Project' });
        aliceOtherProject = await createProject(alice.user._id, { name: 'Alice Other Project' });
        bobProject = await createProject(bob.user._id, { name: 'Bob Project' });
        bobFeature = await createFeature(bobProject._id, { name: 'Bob Feature' });
        bobTask = await createTask(bobProject._id, { title: 'Bob Task', featureId: bobFeature._id });
    });

    // ------------------------------------------------------------------
    // Projects
    // ------------------------------------------------------------------
    describe('Projects', () => {
        test('cannot change userId through project update', async () => {
            const response = await request(app)
                .put(`/api/projects/${aliceProject._id}`)
                .set(auth(alice.token))
                .send({ name: 'Renamed', userId: String(bob.user._id) });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            const stored = await Project.findById(aliceProject._id).lean();
            expect(id(stored.userId)).toBe(id(alice.user._id));
            expect(stored.name).toBe('Alice Project');
        });

        test('cannot forge progress or stats through project update', async () => {
            const response = await request(app)
                .put(`/api/projects/${aliceProject._id}`)
                .set(auth(alice.token))
                .send({
                    name: 'Renamed',
                    progress: 99,
                    stats: {
                        totalFeatures: 50,
                        completedFeatures: 50,
                        totalTasks: 50,
                        completedTasks: 50
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.data.name).toBe('Renamed');

            const stored = await Project.findById(aliceProject._id).lean();
            expect(stored.name).toBe('Renamed');
            expect(stored.progress).toBe(0);
            expect(stored.stats).toEqual({
                totalFeatures: 0,
                completedFeatures: 0,
                totalTasks: 0,
                completedTasks: 0
            });
        });

        test('cannot overwrite server-managed fields (startDate, createdAt) through project update', async () => {
            const before = await Project.findById(aliceProject._id).lean();

            const response = await request(app)
                .put(`/api/projects/${aliceProject._id}`)
                .set(auth(alice.token))
                .send({
                    description: 'Changed',
                    startDate: '2000-01-01T00:00:00.000Z',
                    createdAt: '2000-01-01T00:00:00.000Z'
                });

            expect(response.status).toBe(200);

            const stored = await Project.findById(aliceProject._id).lean();
            expect(stored.description).toBe('Changed');
            expect(stored.startDate.toISOString()).toBe(before.startDate.toISOString());
            expect(stored.createdAt.toISOString()).toBe(before.createdAt.toISOString());
        });

        test('legitimate project fields still update', async () => {
            const endDate = '2030-01-01T00:00:00.000Z';

            const response = await request(app)
                .put(`/api/projects/${aliceProject._id}`)
                .set(auth(alice.token))
                .send({
                    name: 'Updated Name',
                    description: 'Updated description',
                    category: 'API',
                    difficulty: 'Hard',
                    targetTimeline: 8,
                    status: 'On Hold',
                    endDate
                });

            expect(response.status).toBe(200);

            const stored = await Project.findById(aliceProject._id).lean();
            expect(stored.name).toBe('Updated Name');
            expect(stored.description).toBe('Updated description');
            expect(stored.category).toBe('API');
            expect(stored.difficulty).toBe('Hard');
            expect(stored.targetTimeline).toBe(8);
            expect(stored.status).toBe('On Hold');
            expect(stored.endDate.toISOString()).toBe(endDate);
            expect(id(stored.userId)).toBe(id(alice.user._id));
        });

        test('project creation ignores client-supplied userId, progress and stats', async () => {
            const response = await request(app)
                .post('/api/projects')
                .set(auth(alice.token))
                .send({
                    name: 'Created',
                    description: 'Created description',
                    category: 'Tool',
                    targetTimeline: 3,
                    userId: String(bob.user._id),
                    progress: 80,
                    stats: { totalTasks: 10, completedTasks: 10, totalFeatures: 5, completedFeatures: 5 }
                });

            expect(response.status).toBe(201);

            const stored = await Project.findById(response.body.data._id).lean();
            expect(id(stored.userId)).toBe(id(alice.user._id));
            expect(stored.progress).toBe(0);
            expect(stored.stats).toEqual({
                totalFeatures: 0,
                completedFeatures: 0,
                totalTasks: 0,
                completedTasks: 0
            });
        });
    });

    // ------------------------------------------------------------------
    // Features
    // ------------------------------------------------------------------
    describe('Features', () => {
        let feature;

        beforeEach(async () => {
            feature = await createFeature(aliceProject._id, { name: 'Alice Feature', order: 3 });
        });

        test('cannot move a feature to another of the owner\'s projects', async () => {
            const response = await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth(alice.token))
                .send({ name: 'Moved', projectId: String(aliceOtherProject._id) });

            expect(response.status).toBe(400);

            const stored = await Feature.findById(feature._id).lean();
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
            expect(stored.name).toBe('Alice Feature');
        });

        test('cannot move a feature into another user\'s project', async () => {
            const response = await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth(alice.token))
                .send({ projectId: String(bobProject._id) });

            expect(response.status).toBe(400);

            const stored = await Feature.findById(feature._id).lean();
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
            expect(await Feature.countDocuments({ projectId: bobProject._id })).toBe(1); // only Bob's own
        });

        test('cannot forge progress, task counters or order through feature update', async () => {
            const response = await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth(alice.token))
                .send({
                    name: 'Renamed',
                    progress: 100,
                    taskCount: 40,
                    completedTaskCount: 40,
                    order: 99
                });

            expect(response.status).toBe(200);

            const stored = await Feature.findById(feature._id).lean();
            expect(stored.name).toBe('Renamed');
            expect(stored.progress).toBe(0);
            expect(stored.taskCount).toBe(0);
            expect(stored.completedTaskCount).toBe(0);
            expect(stored.order).toBe(3);
        });

        test('legitimate feature fields still update', async () => {
            const response = await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth(alice.token))
                .send({
                    name: 'Updated Feature',
                    description: 'Updated description',
                    type: 'stretch',
                    priority: 'High',
                    status: 'Testing'
                });

            expect(response.status).toBe(200);

            const stored = await Feature.findById(feature._id).lean();
            expect(stored.name).toBe('Updated Feature');
            expect(stored.description).toBe('Updated description');
            expect(stored.type).toBe('stretch');
            expect(stored.priority).toBe('High');
            expect(stored.status).toBe('Testing');
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
        });

        test('feature creation ignores client-supplied counters, progress and order', async () => {
            const response = await request(app)
                .post('/api/features')
                .set(auth(alice.token))
                .send({
                    projectId: String(aliceOtherProject._id),
                    name: 'Created Feature',
                    description: 'Created description',
                    type: 'core',
                    taskCount: 10,
                    completedTaskCount: 10,
                    progress: 100,
                    order: 99
                });

            expect(response.status).toBe(201);

            const stored = await Feature.findById(response.body.data._id).lean();
            expect(id(stored.projectId)).toBe(id(aliceOtherProject._id));
            expect(stored.taskCount).toBe(0);
            expect(stored.completedTaskCount).toBe(0);
            expect(stored.progress).toBe(0);
            expect(stored.order).toBe(0); // first feature of that project
        });

        test('reorder endpoint still changes order for own features', async () => {
            const response = await request(app)
                .put('/api/features/reorder')
                .set(auth(alice.token))
                .send({ features: [{ id: String(feature._id), order: 7 }] });

            expect(response.status).toBe(200);

            const stored = await Feature.findById(feature._id).lean();
            expect(stored.order).toBe(7);
        });
    });

    // ------------------------------------------------------------------
    // Tasks
    // ------------------------------------------------------------------
    describe('Tasks', () => {
        let feature;
        let otherFeature;
        let task;

        beforeEach(async () => {
            feature = await createFeature(aliceProject._id, { name: 'Alice Feature' });
            otherFeature = await createFeature(aliceProject._id, { name: 'Alice Second Feature' });
            task = await createTask(aliceProject._id, {
                title: 'Alice Task',
                featureId: feature._id,
                order: 2
            });
        });

        test('cannot move a task to another of the owner\'s projects', async () => {
            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({ title: 'Moved', projectId: String(aliceOtherProject._id) });

            expect(response.status).toBe(400);

            const stored = await Task.findById(task._id).lean();
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
            expect(stored.title).toBe('Alice Task');
        });

        test('cannot move a task into another user\'s project', async () => {
            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({ projectId: String(bobProject._id) });

            expect(response.status).toBe(400);

            const stored = await Task.findById(task._id).lean();
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
            expect(await Task.countDocuments({ projectId: bobProject._id })).toBe(1); // only Bob's own
        });

        test('cannot move a task together with a foreign project and feature', async () => {
            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({
                    projectId: String(bobProject._id),
                    featureId: String(bobFeature._id)
                });

            expect(response.status).toBe(400);

            const stored = await Task.findById(task._id).lean();
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
            expect(id(stored.featureId)).toBe(id(feature._id));
        });

        test('cannot assign a task to a feature of another project owned by the same user', async () => {
            const otherProjectFeature = await createFeature(aliceOtherProject._id, { name: 'Other Project Feature' });

            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({ featureId: String(otherProjectFeature._id) });

            expect(response.status).toBe(400);

            const stored = await Task.findById(task._id).lean();
            expect(id(stored.featureId)).toBe(id(feature._id));
        });

        test('cannot assign a task to another user\'s feature', async () => {
            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({ featureId: String(bobFeature._id) });

            expect(response.status).toBe(400);

            const stored = await Task.findById(task._id).lean();
            expect(id(stored.featureId)).toBe(id(feature._id));
        });

        test('cannot assign a task to a non-existent feature', async () => {
            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({ featureId: String(new mongoose.Types.ObjectId()) });

            expect(response.status).toBe(400);

            const stored = await Task.findById(task._id).lean();
            expect(id(stored.featureId)).toBe(id(feature._id));
        });

        test('task can still move to another feature of the same project', async () => {
            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({ featureId: String(otherFeature._id) });

            expect(response.status).toBe(200);

            const stored = await Task.findById(task._id).lean();
            expect(id(stored.featureId)).toBe(id(otherFeature._id));
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
        });

        test('cannot change order through task update', async () => {
            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({ title: 'Renamed', order: 99 });

            expect(response.status).toBe(200);

            const stored = await Task.findById(task._id).lean();
            expect(stored.title).toBe('Renamed');
            expect(stored.order).toBe(2);
        });

        test('legitimate task fields still update', async () => {
            const dueDate = '2030-06-01T00:00:00.000Z';

            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .set(auth(alice.token))
                .send({
                    title: 'Updated Task',
                    description: 'Updated description',
                    status: 'Review',
                    priority: 'Critical',
                    dueDate
                });

            expect(response.status).toBe(200);

            const stored = await Task.findById(task._id).lean();
            expect(stored.title).toBe('Updated Task');
            expect(stored.description).toBe('Updated description');
            expect(stored.status).toBe('Review');
            expect(stored.priority).toBe('Critical');
            expect(stored.dueDate.toISOString()).toBe(dueDate);
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
            expect(id(stored.featureId)).toBe(id(feature._id));
        });

        test('task creation takes projectId from the verified project and ignores client order', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set(auth(alice.token))
                .send({
                    projectId: String(aliceProject._id),
                    featureId: String(feature._id),
                    title: 'Created Task',
                    order: 99
                });

            expect(response.status).toBe(201);

            const stored = await Task.findById(response.body.data._id).lean();
            expect(id(stored.projectId)).toBe(id(aliceProject._id));
            expect(id(stored.featureId)).toBe(id(feature._id));
            expect(stored.order).toBe(task.order + 1);
        });

        test('reorder endpoint still changes order for own tasks', async () => {
            const response = await request(app)
                .put('/api/tasks/reorder')
                .set(auth(alice.token))
                .send({ tasks: [{ id: String(task._id), order: 7 }] });

            expect(response.status).toBe(200);

            const stored = await Task.findById(task._id).lean();
            expect(stored.order).toBe(7);
        });
    });

    // ------------------------------------------------------------------
    // Cross-user
    // ------------------------------------------------------------------
    describe('Cross-user access', () => {
        test('user cannot mutate another user\'s project', async () => {
            const response = await request(app)
                .put(`/api/projects/${bobProject._id}`)
                .set(auth(alice.token))
                .send({ name: 'Hijacked', userId: String(alice.user._id) });

            expect(response.status).toBe(403);

            const stored = await Project.findById(bobProject._id).lean();
            expect(stored.name).toBe('Bob Project');
            expect(id(stored.userId)).toBe(id(bob.user._id));
        });

        test('user cannot mutate another user\'s feature', async () => {
            const response = await request(app)
                .put(`/api/features/${bobFeature._id}`)
                .set(auth(alice.token))
                .send({ name: 'Hijacked', projectId: String(aliceProject._id) });

            expect(response.status).toBe(403);

            const stored = await Feature.findById(bobFeature._id).lean();
            expect(stored.name).toBe('Bob Feature');
            expect(id(stored.projectId)).toBe(id(bobProject._id));
        });

        test('user cannot mutate another user\'s task', async () => {
            const response = await request(app)
                .put(`/api/tasks/${bobTask._id}`)
                .set(auth(alice.token))
                .send({ title: 'Hijacked', projectId: String(aliceProject._id) });

            expect(response.status).toBe(403);

            const stored = await Task.findById(bobTask._id).lean();
            expect(stored.title).toBe('Bob Task');
            expect(id(stored.projectId)).toBe(id(bobProject._id));
        });

        test('user cannot reorder another user\'s tasks or features', async () => {
            const taskResponse = await request(app)
                .put('/api/tasks/reorder')
                .set(auth(alice.token))
                .send({ tasks: [{ id: String(bobTask._id), order: 42 }] });
            const featureResponse = await request(app)
                .put('/api/features/reorder')
                .set(auth(alice.token))
                .send({ features: [{ id: String(bobFeature._id), order: 42 }] });

            expect(taskResponse.status).toBe(403);
            expect(featureResponse.status).toBe(403);

            expect((await Task.findById(bobTask._id).lean()).order).toBe(0);
            expect((await Feature.findById(bobFeature._id).lean()).order).toBe(0);
        });

        test('user cannot create a feature in another user\'s project', async () => {
            const response = await request(app)
                .post('/api/features')
                .set(auth(alice.token))
                .send({
                    projectId: String(bobProject._id),
                    name: 'Injected Feature',
                    description: 'Injected',
                    type: 'core'
                });

            expect(response.status).toBe(403);
            expect(await Feature.countDocuments({ name: 'Injected Feature' })).toBe(0);
        });

        test('user cannot create a task in another user\'s project', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set(auth(alice.token))
                .send({ projectId: String(bobProject._id), title: 'Injected Task' });

            expect(response.status).toBe(403);
            expect(await Task.countDocuments({ title: 'Injected Task' })).toBe(0);
        });

        test('user cannot attach a new task to another user\'s feature', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set(auth(alice.token))
                .send({
                    projectId: String(aliceProject._id),
                    featureId: String(bobFeature._id),
                    title: 'Cross Linked Task'
                });

            expect(response.status).toBe(400);
            expect(await Task.countDocuments({ title: 'Cross Linked Task' })).toBe(0);
        });

        test('user cannot attach a new task to a feature of a different project', async () => {
            const otherProjectFeature = await createFeature(aliceOtherProject._id, { name: 'Other Project Feature' });

            const response = await request(app)
                .post('/api/tasks')
                .set(auth(alice.token))
                .send({
                    projectId: String(aliceProject._id),
                    featureId: String(otherProjectFeature._id),
                    title: 'Mismatched Task'
                });

            expect(response.status).toBe(400);
            expect(await Task.countDocuments({ title: 'Mismatched Task' })).toBe(0);
        });
    });
});
