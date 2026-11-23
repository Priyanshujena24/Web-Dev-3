const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

if (process.env.NODE_ENV !== 'test') {
  requiredEnvVars.push('MONGO_URI');
}

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  // If in test mode, set defaults for secrets rather than crashing
  if (process.env.NODE_ENV === 'test') {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_key_123456';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key_123456';
  } else {
    console.error(`Fatal Config Error: Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
}

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_inventory',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_key_123456',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key_123456',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '*',
  LOW_STOCK_DEFAULT_THRESHOLD: parseInt(process.env.LOW_STOCK_DEFAULT_THRESHOLD, 10) || 5
};

module.exports = env;
