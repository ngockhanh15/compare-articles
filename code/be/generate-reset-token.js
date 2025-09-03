const crypto = require("crypto");

// Tạo token giống như trong model User
function createResetToken() {
  // Generate random token
  const resetToken = crypto.randomBytes(20).toString("hex");
  
  // Hash token and set to resetPasswordToken field
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire time (10 minutes)
  const resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  console.log("Reset Token (to use in URL):", resetToken);
  console.log("Hashed Token (to save in DB):", resetPasswordToken);
  console.log("Expire Time:", new Date(resetPasswordExpire));
  
  return {
    resetToken,
    resetPasswordToken,
    resetPasswordExpire
  };
}

createResetToken();
