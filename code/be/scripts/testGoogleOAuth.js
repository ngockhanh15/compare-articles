const dotenv = require("dotenv");
const connectDB = require("../config/database");
const User = require("../models/User");

// Load environment variables
dotenv.config();

const testGoogleOAuth = async () => {
  try {
    console.log("🧪 Testing Google OAuth Configuration...\n");

    // 1. Check environment variables
    console.log("1. Checking environment variables:");
    const hasClientId = !!process.env.CLIENT_ID;
    const hasClientSecret = !!process.env.CLIENT_SECRET;
    const hasFrontendUrl = !!process.env.FRONTEND_URL;
    const hasSessionSecret = !!process.env.SESSION_SECRET;

    console.log(`   ✅ CLIENT_ID: ${hasClientId ? "✓" : "✗"}`);
    console.log(`   ✅ CLIENT_SECRET: ${hasClientSecret ? "✓" : "✗"}`);
    console.log(`   ✅ FRONTEND_URL: ${hasFrontendUrl ? "✓" : "✗"}`);
    console.log(`   ✅ SESSION_SECRET: ${hasSessionSecret ? "✓" : "✗"}`);

    if (!hasClientId || !hasClientSecret) {
      console.log("\n❌ Google OAuth credentials missing!");
      console.log("   Please check your .env file and follow GOOGLE_OAUTH_SETUP.md");
      return;
    }

    // 2. Test database connection
    console.log("\n2. Testing database connection:");
    await connectDB();
    console.log("   ✅ Database connected successfully");

    // 3. Test User model
    console.log("\n3. Testing User model:");
    const userCount = await User.countDocuments();
    console.log(`   ✅ User model working (${userCount} users found)`);

    // 4. Test Google OAuth URLs
    console.log("\n4. Testing Google OAuth URLs:");
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    
    console.log(`   🔗 Google OAuth URL: ${baseUrl}/auth/google`);
    console.log(`   🔗 Callback URL: ${baseUrl}/auth/google/callback`);
    console.log(`   🔗 Frontend URL: ${frontendUrl}`);
    console.log(`   🔗 Auth Callback: ${frontendUrl}/auth/callback`);

    // 5. Test configuration endpoint
    console.log("\n5. Testing configuration endpoint:");
    console.log(`   🔗 Config check: ${baseUrl}/auth/google/config`);

    console.log("\n✅ Google OAuth configuration test completed!");
    console.log("\n📝 Next steps:");
    console.log("   1. Start the backend server: npm start");
    console.log("   2. Start the frontend: cd ../fe && npm run dev");
    console.log("   3. Test Google login at: http://localhost:5173");
    console.log("   4. Check logs for any errors");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Check your .env file");
    console.log("   2. Ensure MongoDB is running");
    console.log("   3. Follow GOOGLE_OAUTH_SETUP.md");
  } finally {
    process.exit(0);
  }
};

// Run the test
testGoogleOAuth(); 