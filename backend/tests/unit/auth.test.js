const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth.routes');
const errorHandler = require('../../middleware/errorHandler');
const User = require('../../models/User');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth API', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.token).toBeDefined();
        });

        it('should not register user with existing email', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            };

            // First registration
            await request(app).post('/api/auth/register').send(userData);

            // Attempt duplicate registration
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create a user for login tests
            await User.create({
                name: 'Test User',
                email: 'login@example.com',
                password: 'password123'
            });
        });

        it('should login with correct credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBeDefined();
        });

        it('should not login with incorrect password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should not login with non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});

describe('protect() JWT verification', () => {
    const jwt = require('jsonwebtoken');

    const makeUser = async () => User.create({
        name: 'Jwt User',
        email: 'jwt@example.com',
        password: 'password123'
    });
    const call = (token) =>
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    it('accepts an HS256 token', async () => {
        const user = await makeUser();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
        await call(token).expect(200);
    });

    it('rejects a token signed with a different algorithm (HS512)', async () => {
        const user = await makeUser();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { algorithm: 'HS512', expiresIn: '1h' });
        await call(token).expect(401);
    });

    it('rejects an expired token', async () => {
        const user = await makeUser();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: -10 });
        await call(token).expect(401);
    });

    it('rejects a tampered token', async () => {
        const user = await makeUser();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await call(token.slice(0, -2) + 'xx').expect(401);
    });

    it('rejects a token for an inactive user', async () => {
        const user = await makeUser();
        await User.updateOne({ _id: user._id }, { isActive: false });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await call(token).expect(401);
    });
});

describe('tokenVersion invalidation', () => {
    const jwt = require('jsonwebtoken');

    const register = async (email = 'tv@example.com') => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Tv User', email, password: 'password123' })
            .expect(201);
        return res.body.data;
    };
    const sign = (id, claims = {}) =>
        jwt.sign({ id, ...claims }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const me = (token) =>
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    const changePassword = (token, currentPassword, newPassword = 'newpassword456') =>
        request(app)
            .put('/api/auth/updatepassword')
            .set('Authorization', `Bearer ${token}`)
            .send({ currentPassword, newPassword });

    it('accepts a token at the current version', async () => {
        const { user } = await register();
        await me(sign(user.id, { tv: 0 })).expect(200);
    });

    it('registration and login tokens carry the current tokenVersion', async () => {
        const { user, token } = await register();
        expect(jwt.decode(token).tv).toBe(0);

        await User.updateOne({ _id: user.id }, { tokenVersion: 3 });
        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'tv@example.com', password: 'password123' })
            .expect(200);
        expect(jwt.decode(login.body.data.token).tv).toBe(3);
        await me(login.body.data.token).expect(200);
    });

    it('rejects an older-version token', async () => {
        const { user } = await register();
        await User.updateOne({ _id: user.id }, { tokenVersion: 1 });
        await me(sign(user.id, { tv: 0 })).expect(401);
    });

    it('password change bumps the version, returns a working token and kills the old one', async () => {
        const { user, token: oldToken } = await register();

        const res = await changePassword(oldToken, 'password123').expect(200);
        const newToken = res.body.data.token;

        expect(jwt.decode(newToken).tv).toBe(1);
        const stored = await User.findById(user.id);
        expect(stored.tokenVersion).toBe(1);

        await me(newToken).expect(200);
        await me(oldToken).expect(401);

        // New password works for login
        await request(app)
            .post('/api/auth/login')
            .send({ email: 'tv@example.com', password: 'newpassword456' })
            .expect(200);
    });

    it('failed password change does not bump the version', async () => {
        const { user, token } = await register();

        await changePassword(token, 'wrong-password').expect(400);

        const stored = await User.findById(user.id);
        expect(stored.tokenVersion).toBe(0);
        await me(token).expect(200);
    });

    it('accepts a legacy token (no tv) only while the version is 0', async () => {
        const { user } = await register();
        const legacy = sign(user.id);
        await me(legacy).expect(200);

        await User.updateOne({ _id: user.id }, { tokenVersion: 1 });
        await me(legacy).expect(401);
    });

    it('still rejects expired tokens and inactive users', async () => {
        const { user } = await register();
        const expired = jwt.sign({ id: user.id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: -10 });
        await me(expired).expect(401);

        await User.updateOne({ _id: user.id }, { isActive: false });
        await me(sign(user.id, { tv: 0 })).expect(401);
    });

    it('does not expose tokenVersion in user responses', async () => {
        const { user, token } = await register();
        expect(user.tokenVersion).toBeUndefined();

        const meRes = await me(token).expect(200);
        expect(meRes.body.data.tokenVersion).toBeUndefined();

        const upd = await request(app)
            .put('/api/auth/updatedetails')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Renamed User' })
            .expect(200);
        expect(upd.body.data.tokenVersion).toBeUndefined();
    });
});
