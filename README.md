# Secure Authentication Backend

A production-ready authentication backend built with Node.js, Express, and MongoDB.

## Features
- User registration and login
- Secure password hashing with bcrypt (12 salt rounds)
- JWT token-based authentication with expiration
- Input validation and sanitization
- Security headers using Helmet.js
- Brute-force protection with express-rate-limit
- NoSQL Injection protection (via Mongoose schemas)
- Centralized error handling

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Security:** JWT, Bcryptjs, Helmet, Express-Rate-Limit

## Prerequisites
- Node.js (v14+)
- MongoDB (Running locally or Atlas)

## Installation Steps
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (use `.env.example` as a template):
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/auth_db
   JWT_SECRET=your_super_secret_key
   JWT_EXPIRE=30d
   NODE_ENV=development
   ```

## How to Run Locally
### Development Mode (with nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints
### Auth
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user profile (Requires JWT in Authorization header)

## Security Features
- **Helmet:** Sets various HTTP headers to help protect your app.
- **Rate Limiting:** Prevents brute force attacks by limiting requests from a single IP.
- **Bcrypt:** Strong password hashing to ensure data security even in case of a breach.
- **JWT:** Secure stateless authentication.
