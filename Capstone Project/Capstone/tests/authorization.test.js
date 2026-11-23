const request = require('supertest');
const { app } = require('../src/server');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = require('./setup');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const { v4: uuidv4 } = require('uuid');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Authorization & Ownership Rules', () => {
  let admin, seller1, seller2, customer1, customer2;
  let category, productSeller1, orderCustomer1;

  beforeEach(async () => {
    admin = await createTestUser({ email: 'admin@authz.test', role: 'admin' });
    seller1 = await createTestUser({ email: 'seller1@authz.test', role: 'seller' });
    seller2 = await createTestUser({ email: 'seller2@authz.test', role: 'seller' });
    customer1 = await createTestUser({ email: 'cust1@authz.test', role: 'customer' });
    customer2 = await createTestUser({ email: 'cust2@authz.test', role: 'customer' });

    category = await Category.create({ name: 'Goods', slug: 'goods' });

    productSeller1 = await Product.create({
      name: 'Seller 1 Gadget',
      description: 'Exclusive gadget',
      priceCents: 5000,
      category: category._id,
      seller: seller1.user._id,
      stock: 20
    });

    orderCustomer1 = await Order.create({
      checkoutId: uuidv4(),
      customer: customer1.user._id,
      seller: seller1.user._id,
      items: [
        {
          product: productSeller1._id,
          name: productSeller1.name,
          unitPriceCents: 5000,
          quantity: 1,
          lineTotalCents: 5000
        }
      ],
      subtotalCents: 5000,
      totalCents: 5000,
      status: 'PENDING',
      delivery: {
        name: 'Customer 1',
        phone: '1234567890',
        line1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        pincode: '10001'
      },
      payment: {
        method: 'SIMULATED',
        status: 'PAID',
        simulated: true,
        reference: 'SIM-TEST'
      }
    });
  });

  it('should return 401 when accessing protected route without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return 403 when customer attempts to access admin route /api/v1/users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${customer1.token}`);

    expect(res.status).toBe(403);
  });

  it('should return 403 when seller2 attempts to update product owned by seller1', async () => {
    const res = await request(app)
      .patch(`/api/v1/products/${productSeller1._id}`)
      .set('Authorization', `Bearer ${seller2.token}`)
      .send({ name: 'Hacked Gadget Name' });

    expect(res.status).toBe(403);
  });

  it('should return 403 when seller2 attempts to delete product owned by seller1', async () => {
    const res = await request(app)
      .delete(`/api/v1/products/${productSeller1._id}`)
      .set('Authorization', `Bearer ${seller2.token}`);

    expect(res.status).toBe(403);
  });

  it('should allow admin to update any product', async () => {
    const res = await request(app)
      .patch(`/api/v1/products/${productSeller1._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Admin Renamed Gadget' });

    expect(res.status).toBe(200);
    expect(res.body.data.product.name).toBe('Admin Renamed Gadget');
  });

  it('should return 404 when customer2 attempts to read order of customer1', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${orderCustomer1._id}`)
      .set('Authorization', `Bearer ${customer2.token}`);

    expect(res.status).toBe(404);
  });

  it('should allow customer1 to read own order', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${orderCustomer1._id}`)
      .set('Authorization', `Bearer ${customer1.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order._id.toString()).toBe(orderCustomer1._id.toString());
  });
});
