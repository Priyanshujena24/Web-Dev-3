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

describe('Reports & Aggregations Module', () => {
  let admin, seller1, seller2, customer;
  let cat1, cat2, p1, p2, p3;

  beforeEach(async () => {
    admin = await createTestUser({ email: 'admin@report.test', role: 'admin' });
    seller1 = await createTestUser({ email: 'seller1@report.test', role: 'seller' });
    seller2 = await createTestUser({ email: 'seller2@report.test', role: 'seller' });
    customer = await createTestUser({ email: 'customer@report.test', role: 'customer' });

    cat1 = await Category.create({ name: 'Tech', slug: 'tech' });
    cat2 = await Category.create({ name: 'Books', slug: 'books' });

    p1 = await Product.create({
      name: 'Tech Gadget A',
      description: 'Gadget A',
      priceCents: 10000,
      category: cat1._id,
      seller: seller1.user._id,
      stock: 20,
      lowStockThreshold: 5,
      isActive: true
    });

    p2 = await Product.create({
      name: 'Tech Gadget B',
      description: 'Gadget B',
      priceCents: 5000,
      category: cat1._id,
      seller: seller1.user._id,
      stock: 2, // low stock!
      lowStockThreshold: 5,
      isActive: true
    });

    p3 = await Product.create({
      name: 'Novel Book',
      description: 'Best selling book',
      priceCents: 2000,
      category: cat2._id,
      seller: seller2.user._id,
      stock: 50,
      lowStockThreshold: 5,
      isActive: true
    });

    // Create completed orders
    await Order.create([
      {
        checkoutId: uuidv4(),
        customer: customer.user._id,
        seller: seller1.user._id,
        items: [
          { product: p1._id, name: p1.name, unitPriceCents: 10000, quantity: 2, lineTotalCents: 20000 },
          { product: p2._id, name: p2.name, unitPriceCents: 5000, quantity: 1, lineTotalCents: 5000 }
        ],
        subtotalCents: 25000,
        totalCents: 25000,
        status: 'DELIVERED',
        delivery: { name: 'Cust', phone: '123', line1: 'L', city: 'C', state: 'S', pincode: 'P' },
        payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-R1' },
        createdAt: new Date('2026-11-20T10:00:00Z')
      },
      {
        checkoutId: uuidv4(),
        customer: customer.user._id,
        seller: seller1.user._id,
        items: [
          { product: p1._id, name: p1.name, unitPriceCents: 10000, quantity: 1, lineTotalCents: 10000 }
        ],
        subtotalCents: 10000,
        totalCents: 10000,
        status: 'SHIPPED',
        delivery: { name: 'Cust', phone: '123', line1: 'L', city: 'C', state: 'S', pincode: 'P' },
        payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-R2' },
        createdAt: new Date('2026-11-21T10:00:00Z')
      },
      {
        checkoutId: uuidv4(),
        customer: customer.user._id,
        seller: seller2.user._id,
        items: [
          { product: p3._id, name: p3.name, unitPriceCents: 2000, quantity: 5, lineTotalCents: 10000 }
        ],
        subtotalCents: 10000,
        totalCents: 10000,
        status: 'CONFIRMED',
        delivery: { name: 'Cust', phone: '123', line1: 'L', city: 'C', state: 'S', pincode: 'P' },
        payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-R3' },
        createdAt: new Date('2026-11-21T11:00:00Z')
      }
    ]);
  });

  describe('GET /api/v1/reports/sales-summary', () => {
    it('admin should receive sales summary across all sellers', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales-summary?groupBy=day')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.summary)).toBe(true);
      const totalRevenueCents = res.body.data.summary.reduce((sum, item) => sum + item.revenueCents, 0);
      expect(totalRevenueCents).toBe(45000); // 25000 + 10000 + 10000
    });

    it('seller1 should only receive their own sales summary', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales-summary?groupBy=day')
        .set('Authorization', `Bearer ${seller1.token}`);

      expect(res.status).toBe(200);
      const totalRevenueCents = res.body.data.summary.reduce((sum, item) => sum + item.revenueCents, 0);
      expect(totalRevenueCents).toBe(35000); // 25000 + 10000 (excluding seller2's 10000)
    });
  });

  describe('GET /api/v1/reports/best-selling', () => {
    it('admin should receive top selling products ranked by quantity', async () => {
      const res = await request(app)
        .get('/api/v1/reports/best-selling?limit=3')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bestSelling.length).toBeGreaterThan(0);
      // p3 had quantity 5 sold, p1 had 3 sold, p2 had 1 sold
      expect(res.body.data.bestSelling[0].name).toBe('Novel Book');
      expect(res.body.data.bestSelling[0].totalQuantitySold).toBe(5);
    });
  });

  describe('GET /api/v1/reports/inventory-summary', () => {
    it('should aggregate inventory count, stock value, and low-stock count per category', async () => {
      const res = await request(app)
        .get('/api/v1/reports/inventory-summary')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      const summary = res.body.data.inventorySummary;
      expect(summary.length).toBe(2);

      const techCat = summary.find((c) => c.categoryName === 'Tech');
      expect(techCat).toBeDefined();
      expect(techCat.productCount).toBe(2);
      expect(techCat.totalUnits).toBe(22); // 20 + 2
      expect(techCat.lowStockCount).toBe(1); // p2 has stock 2 <= threshold 5
    });
  });
});
