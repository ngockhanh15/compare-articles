const dotenv = require("dotenv");
const connectDB = require("../config/database");
const User = require("../models/User");

// Load environment variables
dotenv.config();

const testGoogleLoginFlow = async () => {
  try {
    console.log("🧪 Testing Google Login Flow...\n");

    // 1. Check environment variables
    console.log("1. Checking environment variables:");
    const hasClientId = !!process.env.CLIENT_ID;
    const hasClientSecret = !!process.env.CLIENT_SECRET;
    const hasFrontendUrl = !!process.env.FRONTEND_URL;

    console.log(`   ✅ CLIENT_ID: ${hasClientId ? "✓" : "✗"}`);
    console.log(`   ✅ CLIENT_SECRET: ${hasClientSecret ? "✓" : "✗"}`);
    console.log(`   ✅ FRONTEND_URL: ${hasFrontendUrl ? "✓" : "✗"}`);

    if (!hasClientId || !hasClientSecret) {
      console.log("\n❌ Google OAuth credentials missing!");
      return;
    }

    // 2. Connect to database
    await connectDB();
    console.log("\n2. ✅ Database connected");

    // 3. Test URLs
    console.log("\n3. Testing URLs:");
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    
    console.log(`   🔗 Google OAuth URL: ${baseUrl}/auth/google`);
    console.log(`   🔗 Callback URL: ${baseUrl}/auth/google/callback`);
    console.log(`   🔗 Frontend Auth Callback: ${frontendUrl}/auth/callback`);
    console.log(`   🔗 Config Check: ${baseUrl}/auth/google/config`);

    // 4. Test with sample user
    console.log("\n4. Testing with sample user:");
    
    // Tạo hoặc tìm user test
    let testUser = await User.findOne({ email: "test@example.com" });
    
    if (!testUser) {
      console.log("   Creating test user...");
      testUser = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "user",
        emailVerified: true,
        isActive: true,
      });
      console.log("   ✅ Test user created");
    } else {
      console.log("   ✅ Test user found");
    }

    // 5. Simulate Google login flow
    console.log("\n5. Simulating Google login flow:");
    
    // Giả lập Google profile
    const mockGoogleProfile = {
      id: "123456789",
      displayName: "Test User",
      emails: [{ value: "test@example.com" }]
    };

    console.log("   Mock Google profile:", mockGoogleProfile);

    // Test logic tương tự như trong GoogleStrategy
    let user = await User.findOne({ googleId: mockGoogleProfile.id });
    
    if (!user) {
      user = await User.findOne({ email: mockGoogleProfile.emails[0].value });
      
      if (user) {
        console.log("   ✅ Found user by email, would link Google account");
        user.googleId = mockGoogleProfile.id;
        user.emailVerified = true;
        await user.save();
        console.log("   ✅ Google account linked successfully");
      } else {
        console.log("   ✅ Would create new user with Google account");
      }
    } else {
      console.log("   ✅ Found user by googleId");
    }

    // 6. Test token generation
    console.log("\n6. Testing token generation:");
    try {
      const token = testUser.getSignedJwtToken();
      console.log("   ✅ Token generated successfully");
      console.log(`   Token preview: ${token.substring(0, 20)}...`);
    } catch (error) {
      console.log("   ❌ Token generation failed:", error.message);
    }

    // 7. Test redirect URL
    console.log("\n7. Testing redirect URL:");
    const userInfo = {
      id: testUser._id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
      emailVerified: testUser.emailVerified
    };
    
    const encodedUserInfo = encodeURIComponent(JSON.stringify(userInfo));
    const redirectUrl = `${frontendUrl}/auth/callback?token=test_token&success=true&user=${encodedUserInfo}`;
    
    console.log("   ✅ Redirect URL generated:");
    console.log(`   ${redirectUrl}`);

    console.log("\n✅ Google login flow test completed!");
    console.log("\n📝 Next steps:");
    console.log("   1. Start backend: npm start");
    console.log("   2. Start frontend: cd ../fe && npm run dev");
    console.log("   3. Test Google login at: http://localhost:5173");
    console.log("   4. Check browser console for logs");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
  } finally {
    process.exit(0);
  }
};

// Run the test
testGoogleLoginFlow(); 