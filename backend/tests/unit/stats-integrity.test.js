// Regression tests for SEC-04 (feature delete), SEC-05 (task moved between features),
// SEC-06 (direct feature update) and SEC-07 (project endDate).
//
// The core invariant, checked by expectConsistent(): stored aggregate counters on the
// Project and Feature documents always equal what the persisted Feature/Task documents say.
// All assertions reload documents from MongoDB; HTTP responses alone are never trusted.

// This file issues many requests; keep the app's global API rate limiter (default 100 per
// 15 minutes) from interfering. Must be set before app.js is loaded.
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');
const Project = require('../../models/Project');
const Feature = require('../../models/Feature');
const Task = require('../../models/Task');

const DAY_MS = 24 * 60 * 60 * 1000;

let userCounter = 0;

const createUser = async () => {
    userCounter += 1;
    const user = await User.create({
        name: `Stats User ${userCounter}`,
        email: `stats-${userCounter}-${Date.now()}@example.com`,
        password: 'password123'
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { user, token };
};

const percent = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

// Compare stored aggregates against the persisted Feature/Task documents.
const expectConsistent = async (projectId) => {
    const project = await Project.findById(projectId).lean();
    const features = await Feature.find({ projectId }).lean();
    const tasks = await Task.find({ projectId }).lean();
    const doneTasks = tasks.filter((t) => t.status === 'Done').length;

    expect(project.stats).toEqual({
        totalFeatures: features.length,
        completedFeatures: features.filter((f) => f.status === 'Completed').length,
        totalTasks: tasks.length,
        completedTasks: doneTasks
    });
    expect(project.progress).toBe(percent(doneTasks, tasks.length));

    const featureIds = new Set(features.map((f) => String(f._id)));

    for (const feature of features) {
        const featureTasks = tasks.filter((t) => String(t.featureId) === String(feature._id));
        const featureDone = featureTasks.filter((t) => t.status === 'Done').length;

        expect(feature.taskCount).toBe(featureTasks.length);
        expect(feature.completedTaskCount).toBe(featureDone);
        expect(feature.progress).toBe(percent(featureDone, featureTasks.length));
    }

    // No task may point at a feature that no longer exists
    for (const task of tasks) {
        if (task.featureId) {
            expect(featureIds.has(String(task.featureId))).toBe(true);
        }
    }
};

describe('Stats and date integrity (SEC-04 to SEC-07)', () => {
    let owner;
    let project;

    const auth = () => ({ Authorization: `Bearer ${owner.token}` });

    const createProject = async (overrides = {}) => {
        const response = await request(app)
            .post('/api/projects')
            .set(auth())
            .send({
                name: 'Stats Project',
                description: 'Stats project description',
                category: 'Web App',
                targetTimeline: 4,
                ...overrides
            });
        expect(response.status).toBe(201);
        return response.body.data;
    };

    const createFeature = async (projectId, name) => {
        const response = await request(app)
            .post('/api/features')
            .set(auth())
            .send({ projectId, name, description: `${name} description`, type: 'core' });
        expect(response.status).toBe(201);
        return response.body.data;
    };

    const createTask = async (projectId, title, { featureId, status } = {}) => {
        const response = await request(app)
            .post('/api/tasks')
            .set(auth())
            .send({ projectId, title, ...(featureId && { featureId }), ...(status && { status }) });
        expect(response.status).toBe(201);
        return response.body.data;
    };

    beforeEach(async () => {
        owner = await createUser();
        project = await createProject();
    });

    // ------------------------------------------------------------------
    // SEC-04: feature delete
    // ------------------------------------------------------------------
    describe('SEC-04 feature deletion', () => {
        test('deleting a feature removes its tasks and fixes project stats and progress', async () => {
            const featureA = await createFeature(project._id, 'Feature A');
            const featureB = await createFeature(project._id, 'Feature B');

            await createTask(project._id, 'a1', { featureId: featureA._id, status: 'Done' });
            await createTask(project._id, 'a2', { featureId: featureA._id, status: 'Done' });
            await createTask(project._id, 'a3', { featureId: featureA._id });
            await createTask(project._id, 'b1', { featureId: featureB._id, status: 'Done' });
            await createTask(project._id, 'b2', { featureId: featureB._id });
            await createTask(project._id, 'unassigned');

            await expectConsistent(project._id);
            const before = await Project.findById(project._id).lean();
            expect(before.stats.totalTasks).toBe(6);
            expect(before.stats.completedTasks).toBe(3);

            const response = await request(app)
                .delete(`/api/features/${featureA._id}`)
                .set(auth());
            expect(response.status).toBe(200);

            // Feature and its tasks are gone
            expect(await Feature.findById(featureA._id)).toBeNull();
            expect(await Task.countDocuments({ featureId: featureA._id })).toBe(0);
            expect(await Task.countDocuments({ projectId: project._id })).toBe(3);

            // Project stats no longer include the deleted feature's tasks
            const after = await Project.findById(project._id).lean();
            expect(after.stats.totalFeatures).toBe(1);
            expect(after.stats.totalTasks).toBe(3);
            expect(after.stats.completedTasks).toBe(1);
            expect(after.progress).toBe(33);
            // Project status semantics (SEC-08) are untouched by this path
            expect(after.status).toBe(before.status);

            await expectConsistent(project._id);
        });

        test('deleting the only feature with tasks resets task counters and progress to zero', async () => {
            const feature = await createFeature(project._id, 'Only Feature');
            await createTask(project._id, 't1', { featureId: feature._id, status: 'Done' });
            await createTask(project._id, 't2', { featureId: feature._id, status: 'Done' });

            await request(app).delete(`/api/features/${feature._id}`).set(auth()).expect(200);

            const after = await Project.findById(project._id).lean();
            expect(after.stats).toEqual({
                totalFeatures: 0,
                completedFeatures: 0,
                totalTasks: 0,
                completedTasks: 0
            });
            expect(after.progress).toBe(0);
            await expectConsistent(project._id);
        });

        test('recalculates from persisted documents rather than trusting cached counters', async () => {
            const feature = await createFeature(project._id, 'Feature');
            await createTask(project._id, 't1', { featureId: feature._id, status: 'Done' });
            await createTask(project._id, 'keep');

            // Simulate previously drifted counters
            await Project.updateOne(
                { _id: project._id },
                { $set: { 'stats.totalTasks': 99, 'stats.completedTasks': 98, progress: 99 } }
            );

            await request(app).delete(`/api/features/${feature._id}`).set(auth()).expect(200);

            const after = await Project.findById(project._id).lean();
            expect(after.stats.totalTasks).toBe(1);
            expect(after.stats.completedTasks).toBe(0);
            expect(after.progress).toBe(0);
            await expectConsistent(project._id);
        });

        test('deleting a feature does not touch other features or other projects', async () => {
            const otherProject = await createProject({ name: 'Other Project' });
            const otherFeature = await createFeature(otherProject._id, 'Other Feature');
            await createTask(otherProject._id, 'other task', { featureId: otherFeature._id, status: 'Done' });

            const feature = await createFeature(project._id, 'Feature');
            await createTask(project._id, 't1', { featureId: feature._id });

            await request(app).delete(`/api/features/${feature._id}`).set(auth()).expect(200);

            expect(await Task.countDocuments({ projectId: otherProject._id })).toBe(1);
            await expectConsistent(project._id);
            await expectConsistent(otherProject._id);
        });
    });

    // ------------------------------------------------------------------
    // SEC-05: task moved between features
    // ------------------------------------------------------------------
    describe('SEC-05 task moved between features', () => {
        let featureA;
        let featureB;

        beforeEach(async () => {
            featureA = await createFeature(project._id, 'Feature A');
            featureB = await createFeature(project._id, 'Feature B');
        });

        test('old and new feature counters and project stats are updated', async () => {
            const a1 = await createTask(project._id, 'a1', { featureId: featureA._id, status: 'Done' });
            await createTask(project._id, 'a2', { featureId: featureA._id });
            await createTask(project._id, 'b1', { featureId: featureB._id });

            await expectConsistent(project._id);

            const response = await request(app)
                .put(`/api/tasks/${a1._id}`)
                .set(auth())
                .send({ featureId: featureB._id });
            expect(response.status).toBe(200);

            const stored = await Task.findById(a1._id).lean();
            expect(String(stored.featureId)).toBe(String(featureB._id));

            const a = await Feature.findById(featureA._id).lean();
            expect(a.taskCount).toBe(1);
            expect(a.completedTaskCount).toBe(0);
            expect(a.progress).toBe(0);

            const b = await Feature.findById(featureB._id).lean();
            expect(b.taskCount).toBe(2);
            expect(b.completedTaskCount).toBe(1);
            expect(b.progress).toBe(50);

            const p = await Project.findById(project._id).lean();
            expect(p.stats.totalTasks).toBe(3);
            expect(p.stats.completedTasks).toBe(1);
            expect(p.progress).toBe(33);

            await expectConsistent(project._id);
        });

        test('moving the last task out of a feature leaves it with zero counters', async () => {
            const a1 = await createTask(project._id, 'a1', { featureId: featureA._id, status: 'Done' });

            await request(app)
                .put(`/api/tasks/${a1._id}`)
                .set(auth())
                .send({ featureId: featureB._id })
                .expect(200);

            const a = await Feature.findById(featureA._id).lean();
            expect(a.taskCount).toBe(0);
            expect(a.completedTaskCount).toBe(0);
            expect(a.progress).toBe(0);

            await expectConsistent(project._id);
        });

        test('moving a task and changing its status in one request keeps both features consistent', async () => {
            const a1 = await createTask(project._id, 'a1', { featureId: featureA._id });
            await createTask(project._id, 'a2', { featureId: featureA._id, status: 'Done' });

            await request(app)
                .put(`/api/tasks/${a1._id}`)
                .set(auth())
                .send({ featureId: featureB._id, status: 'Done' })
                .expect(200);

            await expectConsistent(project._id);
        });

        test('updating a task without changing its feature still keeps stats consistent', async () => {
            const a1 = await createTask(project._id, 'a1', { featureId: featureA._id });

            await request(app)
                .put(`/api/tasks/${a1._id}`)
                .set(auth())
                .send({ status: 'Done', featureId: featureA._id })
                .expect(200);

            await expectConsistent(project._id);
        });

        test('cross-project movement stays blocked and leaves both projects unchanged', async () => {
            const otherProject = await createProject({ name: 'Other Project' });
            const otherFeature = await createFeature(otherProject._id, 'Other Feature');
            const a1 = await createTask(project._id, 'a1', { featureId: featureA._id, status: 'Done' });
            await createTask(otherProject._id, 'o1', { featureId: otherFeature._id });

            const moveWithProject = await request(app)
                .put(`/api/tasks/${a1._id}`)
                .set(auth())
                .send({ projectId: otherProject._id, featureId: otherFeature._id });
            expect(moveWithProject.status).toBe(400);

            const moveToForeignFeature = await request(app)
                .put(`/api/tasks/${a1._id}`)
                .set(auth())
                .send({ featureId: otherFeature._id });
            expect(moveToForeignFeature.status).toBe(400);

            const stored = await Task.findById(a1._id).lean();
            expect(String(stored.projectId)).toBe(String(project._id));
            expect(String(stored.featureId)).toBe(String(featureA._id));

            await expectConsistent(project._id);
            await expectConsistent(otherProject._id);
        });
    });

    // ------------------------------------------------------------------
    // SEC-06: direct feature updates
    // ------------------------------------------------------------------
    describe('SEC-06 direct feature updates', () => {
        test('changing feature status updates project feature counters in both directions', async () => {
            const feature = await createFeature(project._id, 'Feature');
            await createFeature(project._id, 'Other Feature');

            await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth())
                .send({ status: 'Completed' })
                .expect(200);

            let p = await Project.findById(project._id).lean();
            expect(p.stats.totalFeatures).toBe(2);
            expect(p.stats.completedFeatures).toBe(1);
            await expectConsistent(project._id);

            await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth())
                .send({ status: 'Planned' })
                .expect(200);

            p = await Project.findById(project._id).lean();
            expect(p.stats.completedFeatures).toBe(0);
            await expectConsistent(project._id);
        });

        test('feature update keeps feature task counters and project progress correct', async () => {
            const feature = await createFeature(project._id, 'Feature');
            await createTask(project._id, 't1', { featureId: feature._id, status: 'Done' });
            await createTask(project._id, 't2', { featureId: feature._id });

            await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth())
                .send({ name: 'Renamed', priority: 'High', taskCount: 99, progress: 100 })
                .expect(200);

            const stored = await Feature.findById(feature._id).lean();
            expect(stored.name).toBe('Renamed');
            expect(stored.taskCount).toBe(2);
            expect(stored.completedTaskCount).toBe(1);
            expect(stored.progress).toBe(50);

            const p = await Project.findById(project._id).lean();
            expect(p.progress).toBe(50);
            await expectConsistent(project._id);
        });

        test('feature update recalculates project counters from documents, not from cached values', async () => {
            const feature = await createFeature(project._id, 'Feature');

            await Project.updateOne(
                { _id: project._id },
                { $set: { 'stats.totalFeatures': 42, 'stats.completedFeatures': 41 } }
            );

            await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth())
                .send({ status: 'Testing' })
                .expect(200);

            const p = await Project.findById(project._id).lean();
            expect(p.stats.totalFeatures).toBe(1);
            expect(p.stats.completedFeatures).toBe(0);
            await expectConsistent(project._id);
        });

        test('feature update does not change project status', async () => {
            const feature = await createFeature(project._id, 'Feature');
            await request(app)
                .put(`/api/projects/${project._id}`)
                .set(auth())
                .send({ status: 'On Hold' })
                .expect(200);

            await request(app)
                .put(`/api/features/${feature._id}`)
                .set(auth())
                .send({ status: 'Completed' })
                .expect(200);

            const p = await Project.findById(project._id).lean();
            expect(p.status).toBe('On Hold');
        });
    });

    // ------------------------------------------------------------------
    // SEC-07: project endDate
    // ------------------------------------------------------------------
    describe('SEC-07 project endDate', () => {
        const expectEndDateMatches = (stored, weeks) => {
            // Uses the shared model rule, plus an independent day-arithmetic check
            // (tolerating one hour for DST in non-UTC server time zones).
            expect(stored.endDate.toISOString()).toBe(
                Project.calculateEndDate(stored.startDate, weeks).toISOString()
            );
            const diff = stored.endDate.getTime() - stored.startDate.getTime();
            expect(Math.abs(diff - weeks * 7 * DAY_MS)).toBeLessThanOrEqual(DAY_MS / 24);
        };

        test('creation derives endDate from startDate and targetTimeline', async () => {
            const stored = await Project.findById(project._id).lean();
            expectEndDateMatches(stored, 4);
        });

        test('changing targetTimeline recalculates and persists endDate', async () => {
            const response = await request(app)
                .put(`/api/projects/${project._id}`)
                .set(auth())
                .send({ targetTimeline: 10 });
            expect(response.status).toBe(200);

            const stored = await Project.findById(project._id).lean();
            expect(stored.targetTimeline).toBe(10);
            expectEndDateMatches(stored, 10);
        });

        test('the stored startDate is the one used, and it is not client-editable', async () => {
            const before = await Project.findById(project._id).lean();

            await request(app)
                .put(`/api/projects/${project._id}`)
                .set(auth())
                .send({ targetTimeline: 6, startDate: '2000-01-01T00:00:00.000Z' })
                .expect(200);

            const stored = await Project.findById(project._id).lean();
            expect(stored.startDate.toISOString()).toBe(before.startDate.toISOString());
            expectEndDateMatches(stored, 6);
        });

        test('a client-supplied endDate cannot make endDate inconsistent', async () => {
            await request(app)
                .put(`/api/projects/${project._id}`)
                .set(auth())
                .send({ targetTimeline: 6, endDate: '2099-01-01T00:00:00.000Z' })
                .expect(200);

            const stored = await Project.findById(project._id).lean();
            expectEndDateMatches(stored, 6);

            const before = stored.endDate.toISOString();
            await request(app)
                .put(`/api/projects/${project._id}`)
                .set(auth())
                .send({ endDate: '2099-01-01T00:00:00.000Z' })
                .expect(200);

            const after = await Project.findById(project._id).lean();
            expect(after.endDate.toISOString()).toBe(before);
        });

        test('updates that do not touch targetTimeline leave endDate unchanged', async () => {
            const before = await Project.findById(project._id).lean();

            await request(app)
                .put(`/api/projects/${project._id}`)
                .set(auth())
                .send({ name: 'Renamed only' })
                .expect(200);

            const stored = await Project.findById(project._id).lean();
            expect(stored.name).toBe('Renamed only');
            expect(stored.endDate.toISOString()).toBe(before.endDate.toISOString());
        });

        test('a null targetTimeline is rejected and endDate stays unchanged', async () => {
            const before = await Project.findById(project._id).lean();

            const response = await request(app)
                .put(`/api/projects/${project._id}`)
                .set(auth())
                .send({ targetTimeline: null });
            expect(response.status).toBe(400);

            const stored = await Project.findById(project._id).lean();
            expect(stored.targetTimeline).toBe(before.targetTimeline);
            expect(stored.endDate.toISOString()).toBe(before.endDate.toISOString());
        });

        test('a project whose stored startDate is null can still be updated and keeps its endDate', async () => {
            const legacyEndDate = new Date('2030-01-01T00:00:00.000Z');
            const { insertedId } = await Project.collection.insertOne({
                name: 'Legacy',
                description: 'Legacy project with a null startDate',
                startDate: null,
                category: 'Tool',
                status: 'Planning',
                difficulty: 'Medium',
                targetTimeline: 4,
                endDate: legacyEndDate,
                userId: owner.user._id,
                progress: 0,
                stats: { totalFeatures: 0, completedFeatures: 0, totalTasks: 0, completedTasks: 0 },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const response = await request(app)
                .put(`/api/projects/${insertedId}`)
                .set(auth())
                .send({ targetTimeline: 8 });
            expect(response.status).toBe(200);

            const stored = await Project.findById(insertedId).lean();
            expect(stored.targetTimeline).toBe(8);
            expect(stored.endDate.toISOString()).toBe(legacyEndDate.toISOString());
        });

        test('the save path still recalculates endDate when startDate changes', async () => {
            const doc = await Project.findById(project._id);
            doc.startDate = new Date('2026-01-01T00:00:00.000Z');
            await doc.save();

            const stored = await Project.findById(project._id).lean();
            expect(stored.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
            expectEndDateMatches(stored, 4);
        });

        test('Project.calculateEndDate adds whole weeks to the start date', () => {
            const start = new Date('2026-03-01T12:00:00.000Z');
            const end = Project.calculateEndDate(start, 2);
            const diff = end.getTime() - start.getTime();

            expect(Math.abs(diff - 14 * DAY_MS)).toBeLessThanOrEqual(DAY_MS / 24);
            // does not mutate its input
            expect(start.toISOString()).toBe('2026-03-01T12:00:00.000Z');
        });
    });
});
