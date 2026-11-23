const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async (uri = env.MONGO_URI) => {
  try {
    const conn = await mongoose.connect(uri);
    if (env.NODE_ENV !== 'test') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error(`MongoDB Disconnect Error: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
