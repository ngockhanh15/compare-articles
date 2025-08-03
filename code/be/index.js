const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto"); // Thêm import crypto
const connectDB = require("./config/database");
const { generalLimiter } = require("./middleware/rateLimiter");
const createDefaultAdmin = require("./utils/createDefaultAdmin");
const initializePlagiarismSystem = require("./scripts/initializePlagiarismSystem");
const initializeDocumentAVL = require("./scripts/initializeDocumentAVL");
const authController = require("./controllers/authController");
const passport = require("passport");
const session = require("express-session");

const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("./models/User");

// Kiểm tra xem có Google OAuth credentials không
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  console.warn("⚠️ Google OAuth credentials not found. Google login will be disabled.");
} else {
  // Xóa GoogleStrategy duplicate và chỉ giữ lại một cái
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL || "http://localhost:3000"}/auth/google/callback`,
      },
    async function (accessToken, refreshToken, profile, done) {
      try {
        console.log("Google profile:", profile);
        
        const googleEmail = profile.emails?.[0]?.value;
        
        if (!googleEmail) {
          console.error("No email found in Google profile");
          return done(new Error("Email không được tìm thấy trong tài khoản Google"), null);
        }

        // Tìm user theo googleId trước
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User đã tồn tại với googleId này
          console.log("Found existing user by googleId:", user.email);
          
          // Cập nhật thông tin nếu cần
          if (user.email !== googleEmail) {
            console.log("Updating user email from", user.email, "to", googleEmail);
            user.email = googleEmail;
            user.name = profile.displayName || user.name;
            await user.save();
          }
          
          return done(null, user);
        }

        // Nếu không tìm thấy theo googleId, tìm theo email
        user = await User.findOne({ email: googleEmail });
        
        if (user) {
          // User tồn tại nhưng chưa có googleId
          if (user.googleId && user.googleId !== profile.id) {
            // User đã có googleId khác - có thể là conflict
            console.error("User already has different googleId:", user.googleId);
            return done(new Error("Tài khoản email này đã được liên kết với Google account khác"), null);
          }
          
          // Link Google account
          console.log("Found existing user by email, linking Google account:", user.email);
          try {
            user.googleId = profile.id;
            user.emailVerified = true;
            user.name = profile.displayName || user.name;
            await user.save();
            console.log("Successfully linked Google account to existing user");
          } catch (linkError) {
            console.error("Error linking Google account:", linkError);
            if (linkError.code === 11000) {
              return done(new Error("Google ID này đã được sử dụng bởi tài khoản khác"), null);
            }
            return done(linkError, null);
          }
        } else {
          // Tạo user mới
          console.log("Creating new user with Google account:", googleEmail);
          try {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: googleEmail,
              password: crypto.randomBytes(10).toString("hex"), // Dummy password
              role: "user",
              emailVerified: true,
              isActive: true,
            });
            console.log("Created new user:", user.email);
          } catch (createError) {
            console.error("Error creating new user:", createError);
            if (createError.code === 11000) {
              // Duplicate key error
              if (createError.keyPattern?.email) {
                return done(new Error("Email này đã được sử dụng"), null);
              }
              if (createError.keyPattern?.googleId) {
                return done(new Error("Google ID này đã được sử dụng"), null);
              }
            }
            return done(createError, null);
          }
        }

        return done(null, user);
      } catch (error) {
        console.error("Google Strategy error:", error);
        return done(error, null);
      }
    }
  )
  );
}

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user._id);
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user ID:", id);
    const user = await User.findById(id);
    if (!user) {
      console.log("User not found during deserialization:", id);
      return done(null, false);
    }
    console.log("User deserialized successfully:", user.email);
    done(null, user);
  } catch (error) {
    console.error("Error deserializing user:", error);
    done(error, null);
  }
});

// Load env vars
dotenv.config();

// Connect to database and initialize system
const initializeApp = async () => {
  try {
    console.log("🚀 Starting application initialization...");

    // 1. Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // 2. Create default admin
    await createDefaultAdmin();
    console.log("✅ Default admin created/verified");

    // 3. Initialize plagiarism detection system
    const plagiarismResult = await initializePlagiarismSystem();
    if (plagiarismResult.success) {
      console.log("✅ Plagiarism detection system initialized");
    } else {
      console.warn(
        "⚠️ Plagiarism detection system initialization failed:",
        plagiarismResult.error
      );
    }

    // 4. Initialize Document AVL Tree
    try {
      await initializeDocumentAVL();
      console.log("✅ Document AVL Tree initialized");
    } catch (avlError) {
      console.warn(
        "⚠️ Document AVL Tree initialization failed:",
        avlError.message
      );
    }

    console.log("🎉 Application initialization completed!");
  } catch (error) {
    console.error("❌ Application initialization failed:", error);
    // Không exit process, để server vẫn có thể chạy
  }
};

initializeApp();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply rate limiting to all requests
app.use(generalLimiter);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key_here",
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid', // Explicit session name
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true, // Prevent XSS
    },
  })
);

app.use(passport.initialize());
app.use(passport.session()); // 🔥 Cực kỳ quan trọng!

// Debug middleware for Google OAuth routes
app.use('/auth/google*', (req, res, next) => {
  console.log(`Google OAuth request: ${req.method} ${req.path}`);
  console.log('Session ID:', req.sessionID);
  console.log('Is authenticated:', req.isAuthenticated());
  console.log('User in session:', req.user ? req.user.email : 'None');
  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Filter Word API",
    status: "Server is running successfully",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api", require("./routes/api"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// Google OAuth routes - chỉ hoạt động khi có credentials
if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      console.log("Google callback initiated");
      passport.authenticate("google", (err, user, info) => {
        if (err) {
          console.error("Google authentication error:", err);
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
          return res.redirect(`${frontendUrl}/auth/callback?success=false&error=${encodeURIComponent(err.message)}`);
        }
        
        if (!user) {
          console.error("No user returned from Google authentication");
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
          return res.redirect(`${frontendUrl}/auth/callback?success=false&error=${encodeURIComponent("Đăng nhập Google thất bại")}`);
        }
        
        console.log("Google authentication successful, logging in user:", user.email);
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            return res.redirect(`${frontendUrl}/auth/callback?success=false&error=${encodeURIComponent("Lỗi khi đăng nhập")}`);
          }
          console.log("User logged in successfully, session ID:", req.sessionID);
          next();
        });
      })(req, res, next);
    },
    async (req, res) => {
      try {
        console.log("Google callback - req.user:", req.user);
        
        const user = req.user;

        if (!user) {
          console.error("No user found in req.user");
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
          return res.redirect(`${frontendUrl}/auth/callback?success=false&error=${encodeURIComponent("Không tìm thấy thông tin người dùng")}`);
        }

        // Kiểm tra xem user có đầy đủ thông tin cần thiết không
        if (!user._id) {
          console.error("User object missing _id:", user);
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
          return res.redirect(`${frontendUrl}/auth/callback?success=false&error=${encodeURIComponent("Thông tin người dùng không hợp lệ")}`);
        }

        // Tạo token
        const token = user.getSignedJwtToken();
        
        // Redirect về frontend với token và thông tin user cơ bản
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const userInfo = encodeURIComponent(JSON.stringify({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }));
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&success=true&user=${userInfo}`);
      } catch (error) {
        console.error("❌ Google login callback error:", error);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/auth/callback?success=false&error=${encodeURIComponent("Lỗi khi xử lý đăng nhập Google")}`);
      }
    }
  );
} else {
  app.get("/auth/google", (req, res) => {
    res.status(400).json({
      success: false,
      error: "Google OAuth không được cấu hình",
    });
  });

  app.get("/auth/google/callback", (req, res) => {
    res.status(400).json({
      success: false,
      error: "Google OAuth không được cấu hình",
    });
  });
}

// Route để xử lý Google OAuth failure
app.get("/auth/google/failure", (req, res) => {
  console.log("Google OAuth failure");
  res.status(401).json({
    success: false,
    error: "Đăng nhập Google thất bại",
  });
});

// Route để kiểm tra trạng thái đăng nhập Google
app.get("/auth/google/status", (req, res) => {
  console.log("Checking Google auth status:");
  console.log("- Session ID:", req.sessionID);
  console.log("- Is authenticated:", req.isAuthenticated());
  console.log("- User in session:", req.user ? req.user.email : 'None');
  
  if (req.isAuthenticated() && req.user) {
    // Tạo token cho user
    const token = req.user.getSignedJwtToken();
    
    // Trả về thông tin user kèm token
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        emailVerified: req.user.emailVerified,
        isActive: req.user.isActive,
        avatar: req.user.name ? req.user.name.charAt(0).toUpperCase() : 'U'
      },
      token: token,
      sessionId: req.sessionID
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Chưa đăng nhập",
      sessionId: req.sessionID
    });
  }
});

// Route để kiểm tra cấu hình Google OAuth
app.get("/auth/google/config", (req, res) => {
  const hasCredentials = !!(process.env.CLIENT_ID && process.env.CLIENT_SECRET);
  res.json({
    success: true,
    configured: hasCredentials,
    message: hasCredentials 
      ? "Google OAuth đã được cấu hình" 
      : "Google OAuth chưa được cấu hình",
  });
});

// Route debug để kiểm tra user theo email (chỉ dùng khi development)
if (process.env.NODE_ENV !== 'production') {
  app.get("/debug/user/:email", async (req, res) => {
    try {
      const user = await User.findOne({ email: req.params.email });
      if (!user) {
        return res.json({ found: false, message: "User not found" });
      }
      
      res.json({
        found: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          googleId: user.googleId,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Route để logout Google
app.get("/auth/google/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        success: false,
        error: "Lỗi khi đăng xuất",
      });
    }
    
    // Destroy session completely
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("Session destroy error:", sessionErr);
      }
      
      // Clear session cookie
      res.clearCookie('connect.sid');
      
      res.json({
        success: true,
        message: "Đăng xuất Google thành công",
      });
    });
  });
});

const sendTokenResponse =
  require("./controllers/authController").sendTokenResponse;

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Start server
app.listen(PORT, "127.0.0.1", () => {
  console.log("Server running on http://127.0.0.1:" + PORT);
});

module.exports = app;
