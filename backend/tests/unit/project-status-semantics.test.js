const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');
const Project = require('../../models/Project');
const Feature = require('../../models/Feature');
const Task = require('../../models/Task');

// SEC-08: task-driven recalculation must not overwrite manual lifecycle statuses
describe('Project status semantics (SEC-08)', () => {
    let token, userId, projectId, featureId;

    const auth = (req) => req.set('Authorization', `Bearer ${token}`);
    const reload = () => Project.findById(projectId);
    const setStatus = (status) =>
        auth(request(app).put(`/api/projects/${projectId}`)).send({ status }).expect(200);
    const addTask = async (extra = {}) => {
        const res = await auth(request(app).post('/api/tasks')).send({
            title: 'T', description: 'd', projectId, featureId, ...extra
        });
        expect(res.status).toBe(201);
        return res.body.data._id;
    };
    const updateTask = (id, body) =>
        auth(request(app).put(`/api/tasks/${id}`)).send(body).expect(200);
    const deleteTask = (id) => auth(request(app).delete(`/api/tasks/${id}`)).expect(200);

    beforeEach(async () => {
        const user = await User.create({
            name: 'U', email: `sec08-${Date.now()}-${Math.random()}@example.com`, password: 'password123'
        });
        userId = user._id;
        token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const project = await Project.create({
            name: 'P', description: 'd', userId, category: 'Web App', targetTimeline: 4
        });
        projectId = project._id;
        const feature = await Feature.create({
            name: 'F', description: 'd', projectId, status: 'Planned'
        });
        featureId = feature._id;
    });

    describe.each(['Cancelled', 'On Hold'])('%s is protected', (manual) => {
        test('survives task create, update, complete, reopen and delete; progress still updates', async () => {
            await setStatus(manual);

            const t1 = await addTask();
            let p = await reload();
            expect(p.status).toBe(manual);
            expect(p.progress).toBe(0);

            const t2 = await addTask();
            await updateTask(t1, { status: 'Done' });
            p = await reload();
            expect(p.status).toBe(manual);
            expect(p.progress).toBe(50);

            await updateTask(t2, { status: 'Done' });
            p = await reload();
            expect(p.status).toBe(manual);
            expect(p.progress).toBe(100);

            await updateTask(t2, { status: 'Todo' });
            p = await reload();
            expect(p.status).toBe(manual);
            expect(p.progress).toBe(50);

            await deleteTask(t2);
            p = await reload();
            expect(p.status).toBe(manual);
            expect(p.progress).toBe(100);

            await deleteTask(t1);
            p = await reload();
            expect(p.status).toBe(manual);
            expect(p.progress).toBe(0);
        });

        test('explicit resume to In Progress re-enters automatic derivation', async () => {
            await setStatus(manual);
            const t1 = await addTask();
            await addTask();
            await updateTask(t1, { status: 'Done' });
            expect((await reload()).status).toBe(manual);

            await setStatus('In Progress');
            expect((await reload()).status).toBe('In Progress');

            await addTask(); // 1/3 -> still In Progress, derived
            let p = await reload();
            expect(p.status).toBe('In Progress');
            expect(p.progress).toBe(33);

            await updateTask(t1, { status: 'Todo' }); // 0% -> Planning (derived)
            expect((await reload()).status).toBe('Planning');
        });
    });

    describe('automatically derived statuses', () => {
        test('Planning -> In Progress -> Completed -> reopened -> empty', async () => {
            const t1 = await addTask();
            let p = await reload();
            expect(p.status).toBe('Planning');
            expect(p.progress).toBe(0);

            const t2 = await addTask();
            await updateTask(t1, { status: 'Done' });
            p = await reload();
            expect(p.status).toBe('In Progress');
            expect(p.progress).toBe(50);

            await updateTask(t2, { status: 'Done' });
            p = await reload();
            expect(p.status).toBe('Completed');
            expect(p.progress).toBe(100);

            await updateTask(t2, { status: 'Todo' }); // reopen
            p = await reload();
            expect(p.status).toBe('In Progress');

            await deleteTask(t1);
            await deleteTask(t2);
            p = await reload();
            expect(p.status).toBe('Planning');
            expect(p.progress).toBe(0);
        });

        test('moving a task between features keeps a protected status', async () => {
            const feature2 = await Feature.create({
                name: 'F2', description: 'd', projectId, status: 'Planned'
            });
            const t1 = await addTask();
            await updateTask(t1, { status: 'Done' });
            await setStatus('On Hold');

            await updateTask(t1, { featureId: feature2._id.toString() });
            const p = await reload();
            expect(p.status).toBe('On Hold');
            expect(p.progress).toBe(100);
        });
    });
});
