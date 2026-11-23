const request = require('supertest');
const { app } = require('../src/server');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = require('./setup');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Order & Checkout Module', () => {
  let customer, seller1, seller2, admin;
  let category, product1, product2;

  beforeEach(async () => {
    customer = await createTestUser({ email: 'ordercust@test.com', role: 'customer' });
    seller1 = await createTestUser({ email: 'orderseller1@test.com', role: 'seller' });
    seller2 = await createTestUser({ email: 'orderseller2@test.com', role: 'seller' });
    admin = await createTestUser({ email: 'orderadmin@test.com', role: 'admin' });

    category = await Category.create({ name: 'Gadgets', slug: 'gadgets' });

    product1 = await Product.create({
      name: 'Seller 1 Keyboard',
      description: 'Mechanical keyboard',
      priceCents: 5000,
      category: category._id,
      seller: seller1.user._id,
      stock: 10
    });

    product2 = await Product.create({
      name: 'Seller 2 Mouse',
      description: 'Ergonomic mouse',
      priceCents: 3000,
      category: category._id,
      seller: seller2.user._id,
      stock: 15
    });
  });

  const validDelivery = {
    delivery: {
      name: 'John Doe',
      phone: '1234567890',
      line1: '456 Elm St',
      city: 'Boston',
      state: 'MA',
      pincode: '02101'
    }
  };

  it('should return 400 when checkout delivery information is missing', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when attempting checkout on empty cart', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customer.token}`)
      .send(validDelivery);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/empty/i);
  });

  it('should successfully checkout, split orders per seller, decrement stock, and clear cart', async () => {
    // Add product1 (seller1) and product2 (seller2) to cart
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product1._id.toString(), quantity: 2 });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product2._id.toString(), quantity: 3 });

    const checkoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customer.token}`)
      .send(validDelivery);

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.checkoutId).toBeDefined();
    expect(checkoutRes.body.data.orders.length).toBe(2);

    // Verify all orders share the same checkoutId
    const { checkoutId, orders } = checkoutRes.body.data;
    expect(orders[0].checkoutId).toBe(checkoutId);
    expect(orders[1].checkoutId).toBe(checkoutId);

    // Verify simulated payment
    expect(orders[0].payment.method).toBe('SIMULATED');
    expect(orders[0].payment.status).toBe('PAID');
    expect(orders[0].payment.simulated).toBe(true);
    expect(orders[0].payment.reference).toMatch(/^SIM-/);

    // Verify stock decremented
    const p1Updated = await Product.findById(product1._id);
    const p2Updated = await Product.findById(product2._id);
    expect(p1Updated.stock).toBe(8); // 10 - 2
    expect(p1Updated.soldCount).toBe(2);
    expect(p2Updated.stock).toBe(12); // 15 - 3
    expect(p2Updated.soldCount).toBe(3);

    // Verify cart is cleared
    const cart = await Cart.findOne({ user: customer.user._id });
    expect(cart.items.length).toBe(0);
  });

  it('should enforce order status transition rules and reject invalid transitions with 409', async () => {
    // Add item & checkout
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product1._id.toString(), quantity: 1 });

    const checkoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customer.token}`)
      .send(validDelivery);

    const orderId = checkoutRes.body.data.orders[0]._id;

    // 1. Invalid jump: PENDING -> DELIVERED directly should fail with 409
    const invalidRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${seller1.token}`)
      .send({ status: 'DELIVERED' });

    expect(invalidRes.status).toBe(409);
    expect(invalidRes.body.message).toMatch(/Invalid status transition/i);

    // 2. Valid sequence: PENDING -> CONFIRMED -> SHIPPED -> DELIVERED
    const confirmRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${seller1.token}`)
      .send({ status: 'CONFIRMED' });
    expect(confirmRes.status).toBe(200);

    const shipRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${seller1.token}`)
      .send({ status: 'SHIPPED' });
    expect(shipRes.status).toBe(200);

    const deliverRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${seller1.token}`)
      .send({ status: 'DELIVERED' });
    expect(deliverRes.status).toBe(200);

    // 3. Transition from terminal state DELIVERED should fail with 409
    const terminalRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${seller1.token}`)
      .send({ status: 'CANCELLED' });

    expect(terminalRes.status).toBe(409);
  });

  it('should cancel order and restore stock exactly once (idempotent; 2nd cancel -> 409)', async () => {
    // Initial product stock: 10
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product1._id.toString(), quantity: 3 });

    const checkoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customer.token}`)
      .send(validDelivery);

    const orderId = checkoutRes.body.data.orders[0]._id;

    // After checkout stock is 7
    let p = await Product.findById(product1._id);
    expect(p.stock).toBe(7);

    // First cancel (by customer)
    const cancelRes1 = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ note: 'Changed mind' });

    expect(cancelRes1.status).toBe(200);
    expect(cancelRes1.body.data.order.status).toBe('CANCELLED');
    expect(cancelRes1.body.data.order.payment.status).toBe('REFUNDED');

    // Stock should be restored to 10
    p = await Product.findById(product1._id);
    expect(p.stock).toBe(10);
    expect(p.soldCount).toBe(0);

    // Second cancel attempt on the same order should return 409 and not double-restore stock
    const cancelRes2 = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ note: 'Cancel again' });

    expect(cancelRes2.status).toBe(409);

    // Stock must STILL be 10, not 13!
    p = await Product.findById(product1._id);
    expect(p.stock).toBe(10);
  });
});
