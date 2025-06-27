// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true // Important for cookies
}));
app.use(express.json());
app.use(cookieParser());

// Import routers and middleware
const authRouter = require('./auth-routes');
const r2Router = require('./r2-routes');
const apiRouter = require('./api-routes');
const { authenticateToken, redirectIfAuthenticated } = require('./auth-middleware');

// Auth routes (public)
app.use('/auth', authRouter);

// API routes (public with API key authentication)
app.use('/api', apiRouter);

// Redirect to login if accessing protected routes without authentication
app.get('/', (req, res, next) => {
  const { accessToken } = req.cookies;
  if (!accessToken) {
    return res.redirect('/auth/login');
  }
  next();
});

// API Documentation page (protected)
app.get('/api-docs.html', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/api-docs.html'));
});

// Serve static files from the frontend directory (with authentication)
app.use(express.static(path.join(__dirname, '../frontend')));

// Protected R2 routes
app.use('/r2', authenticateToken, r2Router);

// Example: start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
