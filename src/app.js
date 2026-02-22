const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const errorHandler = require('./middleware/error');
const authRoutes = require('./routes/authRoutes');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());

// Set security headers
app.use(helmet());

// Brute force protection (Rate limiting)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api/v1/auth', authRoutes);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
