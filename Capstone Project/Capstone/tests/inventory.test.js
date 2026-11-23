const request = require('supertest');
const { app } = require('../src/server');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = require('./setup');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Inventory Module', () => {
  let seller1, seller2, admin, category, product;

  beforeEach(async () => {
    seller1 = await createTestUser({ email: 'inv_seller1@test.com', role: 'seller' });
    seller2 = await createTestUser({ email: 'inv_seller2@test.com', role: 'seller' });
    admin = await createTestUser({ email: 'inv_admin@test.com', role: 'admin' });
    category = await Category.create({ name: 'Inventory Category', slug: 'inv-cat' });

    product = await Product.create({
      name: 'Inventory Tracked Item',
      description: 'Stock test item',
      priceCents: 2000,
      category: category._id,
      seller: seller1.user._id,
      stock: 10,
      lowStockThreshold: 5
    });
  });

  describe('PATCH /api/v1/inventory/:productId/stock', () => {
    it('should allow seller to increment stock via delta', async () => {
      const res = await request(app)
        .patch(`/api/v1/inventory/${product._id}/stock`)
        .set('Authorization', `Bearer ${seller1.token}`)
        .send({ delta: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.product.stock).toBe(15);
    });

    it('should allow seller to set exact stock', async () => {
      const res = await request(app)
        .patch(`/api/v1/inventory/${product._id}/stock`)
        .set('Authorization', `Bearer ${seller1.token}`)
        .send({ set: 25 });

      expect(res.status).toBe(200);
      expect(res.body.data.product.stock).toBe(25);
    });

    it('should reject stock updates that would result in negative stock (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/inventory/${product._id}/stock`)
        .set('Authorization', `Bearer ${seller1.token}`)
        .send({ delta: -20 }); // 10 - 20 = -10

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be negative/i);

      // Verify stock did not change
      const p = await Product.findById(product._id);
      expect(p.stock).toBe(10);
    });

    it('should reject setting negative stock directly (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/inventory/${product._id}/stock`)
        .set('Authorization', `Bearer ${seller1.token}`)
        .send({ set: -5 });

      expect(res.status).toBe(400);
    });

    it('should prevent seller2 from updating stock of seller1 product (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/inventory/${product._id}/stock`)
        .set('Authorization', `Bearer ${seller2.token}`)
        .send({ delta: 5 });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/inventory/low-stock', () => {
    it('should list products where stock <= lowStockThreshold', async () => {
      // Set product stock to 3 (threshold is 5)
      await Product.findByIdAndUpdate(product._id, { stock: 3 });

      const res = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', `Bearer ${seller1.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0]._id.toString()).toBe(product._id.toString());
    });
  });
});
