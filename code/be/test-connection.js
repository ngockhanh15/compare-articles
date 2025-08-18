require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker';
    console.log('Connecting to:', uri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    
    // Test a simple query
    const admin = mongoose.connection.db.admin();
    const result = await admin.serverStatus();
    console.log('MongoDB version:', result.version);
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testConnection();
