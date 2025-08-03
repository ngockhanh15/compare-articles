const express = require("express");
const passport = require("passport");
const session = require("cookie-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

const app = express();

// Setup session
app.use(
  session({
    name: "session",
    keys: ["secretkey"],
    maxAge: 24 * 60 * 60 * 1000,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Serialize User
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Setup Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
    }
  )
);

// Routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-failed" }),
  (req, res) => {
    // Giả sử bạn tạo ra một JWT ở đây
    const jwt = createJwtToken(req.user); // Tuỳ vào hệ thống của bạn
    res.redirect(`http://localhost:5173/auth/callback?token=${jwt}`);
  }
);

app.get("/auth/user", (req, res) => {
  res.send(req.user);
});

app.get("/auth/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
