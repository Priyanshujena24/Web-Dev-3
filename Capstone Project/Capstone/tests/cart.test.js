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

describe('Cart Module', () => {
  let customer, seller, category, product;

  beforeEach(async () => {
    customer = await createTestUser({ email: 'cartuser@test.com', role: 'customer' });
    seller = await createTestUser({ email: 'cartseller@test.com', role: 'seller' });
    category = await Category.create({ name: 'Appliances', slug: 'appliances' });

    product = await Product.create({
      name: 'Toaster Oven',
      description: '4-slice countertop toaster oven',
      priceCents: 4999, // $49.99
      category: category._id,
      seller: seller.user._id,
      stock: 10
    });
  });

  it('should fetch empty cart with 0 total and warnings array', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.totalCents).toBe(0);
    expect(res.body.data.total).toBe('0.00');
    expect(res.body.data.warnings).toEqual([]);
  });

  it('should add item to cart and calculate server-side line totals and total', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        productId: product._id.toString(),
        quantity: 2
      });

    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customer.token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.items.length).toBe(1);
    expect(getRes.body.data.items[0].quantity).toBe(2);
    expect(getRes.body.data.items[0].lineTotalCents).toBe(9998); // 4999 * 2
    expect(getRes.body.data.items[0].lineTotal).toBe('99.98');
    expect(getRes.body.data.totalCents).toBe(9998);
  });

  it('should reject adding item when requested quantity exceeds stock (400)', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        productId: product._id.toString(),
        quantity: 15 // Available stock is 10
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should update item quantity in cart', async () => {
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });

    const patchRes = await request(app)
      .patch(`/api/v1/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quantity: 4 });

    expect(patchRes.status).toBe(200);

    const getRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customer.token}`);

    expect(getRes.body.data.items[0].quantity).toBe(4);
    expect(getRes.body.data.totalCents).toBe(4999 * 4);
  });

  it('should remove item and clear cart', async () => {
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 2 });

    const deleteRes = await request(app)
      .delete(`/api/v1/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${customer.token}`);

    expect(deleteRes.status).toBe(200);

    const checkRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customer.token}`);

    expect(checkRes.body.data.items.length).toBe(0);
  });
});
