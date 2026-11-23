const request = require('supertest');
const { app } = require('../src/server');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = require('./setup');
const RefreshToken = require('../src/models/RefreshToken');
const { hashToken } = require('../src/services/token.service');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Authentication & Authorization Module', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Johnson',
          email: 'alice@test.com',
          password: 'Password@123',
          role: 'customer'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@test.com');
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should register a new seller successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Bob Seller',
          email: 'seller@test.com',
          password: 'Password@123',
          role: 'seller'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('seller');
    });

    it('should reject admin self-registration with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker Admin',
          email: 'fakeadmin@test.com',
          password: 'Password@123',
          role: 'admin'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 for duplicate email registration', async () => {
      await createTestUser({ email: 'duplicate@test.com' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'duplicate@test.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 validation error for invalid email or short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Bad',
          email: 'not-an-email',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await createTestUser({ email: 'login@test.com' });
    });

    it('should login successfully with valid credentials and return access and refresh tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when account is deactivated', async () => {
      await createTestUser({ email: 'deactivated@test.com', isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'deactivated@test.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh & Token Rotation', () => {
    it('should rotate tokens and return a new pair', async () => {
      const { user } = await createTestUser({ email: 'rotate@test.com' });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rotate@test.com', password: 'Password@123' });

      const oldRefreshToken = loginRes.body.data.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).not.toBe(oldRefreshToken);

      // Verify old token is marked revoked
      const oldHash = hashToken(oldRefreshToken);
      const oldRecord = await RefreshToken.findOne({ tokenHash: oldHash });
      expect(oldRecord.revokedAt).not.toBeNull();
    });

    it('should revoke ALL user tokens and return 401 if a revoked token is reused', async () => {
      await createTestUser({ email: 'reuse@test.com' });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'reuse@test.com', password: 'Password@123' });

      const token1 = loginRes.body.data.refreshToken;

      // First refresh: rotates token1 -> token2
      const refresh1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: token1 });

      expect(refresh1.status).toBe(200);
      const token2 = refresh1.body.data.refreshToken;

      // Attacker or replay attempts to use revoked token1 again
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: token1 });

      expect(reuseRes.status).toBe(401);

      // Even token2 should now be revoked due to token reuse detection
      const token2Hash = hashToken(token2);
      const token2Record = await RefreshToken.findOne({ tokenHash: token2Hash });
      expect(token2Record.revokedAt).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/logout and /auth/me', () => {
    it('should revoke the supplied refresh token on logout', async () => {
      await createTestUser({ email: 'logout@test.com' });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'logout@test.com', password: 'Password@123' });

      const refreshToken = loginRes.body.data.refreshToken;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);

      // Attempting to refresh with the logged out token should fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });

    it('should return current user for /auth/me with valid Bearer token', async () => {
      const { user, token } = await createTestUser({ email: 'me@test.com', name: 'Profile Me' });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('me@test.com');
      expect(res.body.data.user.name).toBe('Profile Me');
    });
  });
});
