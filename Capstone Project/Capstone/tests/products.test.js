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

describe('Products & Categories Module', () => {
  let admin, seller, customer, category;

  beforeEach(async () => {
    admin = await createTestUser({ email: 'admin@prod.test', role: 'admin' });
    seller = await createTestUser({ email: 'seller@prod.test', role: 'seller' });
    customer = await createTestUser({ email: 'cust@prod.test', role: 'customer' });

    category = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      description: 'Devices and gadgets'
    });
  });

  describe('Product CRUD & Permissions', () => {
    it('should allow seller to create a product and force seller to self', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          name: 'Wireless Mouse',
          description: 'High precision wireless mouse',
          priceCents: 2500,
          category: category._id.toString(),
          stock: 50,
          lowStockThreshold: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.seller.toString()).toBe(seller.user._id.toString());
      expect(res.body.data.product.price).toBe('25.00');
    });

    it('should return 400 validation error when creating product with invalid price or missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          name: 'Incomplete Product'
          // missing priceCents, category, stock
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should forbid customer from creating product (403)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          name: 'Customer Product',
          description: 'Valid description here',
          priceCents: 1000,
          category: category._id.toString(),
          stock: 10
        });

      expect(res.status).toBe(403);
    });

    it('should allow seller to view own products via /products/mine', async () => {
      await Product.create({
        name: 'Seller Item 1',
        description: 'Description 1',
        priceCents: 1500,
        category: category._id,
        seller: seller.user._id,
        stock: 20
      });

      const res = await request(app)
        .get('/api/v1/products/mine')
        .set('Authorization', `Bearer ${seller.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe('Seller Item 1');
    });
  });

  describe('Product Search, Filtering, Sorting and Pagination', () => {
    beforeEach(async () => {
      await Product.insertMany([
        {
          name: 'Gaming Laptop Pro',
          description: 'Powerful gaming laptop with RTX GPU',
          priceCents: 150000,
          category: category._id,
          seller: seller.user._id,
          stock: 10,
          isActive: true
        },
        {
          name: 'Budget Laptop Air',
          description: 'Lightweight everyday budget notebook',
          priceCents: 45000,
          category: category._id,
          seller: seller.user._id,
          stock: 5,
          isActive: true
        },
        {
          name: 'Mechanical Gaming Keyboard',
          description: 'RGB mechanical gaming switch keyboard',
          priceCents: 8000,
          category: category._id,
          seller: seller.user._id,
          stock: 0, // out of stock
          isActive: true
        }
      ]);
    });

    it('should filter products by price range', async () => {
      const res = await request(app).get('/api/v1/products?minPrice=50&maxPrice=1000');
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2); // $80 and $450
    });

    it('should filter products by inStock=true', async () => {
      const res = await request(app).get('/api/v1/products?inStock=true');
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      expect(res.body.data.products.every((p) => p.stock > 0)).toBe(true);
    });

    it('should sort products by price ascending', async () => {
      const res = await request(app).get('/api/v1/products?sort=price');
      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p) => p.priceCents);
      expect(prices).toEqual([8000, 45000, 150000]);
    });

    it('should paginate products properly', async () => {
      const res = await request(app).get('/api/v1/products?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
    });
  });
});
