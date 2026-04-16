import rateLimit from 'express-rate-limit';

// Helper to safely get IP for rate limiting
const getClientIp = (req) => {
  // Get IP from various headers or connection
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
             '127.0.0.1';
  
  // If it's an IPv6-mapped IPv4 address, convert it
  if (ip && ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

// Environment-aware helper
const isTestOrDev = ['test', 'development'].includes(process.env.NODE_ENV);

// General API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1min dev / 15min prod
  max: isTestOrDev ? 100000 : 100, // 100k dev / 100 prod
  skip: () => process.env.NODE_ENV === 'test', // completely skip in test
  keyGenerator: (req) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    data: null
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      data: {
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      }
    });
  }
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1min dev / 15min prod
  max: isTestOrDev ? 10000 : 5, // 10k dev / 5 prod
  skip: () => process.env.NODE_ENV === 'test', // completely skip in test
  keyGenerator: (req) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      data: {
        retryAfter: Math.round(req.rateLimit.resetTime / 1000),
        suggestion: 'If you continue to have issues, please contact support.'
      }
    });
  }
});

// Rate limiting for sensitive operations (create, update, delete)
export const sensitiveRateLimit = rateLimit({
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1min dev / 1hr prod
  max: isTestOrDev ? 10000 : 50, // 10k dev / 50 prod
  skip: () => process.env.NODE_ENV === 'test', // completely skip in test
  keyGenerator: (req) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many sensitive operations, please try again later.',
      data: {
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      }
    });
  }
});

// Rate limiting for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1min dev / 1hr prod
  max: isTestOrDev ? 10000 : 20, // 10k dev / 20 prod
  skip: () => process.env.NODE_ENV === 'test', // completely skip in test
  keyGenerator: (req) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many file uploads, please try again later.',
      data: {
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      }
    });
  }
});

// Create different rate limiters for different user roles
export const createRoleBasedRateLimit = (role, limits) => {
  return rateLimit({
    windowMs: limits.windowMs || 15 * 60 * 1000,
    max: limits.max || 100,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      const ip = getClientIp(req);
      return req.user?.id ? `user:${req.user.id}` : `ip:${ip}`;
    },
    message: {
      success: false,
      message: `Rate limit exceeded for ${role}. Please try again later.`,
      data: null
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Role-specific rate limits
export const adminRateLimit = createRoleBasedRateLimit('admin', {
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isTestOrDev ? 100000 : 500 // Higher limit for admins
});

export const doctorRateLimit = createRoleBasedRateLimit('doctor', {
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isTestOrDev ? 100000 : 200
});

export const staffRateLimit = createRoleBasedRateLimit('staff', {
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isTestOrDev ? 100000 : 150
});

export const patientRateLimit = createRoleBasedRateLimit('patient', {
  windowMs: isTestOrDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isTestOrDev ? 100000 : 50 // Lower limit for patients
});
