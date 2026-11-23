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

describe('Concurrency & Oversell Prevention Test', () => {
  it('product with stock 5: 10 parallel checkouts -> exactly 5 succeed, 5 get 409, final stock is 0', async () => {
    const seller = await createTestUser({ email: 'concurrency_seller@test.com', role: 'seller' });
    const category = await Category.create({ name: 'Limited Edition', slug: 'limited-edition' });

    // Initial stock is exactly 5
    const product = await Product.create({
      name: 'Rare Collectible Sneaker',
      description: 'Super limited run',
      priceCents: 20000,
      category: category._id,
      seller: seller.user._id,
      stock: 5,
      lowStockThreshold: 2
    });

    // Create 10 distinct customer users
    const customers = [];
    for (let i = 1; i <= 10; i++) {
      const cust = await createTestUser({
        name: `Customer ${i}`,
        email: `buyer_${i}_${Date.now()}@concurrency.test`,
        role: 'customer'
      });
      customers.push(cust);

      // Each customer adds 1 of the product to their cart
      const cartRes = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${cust.token}`)
        .send({
          productId: product._id.toString(),
          quantity: 1
        });
      expect(cartRes.status).toBe(200);
    }

    const deliveryPayload = {
      delivery: {
        name: 'Concurrent Buyer',
        phone: '1234567890',
        line1: '100 Flash Sale Blvd',
        city: 'Speed City',
        state: 'CA',
        pincode: '90001'
      }
    };

    // Fire all 10 checkouts simultaneously
    const checkoutPromises = customers.map((cust) =>
      request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${cust.token}`)
        .send(deliveryPayload)
    );

    const responses = await Promise.all(checkoutPromises);

    const successes = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    // Exactly 5 should succeed and exactly 5 should receive 409 Conflict
    expect(successes.length).toBe(5);
    expect(conflicts.length).toBe(5);

    // Verify final stock is exactly 0 and NEVER negative
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct.stock).toBe(0);
    expect(finalProduct.soldCount).toBe(5);
  });
});
