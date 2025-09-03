const dotenv = require("dotenv");
const crypto = require("crypto");
const connectDB = require("./config/database");
const User = require("./models/User");

// Load environment variables
dotenv.config();

const setupTestUser = async () => {
  try {
    console.log("🔧 Setting up test user for frontend testing...\n");
    
    // Connect to database
    await connectDB();
    
    // Find or create test user
    let testUser = await User.findOne({ email: "frontend-test@example.com" });
    
    if (!testUser) {
      testUser = await User.create({
        name: "Frontend Test User",
        email: "frontend-test@example.com",
        password: "OldPassword123",
        emailVerified: true,
      });
      console.log("✅ Created test user: frontend-test@example.com");
    } else {
      console.log("✅ Found existing test user: frontend-test@example.com");
    }
    
    // Set reset token from generated token
    const resetToken = "120fb30cd21e47ed2306a4fa23603bca695f4cf6";
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    testUser.resetPasswordToken = resetPasswordToken;
    testUser.resetPasswordExpire = resetPasswordExpire;
    await testUser.save({ validateBeforeSave: false });
    
    console.log("✅ Set reset token for user");
    console.log("📋 Test URL for frontend:");
    console.log(`   http://localhost:5173/reset-password/${resetToken}`);
    console.log("");
    console.log("📝 Instructions:");
    console.log("   1. Open the URL above in your browser");
    console.log("   2. Enter a new password (e.g., NewPassword123)");
    console.log("   3. Check if it works without 'Chưa đăng nhập' error");
    console.log("");
    console.log(`⏰ Token expires at: ${new Date(resetPasswordExpire)}`);
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  } finally {
    process.exit(0);
  }
};

setupTestUser();
