const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const env = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const { ORDER_STATUSES } = require('../src/utils/orderStatus');

const seedData = async () => {
  console.log('--- Starting Database Seeding ---');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    RefreshToken.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({})
  ]);

  console.log('✔ Cleared existing collections');

  const defaultPassword = 'Password@123';
  const passwordHash = await bcrypt.hash(defaultPassword, env.BCRYPT_ROUNDS);

  // 1. Create Users
  const usersToCreate = [
    {
      name: 'System Admin',
      email: 'admin@shop.test',
      passwordHash,
      role: 'admin',
      isActive: true,
      address: { line1: '100 Admin Plaza', city: 'Metro City', state: 'State', pincode: '100001' }
    },
    {
      name: 'Alpha Electronics Seller',
      email: 'seller1@shop.test',
      passwordHash,
      role: 'seller',
      isActive: true,
      address: { line1: '12 Tech Park', city: 'Silicon Valley', state: 'State', pincode: '200002' }
    },
    {
      name: 'Beta Lifestyle Seller',
      email: 'seller2@shop.test',
      passwordHash,
      role: 'seller',
      isActive: true,
      address: { line1: '45 Fashion Blvd', city: 'Metro City', state: 'State', pincode: '300003' }
    },
    {
      name: 'Alice Customer',
      email: 'customer1@shop.test',
      passwordHash,
      role: 'customer',
      isActive: true,
      address: { line1: '78 Maple Street', city: 'Springfield', state: 'State', pincode: '400004' }
    },
    {
      name: 'Bob Customer',
      email: 'customer2@shop.test',
      passwordHash,
      role: 'customer',
      isActive: true,
      address: { line1: '92 Oak Avenue', city: 'Riverdale', state: 'State', pincode: '500005' }
    },
    {
      name: 'Charlie Customer',
      email: 'customer3@shop.test',
      passwordHash,
      role: 'customer',
      isActive: true,
      address: { line1: '15 Pine Lane', city: 'Hill Valley', state: 'State', pincode: '600006' }
    }
  ];

  const createdUsers = await User.insertMany(usersToCreate);
  console.log(`✔ Inserted ${createdUsers.length} users`);

  const admin = createdUsers.find((u) => u.role === 'admin');
  const seller1 = createdUsers.find((u) => u.email === 'seller1@shop.test');
  const seller2 = createdUsers.find((u) => u.email === 'seller2@shop.test');
  const customer1 = createdUsers.find((u) => u.email === 'customer1@shop.test');
  const customer2 = createdUsers.find((u) => u.email === 'customer2@shop.test');
  const customer3 = createdUsers.find((u) => u.email === 'customer3@shop.test');

  // 2. Create Categories
  const categoriesToCreate = [
    { name: 'Electronics', slug: 'electronics', description: 'Gadgets, devices, and accessories' },
    { name: 'Fashion & Clothing', slug: 'fashion-clothing', description: 'Apparel, shoes, and lifestyle' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Appliances, cookware, and decor' },
    { name: 'Books & Stationery', slug: 'books-stationery', description: 'Novels, textbooks, and writing supplies' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', description: 'Workout gear and outdoor equipment' }
  ];

  const createdCategories = await Category.insertMany(categoriesToCreate);
  console.log(`✔ Inserted ${createdCategories.length} categories`);

  const catMap = {};
  createdCategories.forEach((c) => {
    catMap[c.slug] = c._id;
  });

  // 3. Create ~25 Products
  const productsToCreate = [
    // Seller 1 (Electronics, Home, Sports)
    {
      name: 'Wireless Noise-Canceling Headphones',
      description: 'Over-ear Bluetooth headphones with 30-hour battery life and high-fidelity sound.',
      priceCents: 14999, // $149.99
      category: catMap['electronics'],
      seller: seller1._id,
      stock: 35,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 15
    },
    {
      name: 'Mechanical Gaming Keyboard',
      description: 'RGB mechanical keyboard with tactile blue switches and detachable wrist rest.',
      priceCents: 7999,
      category: catMap['electronics'],
      seller: seller1._id,
      stock: 20,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 22
    },
    {
      name: 'Ultra HD 4K Webcam',
      description: 'Webcam with autofocus, dual stereo microphones, and privacy shutter.',
      priceCents: 5999,
      category: catMap['electronics'],
      seller: seller1._id,
      stock: 4, // LOW STOCK
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 45
    },
    {
      name: 'Ergonomic Vertical Mouse',
      description: 'Wireless vertical mouse designed to prevent wrist strain during long hours.',
      priceCents: 2999,
      category: catMap['electronics'],
      seller: seller1._id,
      stock: 2, // LOW STOCK
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 30
    },
    {
      name: 'Smart USB-C Fast Charger 65W',
      description: 'Compact GaN fast wall charger for laptops, tablets, and phones.',
      priceCents: 2499,
      category: catMap['electronics'],
      seller: seller1._id,
      stock: 0, // OUT OF STOCK
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 80
    },
    {
      name: 'Smart WiFi LED Desk Lamp',
      description: 'Dimmable color-changing desk lamp with Qi wireless smartphone charger base.',
      priceCents: 4500,
      category: catMap['home-kitchen'],
      seller: seller1._id,
      stock: 18,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 8
    },
    {
      name: 'Programmable Cold Brew Coffee Maker',
      description: 'Sleek stainless steel cold brew jug with fine mesh filter.',
      priceCents: 3999,
      category: catMap['home-kitchen'],
      seller: seller1._id,
      stock: 12,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 14
    },
    {
      name: 'Electric Pour-Over Kettle',
      description: 'Gooseneck temperature-controlled electric kettle with digital screen.',
      priceCents: 6899,
      category: catMap['home-kitchen'],
      seller: seller1._id,
      stock: 7,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 19
    },
    {
      name: 'Cast Iron Dutch Oven 6-Quart',
      description: 'Enameled cast iron round Dutch oven for braising, baking, and roasting.',
      priceCents: 8999,
      category: catMap['home-kitchen'],
      seller: seller1._id,
      stock: 15,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 11
    },
    {
      name: 'Stainless Steel Chef Knife 8-Inch',
      description: 'High-carbon Japanese steel kitchen knife with ergonomic pakkawood handle.',
      priceCents: 4999,
      category: catMap['home-kitchen'],
      seller: seller1._id,
      stock: 3, // LOW STOCK
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 27
    },
    {
      name: 'Adjustable Quick-Select Dumbbell Pair',
      description: 'Compact dumbbell pair adjusting from 5 to 50 lbs with turn of a dial.',
      priceCents: 29999,
      category: catMap['sports-fitness'],
      seller: seller1._id,
      stock: 8,
      lowStockThreshold: 3,
      isActive: true,
      soldCount: 9
    },
    {
      name: 'Non-Slip Eco Yoga Mat',
      description: 'Extra thick cushioning mat with alignment markings and carrying strap.',
      priceCents: 3499,
      category: catMap['sports-fitness'],
      seller: seller1._id,
      stock: 25,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 16
    },
    {
      name: 'Heavy Duty Resistance Loop Bands',
      description: 'Set of 5 natural latex resistance exercise loop bands with pouch.',
      priceCents: 1899,
      category: catMap['sports-fitness'],
      seller: seller1._id,
      stock: 40,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 50
    },

    // Seller 2 (Fashion, Books, Sports)
    {
      name: 'Classic Vintage Denim Jacket',
      description: 'Relaxed fit unlined heavyweight denim trucker jacket in washed blue.',
      priceCents: 6999,
      category: catMap['fashion-clothing'],
      seller: seller2._id,
      stock: 22,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 14
    },
    {
      name: 'Organic Cotton Crewneck T-Shirt 3-Pack',
      description: 'Breathable combed cotton tees in black, white, and heather grey.',
      priceCents: 2999,
      category: catMap['fashion-clothing'],
      seller: seller2._id,
      stock: 60,
      lowStockThreshold: 10,
      isActive: true,
      soldCount: 65
    },
    {
      name: 'Slim-Fit Stretch Chino Trousers',
      description: 'Comfortable everyday cotton-spandex chinos with tapered silhouette.',
      priceCents: 4499,
      category: catMap['fashion-clothing'],
      seller: seller2._id,
      stock: 19,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 21
    },
    {
      name: 'Waterproof All-Weather Trench Coat',
      description: 'Double-breasted timeless trench with storm flap and removable belt.',
      priceCents: 12999,
      category: catMap['fashion-clothing'],
      seller: seller2._id,
      stock: 6,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 8
    },
    {
      name: 'Merino Wool Knit Beanie',
      description: 'Soft temperature-regulating ribbed winter beanie cap.',
      priceCents: 1999,
      category: catMap['fashion-clothing'],
      seller: seller2._id,
      stock: 1, // LOW STOCK
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 42
    },
    {
      name: 'System Design Interview Guidebook',
      description: 'Comprehensive volume covering scalable distributed systems design.',
      priceCents: 3899,
      category: catMap['books-stationery'],
      seller: seller2._id,
      stock: 28,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 35
    },
    {
      name: 'Modern Web Development with Node & React',
      description: 'Full-stack guide to designing REST and real-time backend microservices.',
      priceCents: 4200,
      category: catMap['books-stationery'],
      seller: seller2._id,
      stock: 14,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 20
    },
    {
      name: 'Hardcover Dot Grid Journal & Fountain Pen Set',
      description: 'Heavyweight bleed-proof paper notebook with refillable aluminum fountain pen.',
      priceCents: 2499,
      category: catMap['books-stationery'],
      seller: seller2._id,
      stock: 30,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 18
    },
    {
      name: 'The Pragmatic Developer Mindset',
      description: 'Essential philosophies for engineering quality software at scale.',
      priceCents: 2799,
      category: catMap['books-stationery'],
      seller: seller2._id,
      stock: 5, // LOW STOCK
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 12
    },
    {
      name: 'Insulated Stainless Steel Water Bottle 32oz',
      description: 'Vacuum-insulated bottle keeping drinks cold for 24 hours, hot for 12.',
      priceCents: 2299,
      category: catMap['sports-fitness'],
      seller: seller2._id,
      stock: 45,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 55
    },
    {
      name: 'Hydration Backpack with 2L Water Bladder',
      description: 'Lightweight breathable pack for trail running, hiking, and cycling.',
      priceCents: 4199,
      category: catMap['sports-fitness'],
      seller: seller2._id,
      stock: 11,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 17
    },
    {
      name: 'Smart GPS Fitness Activity Tracker',
      description: 'Heart rate monitor, sleep tracking, and built-in workout coaching.',
      priceCents: 9999,
      category: catMap['sports-fitness'],
      seller: seller2._id,
      stock: 16,
      lowStockThreshold: 5,
      isActive: true,
      soldCount: 24
    }
  ];

  const createdProducts = await Product.insertMany(productsToCreate);
  console.log(`✔ Inserted ${createdProducts.length} products`);

  // 4. Create ~8 Sample Orders across various statuses
  const p1 = createdProducts[0]; // Headphones ($149.99)
  const p2 = createdProducts[1]; // Keyboard ($79.99)
  const p6 = createdProducts[5]; // Desk Lamp ($45.00)
  const p14 = createdProducts[13]; // Denim Jacket ($69.99)
  const p15 = createdProducts[14]; // T-Shirt 3-Pack ($29.99)
  const p19 = createdProducts[18]; // System Design Book ($38.99)

  const sampleOrders = [
    // Order 1: DELIVERED (Seller 1, Customer 1)
    {
      checkoutId: uuidv4(),
      customer: customer1._id,
      seller: seller1._id,
      items: [
        {
          product: p1._id,
          name: p1.name,
          unitPriceCents: p1.priceCents,
          quantity: 1,
          lineTotalCents: p1.priceCents
        }
      ],
      subtotalCents: p1.priceCents,
      totalCents: p1.priceCents,
      status: ORDER_STATUSES.DELIVERED,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer1._id, at: new Date(Date.now() - 5 * 86400000), note: 'Order placed' },
        { status: ORDER_STATUSES.CONFIRMED, changedBy: seller1._id, at: new Date(Date.now() - 4 * 86400000), note: 'Payment verified & order confirmed' },
        { status: ORDER_STATUSES.SHIPPED, changedBy: seller1._id, at: new Date(Date.now() - 3 * 86400000), note: 'Dispatched via Express Courier' },
        { status: ORDER_STATUSES.DELIVERED, changedBy: seller1._id, at: new Date(Date.now() - 1 * 86400000), note: 'Delivered to recipient' }
      ],
      delivery: { name: 'Alice Customer', phone: '1234567890', line1: '78 Maple Street', city: 'Springfield', state: 'State', pincode: '400004' },
      payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-DELIVERED1' },
      createdAt: new Date(Date.now() - 5 * 86400000)
    },
    // Order 2: SHIPPED (Seller 1, Customer 2)
    {
      checkoutId: uuidv4(),
      customer: customer2._id,
      seller: seller1._id,
      items: [
        {
          product: p2._id,
          name: p2.name,
          unitPriceCents: p2.priceCents,
          quantity: 2,
          lineTotalCents: p2.priceCents * 2
        }
      ],
      subtotalCents: p2.priceCents * 2,
      totalCents: p2.priceCents * 2,
      status: ORDER_STATUSES.SHIPPED,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer2._id, at: new Date(Date.now() - 3 * 86400000), note: 'Order placed' },
        { status: ORDER_STATUSES.CONFIRMED, changedBy: seller1._id, at: new Date(Date.now() - 2 * 86400000), note: 'Confirmed' },
        { status: ORDER_STATUSES.SHIPPED, changedBy: seller1._id, at: new Date(Date.now() - 1 * 86400000), note: 'Shipped tracking #TRK9981' }
      ],
      delivery: { name: 'Bob Customer', phone: '2345678901', line1: '92 Oak Avenue', city: 'Riverdale', state: 'State', pincode: '500005' },
      payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-SHIPPED1' },
      createdAt: new Date(Date.now() - 3 * 86400000)
    },
    // Order 3: CONFIRMED (Seller 1, Customer 3)
    {
      checkoutId: uuidv4(),
      customer: customer3._id,
      seller: seller1._id,
      items: [
        {
          product: p6._id,
          name: p6.name,
          unitPriceCents: p6.priceCents,
          quantity: 1,
          lineTotalCents: p6.priceCents
        }
      ],
      subtotalCents: p6.priceCents,
      totalCents: p6.priceCents,
      status: ORDER_STATUSES.CONFIRMED,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer3._id, at: new Date(Date.now() - 2 * 86400000), note: 'Order placed' },
        { status: ORDER_STATUSES.CONFIRMED, changedBy: seller1._id, at: new Date(Date.now() - 1 * 86400000), note: 'Order confirmed by seller' }
      ],
      delivery: { name: 'Charlie Customer', phone: '3456789012', line1: '15 Pine Lane', city: 'Hill Valley', state: 'State', pincode: '600006' },
      payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-CONFIRMED1' },
      createdAt: new Date(Date.now() - 2 * 86400000)
    },
    // Order 4: PENDING (Seller 1, Customer 1)
    {
      checkoutId: uuidv4(),
      customer: customer1._id,
      seller: seller1._id,
      items: [
        {
          product: p2._id,
          name: p2.name,
          unitPriceCents: p2.priceCents,
          quantity: 1,
          lineTotalCents: p2.priceCents
        }
      ],
      subtotalCents: p2.priceCents,
      totalCents: p2.priceCents,
      status: ORDER_STATUSES.PENDING,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer1._id, at: new Date(), note: 'Order placed' }
      ],
      delivery: { name: 'Alice Customer', phone: '1234567890', line1: '78 Maple Street', city: 'Springfield', state: 'State', pincode: '400004' },
      payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-PENDING1' },
      createdAt: new Date()
    },
    // Order 5: DELIVERED (Seller 2, Customer 2)
    {
      checkoutId: uuidv4(),
      customer: customer2._id,
      seller: seller2._id,
      items: [
        {
          product: p14._id,
          name: p14.name,
          unitPriceCents: p14.priceCents,
          quantity: 1,
          lineTotalCents: p14.priceCents
        },
        {
          product: p15._id,
          name: p15.name,
          unitPriceCents: p15.priceCents,
          quantity: 2,
          lineTotalCents: p15.priceCents * 2
        }
      ],
      subtotalCents: p14.priceCents + p15.priceCents * 2,
      totalCents: p14.priceCents + p15.priceCents * 2,
      status: ORDER_STATUSES.DELIVERED,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer2._id, at: new Date(Date.now() - 6 * 86400000), note: 'Order placed' },
        { status: ORDER_STATUSES.CONFIRMED, changedBy: seller2._id, at: new Date(Date.now() - 5 * 86400000), note: 'Confirmed' },
        { status: ORDER_STATUSES.SHIPPED, changedBy: seller2._id, at: new Date(Date.now() - 4 * 86400000), note: 'Shipped' },
        { status: ORDER_STATUSES.DELIVERED, changedBy: seller2._id, at: new Date(Date.now() - 2 * 86400000), note: 'Delivered' }
      ],
      delivery: { name: 'Bob Customer', phone: '2345678901', line1: '92 Oak Avenue', city: 'Riverdale', state: 'State', pincode: '500005' },
      payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-DELIVERED2' },
      createdAt: new Date(Date.now() - 6 * 86400000)
    },
    // Order 6: SHIPPED (Seller 2, Customer 3)
    {
      checkoutId: uuidv4(),
      customer: customer3._id,
      seller: seller2._id,
      items: [
        {
          product: p19._id,
          name: p19.name,
          unitPriceCents: p19.priceCents,
          quantity: 1,
          lineTotalCents: p19.priceCents
        }
      ],
      subtotalCents: p19.priceCents,
      totalCents: p19.priceCents,
      status: ORDER_STATUSES.SHIPPED,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer3._id, at: new Date(Date.now() - 2 * 86400000), note: 'Order placed' },
        { status: ORDER_STATUSES.CONFIRMED, changedBy: seller2._id, at: new Date(Date.now() - 1 * 86400000), note: 'Confirmed' },
        { status: ORDER_STATUSES.SHIPPED, changedBy: seller2._id, at: new Date(), note: 'Shipped' }
      ],
      delivery: { name: 'Charlie Customer', phone: '3456789012', line1: '15 Pine Lane', city: 'Hill Valley', state: 'State', pincode: '600006' },
      payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-SHIPPED2' },
      createdAt: new Date(Date.now() - 2 * 86400000)
    },
    // Order 7: CONFIRMED (Seller 2, Customer 1)
    {
      checkoutId: uuidv4(),
      customer: customer1._id,
      seller: seller2._id,
      items: [
        {
          product: p15._id,
          name: p15.name,
          unitPriceCents: p15.priceCents,
          quantity: 1,
          lineTotalCents: p15.priceCents
        }
      ],
      subtotalCents: p15.priceCents,
      totalCents: p15.priceCents,
      status: ORDER_STATUSES.CONFIRMED,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer1._id, at: new Date(Date.now() - 1 * 86400000), note: 'Order placed' },
        { status: ORDER_STATUSES.CONFIRMED, changedBy: seller2._id, at: new Date(), note: 'Confirmed' }
      ],
      delivery: { name: 'Alice Customer', phone: '1234567890', line1: '78 Maple Street', city: 'Springfield', state: 'State', pincode: '400004' },
      payment: { method: 'SIMULATED', status: 'PAID', simulated: true, reference: 'SIM-CONFIRMED2' },
      createdAt: new Date(Date.now() - 1 * 86400000)
    },
    // Order 8: CANCELLED (Seller 2, Customer 1)
    {
      checkoutId: uuidv4(),
      customer: customer1._id,
      seller: seller2._id,
      items: [
        {
          product: p14._id,
          name: p14.name,
          unitPriceCents: p14.priceCents,
          quantity: 1,
          lineTotalCents: p14.priceCents
        }
      ],
      subtotalCents: p14.priceCents,
      totalCents: p14.priceCents,
      status: ORDER_STATUSES.CANCELLED,
      statusHistory: [
        { status: ORDER_STATUSES.PENDING, changedBy: customer1._id, at: new Date(Date.now() - 4 * 86400000), note: 'Order placed' },
        { status: ORDER_STATUSES.CANCELLED, changedBy: customer1._id, at: new Date(Date.now() - 3 * 86400000), note: 'Cancelled by customer' }
      ],
      delivery: { name: 'Alice Customer', phone: '1234567890', line1: '78 Maple Street', city: 'Springfield', state: 'State', pincode: '400004' },
      payment: { method: 'SIMULATED', status: 'REFUNDED', simulated: true, reference: 'SIM-CANCELLED1' },
      cancelledAt: new Date(Date.now() - 3 * 86400000),
      createdAt: new Date(Date.now() - 4 * 86400000)
    }
  ];

  const createdOrders = await Order.insertMany(sampleOrders);
  console.log(`✔ Inserted ${createdOrders.length} sample orders`);

  // 5. Print Credentials Table
  console.log('\n======================================================================');
  console.log('                 SEEDING COMPLETED SUCCESSFULLY                      ');
  console.log('======================================================================');
  console.log('Role       | Email                   | Password     | Notes');
  console.log('-----------+-------------------------+--------------+-----------------');
  console.log('Admin      | admin@shop.test         | Password@123 | Full system access');
  console.log('Seller 1   | seller1@shop.test       | Password@123 | Alpha Electronics');
  console.log('Seller 2   | seller2@shop.test       | Password@123 | Beta Lifestyle');
  console.log('Customer 1 | customer1@shop.test     | Password@123 | Alice Customer');
  console.log('Customer 2 | customer2@shop.test     | Password@123 | Bob Customer');
  console.log('Customer 3 | customer3@shop.test     | Password@123 | Charlie Customer');
  console.log('======================================================================\n');
};

const run = async () => {
  let memoryServer = null;
  try {
    const isMemory = process.argv.includes('--memory') || process.env.USE_MEMORY_DB === 'true';
    if (isMemory) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const uri = memoryServer.getUri();
      console.log(`Starting ephemeral in-memory MongoDB at: ${uri}`);
      await mongoose.connect(uri);
    } else {
      await connectDB();
    }

    await seedData();

    if (memoryServer) {
      await memoryServer.stop();
    } else {
      await disconnectDB();
    }
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = { seedData };
