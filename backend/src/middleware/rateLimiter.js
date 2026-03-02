import rateLimit from 'express-rate-limit';

// Global rate limiter (10 req/min per IP)
export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 mins
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,  // Disable X-RateLimit-* headers
  keyGenerator: (req, res) => {
    // Rate limit per IP (or per user if authenticated)
    return req.user?.id || req.ip;
  },
});

// Stricter limiter for generation (max 20 per hour)
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many generation requests. Please wait before trying again.',
  keyGenerator: (req, res) => req.user?.id || req.ip,
});

// Auth limiter (5 failed attempts = 15 min lockout)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});
