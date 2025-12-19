import rateLimit from 'express-rate-limit';
import { rateLimitConfig } from '@configs';

export const rateLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: rateLimitConfig.message,
  standardHeaders: rateLimitConfig.standardHeaders,
  legacyHeaders: rateLimitConfig.legacyHeaders,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: rateLimitConfig.message,
    });
  },
});

// Stricter rate limit for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
    });
  },
});
