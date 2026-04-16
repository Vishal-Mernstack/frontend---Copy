/**
 * XSS Sanitization Middleware
 * Sanitizes user input to prevent XSS attacks
 */

// HTML escape function
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  // eslint-disable-next-line no-useless-escape
  return text.replace(/[&<>"'`=\/]/g, char => htmlEntities[char] || char);
}

// Recursively sanitize object
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const sanitizedKey = typeof key === 'string' ? escapeHtml(key) : key;
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Main sanitization middleware
export function sanitizeInput(req, res, next) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

// Specific field sanitization for sensitive fields
export function sanitizeFields(fields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') return next();
    
    fields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = escapeHtml(req.body[field]);
      }
    });
    
    next();
  };
}

// Export escapeHtml for use in controllers
export { escapeHtml };
