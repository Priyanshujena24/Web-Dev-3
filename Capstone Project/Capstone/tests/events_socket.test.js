const ioClient = require('socket.io-client');
const { app, server } = require('../src/server');
const appEvents = require('../src/events/appEvents');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = require('./setup');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const request = require('supertest');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('EventEmitter & Socket.IO Real-time Module', () => {
  let seller, customer, category, product, httpServer, port;

  beforeAll((done) => {
    httpServer = server.listen(0, () => {
      port = httpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  beforeEach(async () => {
    seller = await createTestUser({ email: 'socket_seller@test.com', role: 'seller' });
    customer = await createTestUser({ email: 'socket_customer@test.com', role: 'customer' });
    category = await Category.create({ name: 'Realtime', slug: 'realtime' });

    product = await Product.create({
      name: 'Alert Product',
      description: 'Product for alerts',
      priceCents: 1000,
      category: category._id,
      seller: seller.user._id,
      stock: 2,
      lowStockThreshold: 2
    });
  });

  it('should trigger EventEmitter order.placed and stock.low on checkout', async () => {
    const orderPlacedSpy = jest.fn();
    const stockLowSpy = jest.fn();

    appEvents.on('order.placed', orderPlacedSpy);
    appEvents.on('stock.low', stockLowSpy);

    // Add item to cart and checkout
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });

    const checkoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        delivery: {
          name: 'Realtime Buyer',
          phone: '1234567890',
          line1: '1 Realtime St',
          city: 'Socketville',
          state: 'CA',
          pincode: '94000'
        }
      });

    expect(checkoutRes.status).toBe(201);
    expect(orderPlacedSpy).toHaveBeenCalled();
    // Product started with stock 2, quantity bought is 1, so new stock is 1 <= lowStockThreshold 2
    expect(stockLowSpy).toHaveBeenCalled();

    appEvents.removeListener('order.placed', orderPlacedSpy);
    appEvents.removeListener('stock.low', stockLowSpy);
  });

  it('should reject unauthenticated socket connection', (done) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token: '' },
      transports: ['websocket'],
      reconnection: false
    });

    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication error/i);
      socket.close();
      done();
    });

    socket.on('connect', () => {
      socket.close();
      done(new Error('Unauthenticated connection should have been rejected'));
    });
  });

  it('should deliver order:new event to authenticated seller client on order placement', (done) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token: seller.token },
      transports: ['websocket'],
      reconnection: false
    });

    socket.on('connect', async () => {
      socket.on('order:new', (payload) => {
        expect(payload).toBeDefined();
        expect(payload.orderId).toBeDefined();
        socket.close();
        done();
      });

      // Customer places order for seller's product
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ productId: product._id.toString(), quantity: 1 });

      await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          delivery: {
            name: 'Socket Receiver',
            phone: '1234567890',
            line1: '1 Live Ave',
            city: 'Socket City',
            state: 'CA',
            pincode: '94000'
          }
        });
    });
  });
});
