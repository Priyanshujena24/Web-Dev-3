const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const User = require('../src/models/User');

let mongoServer;

const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

const clearTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

const createTestUser = async ({
  name = 'Test User',
  email = 'test@example.com',
  role = 'customer',
  isActive = true
} = {}) => {
  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    isActive,
    address: {
      line1: '123 Test St',
      city: 'Testville',
      state: 'TS',
      pincode: '12345'
    }
  });

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  return { user, token };
};

module.exports = {
  connectTestDB,
  closeTestDB,
  clearTestDB,
  createTestUser
};
