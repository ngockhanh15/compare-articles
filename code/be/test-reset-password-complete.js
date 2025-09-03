const dotenv = require("dotenv");
const crypto = require("crypto");
const connectDB = require("./config/database");
const User = require("./models/User");

// Load environment variables
dotenv.config();

const testResetPassword = async () => {
  try {
    console.log("🧪 Testing Reset Password API...\n");
    
    // Connect to database
    await connectDB();
    
    // 1. Tìm hoặc tạo user để test
    console.log("1. Setting up test user...");
    let testUser = await User.findOne({ email: "test@example.com" });
    
    if (!testUser) {
      testUser = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "oldpassword123",
        emailVerified: true,
      });
      console.log("   ✅ Created test user: test@example.com");
    } else {
      console.log("   ✅ Found existing test user: test@example.com");
    }
    
    // 2. Set reset token
    const resetToken = "2a20b7d8b87b0f16bee5ec37d1341a7c0affefa6"; // Token từ generate script
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    testUser.resetPasswordToken = resetPasswordToken;
    testUser.resetPasswordExpire = resetPasswordExpire;
    await testUser.save({ validateBeforeSave: false });
    
    console.log("   ✅ Set reset token for user");
    console.log("   Reset token:", resetToken);
    console.log("   Expires at:", new Date(resetPasswordExpire));
    
    // 3. Test reset password API
    console.log("\n2. Testing reset password API...");
    const axios = require('axios');
    
    const response = await axios.put(`http://localhost:3000/api/auth/resetpassword/${resetToken}`, {
      password: 'NewPassword123',
      confirmPassword: 'NewPassword123'
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = response.data;
    console.log("   Status:", response.status);
    console.log("   Response:", JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log("   ✅ Reset password successful!");
      
      // 4. Verify password was changed
      console.log("\n3. Verifying password change...");
      const updatedUser = await User.findById(testUser._id).select('+password');
      const isNewPasswordValid = await updatedUser.matchPassword('NewPassword123');
      const isOldPasswordInvalid = !(await updatedUser.matchPassword('oldpassword123'));
      
      console.log("   New password works:", isNewPasswordValid ? "✅" : "❌");
      console.log("   Old password blocked:", isOldPasswordInvalid ? "✅" : "❌");
      console.log("   Reset token cleared:", !updatedUser.resetPasswordToken ? "✅" : "❌");
    } else {
      console.log("   ❌ Reset password failed:", data.error);
    }
    
    console.log("\n✅ Reset password API test completed!");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.response?.data || error.message);
  } finally {
    process.exit(0);
  }
};

testResetPassword();
