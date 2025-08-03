const dotenv = require("dotenv");
const connectDB = require("../config/database");
const User = require("../models/User");

// Load environment variables
dotenv.config();

const fixDuplicateUsers = async () => {
  try {
    console.log("🔧 Fixing duplicate users...\n");

    // 1. Connect to database
    await connectDB();
    console.log("✅ Connected to database");

    // 2. Find all users
    const allUsers = await User.find({});
    console.log(`📊 Found ${allUsers.length} total users`);

    // 3. Group users by email
    const emailGroups = {};
    allUsers.forEach(user => {
      if (!emailGroups[user.email]) {
        emailGroups[user.email] = [];
      }
      emailGroups[user.email].push(user);
    });

    // 4. Find duplicates
    const duplicates = Object.entries(emailGroups).filter(([email, users]) => users.length > 1);
    
    if (duplicates.length === 0) {
      console.log("✅ No duplicate users found");
      return;
    }

    console.log(`⚠️ Found ${duplicates.length} email addresses with duplicates:`);
    
    for (const [email, users] of duplicates) {
      console.log(`\n📧 Email: ${email}`);
      console.log(`   Users: ${users.length}`);
      
      // Sort users by creation date (oldest first)
      users.sort((a, b) => a.createdAt - b.createdAt);
      
      // Keep the oldest user, merge data from others
      const primaryUser = users[0];
      const duplicateUsers = users.slice(1);
      
      console.log(`   Primary user: ${primaryUser._id} (created: ${primaryUser.createdAt})`);
      
      // Merge data from duplicate users
      for (const duplicateUser of duplicateUsers) {
        console.log(`   Merging user: ${duplicateUser._id}`);
        
        // Merge googleId if primary doesn't have one
        if (!primaryUser.googleId && duplicateUser.googleId) {
          primaryUser.googleId = duplicateUser.googleId;
          console.log(`     → Added googleId: ${duplicateUser.googleId}`);
        }
        
        // Merge other fields if needed
        if (!primaryUser.name && duplicateUser.name) {
          primaryUser.name = duplicateUser.name;
        }
        
        if (!primaryUser.emailVerified && duplicateUser.emailVerified) {
          primaryUser.emailVerified = duplicateUser.emailVerified;
        }
        
        // Delete duplicate user
        await User.findByIdAndDelete(duplicateUser._id);
        console.log(`     → Deleted duplicate user: ${duplicateUser._id}`);
      }
      
      // Save primary user with merged data
      await primaryUser.save();
      console.log(`   ✅ Saved primary user with merged data`);
    }

    console.log("\n✅ Duplicate users fixed successfully!");
    
    // 5. Verify fix
    const finalUsers = await User.find({});
    console.log(`📊 Final user count: ${finalUsers.length}`);
    
    // Check for remaining duplicates
    const finalEmailGroups = {};
    finalUsers.forEach(user => {
      if (!finalEmailGroups[user.email]) {
        finalEmailGroups[user.email] = [];
      }
      finalEmailGroups[user.email].push(user);
    });
    
    const remainingDuplicates = Object.entries(finalEmailGroups).filter(([email, users]) => users.length > 1);
    
    if (remainingDuplicates.length === 0) {
      console.log("✅ No remaining duplicates");
    } else {
      console.log(`⚠️ Still have ${remainingDuplicates.length} duplicates`);
    }

  } catch (error) {
    console.error("❌ Error fixing duplicate users:", error);
  } finally {
    process.exit(0);
  }
};

// Run the fix
fixDuplicateUsers(); 