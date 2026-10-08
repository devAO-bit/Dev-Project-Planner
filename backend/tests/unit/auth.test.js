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
