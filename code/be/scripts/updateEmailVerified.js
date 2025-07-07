const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateEmailVerified = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Update all users to have emailVerified = true
    const result = await User.updateMany(
      { emailVerified: false }, // Chỉ update những user chưa verify
      { 
        $set: { 
          emailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationExpire: undefined
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} users to have emailVerified = true`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
};

// Run the migration
updateEmailVerified();