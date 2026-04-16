import { randomUUID } from 'crypto';
import { query } from '../config/db.js';

const tableExistsCache = new Map();

async function tableExists(tableName) {
  if (tableExistsCache.has(tableName)) {
    return tableExistsCache.get(tableName);
  }

  const result = await query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );

  const exists = Boolean(result.rows[0]?.exists);
  tableExistsCache.set(tableName, exists);
  return exists;
}

// Enhanced audit logging middleware
export function auditLogger(action, entityType = null) {
  return async (req, res, next) => {
    // Store original res.json method
    const originalJson = res.json;
    let responseData = null;
    let statusCode = null;

    // Override res.json to capture response data
    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Continue to next middleware
    res.on('finish', async () => {
      try {
        const userId = req.user?.id || null;
        const userRole = req.user?.role || null;
        const userIp = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || null;
        const requestId = req.headers['x-request-id'] || randomUUID();
        
        // Determine action type
        let actionType = action;
        if (req.method === 'GET') actionType = `READ_${entityType?.toUpperCase() || 'RESOURCE'}`;
        if (req.method === 'POST') actionType = `CREATE_${entityType?.toUpperCase() || 'RESOURCE'}`;
        if (req.method === 'PUT') actionType = `UPDATE_${entityType?.toUpperCase() || 'RESOURCE'}`;
        if (req.method === 'DELETE') actionType = `DELETE_${entityType?.toUpperCase() || 'RESOURCE'}`;

        // Extract entity ID from URL parameters
        const entityId = req.params.id || req.params.patient_id || req.params.doctor_id || null;

        // Create audit log entry
        const auditLog = {
          request_id: requestId,
          user_id: userId,
          user_role: userRole,
          action: actionType,
          entity_type: entityType,
          entity_id: entityId,
          method: req.method,
          endpoint: req.originalUrl,
          ip_address: userIp,
          user_agent: userAgent,
          request_body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
          response_status: statusCode,
          response_data: statusCode >= 400 ? JSON.stringify(responseData) : null,
          success: statusCode >= 200 && statusCode < 300,
          timestamp: new Date(),
          duration: Date.now() - req.startTime,
          details: {
            query: req.query,
            params: req.params,
            headers: {
              'content-type': req.get('Content-Type'),
              'authorization': req.get('Authorization') ? '[REDACTED]' : null,
              'x-forwarded-for': req.get('X-Forwarded-For'),
              'referer': req.get('Referer')
            }
          }
        };

        // Log to database (wrapped in try-catch to prevent failures from breaking requests)
        try {
          if (!(await tableExists("audit_logs"))) {
            return;
          }

          await query(`
            INSERT INTO audit_logs (
              request_id, user_id, user_role, action, entity_type, entity_id,
              method, endpoint, ip_address, user_agent, request_body, response_status,
              response_data, success, timestamp, duration, details
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          `, [
            auditLog.request_id,
            auditLog.user_id,
            auditLog.user_role,
            auditLog.action,
            auditLog.entity_type,
            auditLog.entity_id,
            auditLog.method,
            auditLog.endpoint,
            auditLog.ip_address,
            auditLog.user_agent,
            auditLog.request_body,
            auditLog.response_status,
            auditLog.response_data,
            auditLog.success,
            auditLog.timestamp,
            auditLog.duration,
            JSON.stringify(auditLog.details)
          ]);
        } catch (dbError) {
          // Log error but don't break the request
          console.error('[AUDIT] Failed to write audit log:', dbError.message);
        }

        // Log to console for development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AUDIT] ${auditLog.action} by ${auditLog.user_role}(${auditLog.user_id}) - ${auditLog.method} ${auditLog.endpoint} - ${auditLog.success ? 'SUCCESS' : 'FAILURE'} (${auditLog.duration}ms)`);
        }

        // Log security events
        if (auditLog.action.includes('LOGIN') && !auditLog.success) {
          await logSecurityEvent('FAILED_LOGIN', auditLog);
        }
        
        if (auditLog.action.includes('DELETE') && auditLog.success) {
          await logSecurityEvent('DATA_DELETION', auditLog);
        }

        if (statusCode === 403) {
          await logSecurityEvent('UNAUTHORIZED_ACCESS', auditLog);
        }

        if (statusCode === 429) {
          await logSecurityEvent('RATE_LIMIT_EXCEEDED', auditLog);
        }

      } catch (error) {
        console.error('Audit logging error:', error);
        // Don't fail the request if audit logging fails
      }
    });

    next();
  };
}

// Security event logging
async function logSecurityEvent(eventType, auditLog) {
  try {
    if (!(await tableExists("security_events"))) {
      return;
    }

    await query(`
      INSERT INTO security_events (
        event_type, user_id, user_role, ip_address, user_agent,
        endpoint, request_id, timestamp, details, severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      eventType,
      auditLog.user_id,
      auditLog.user_role,
      auditLog.ip_address,
      auditLog.user_agent,
      auditLog.endpoint,
      auditLog.request_id,
      auditLog.timestamp,
      JSON.stringify({
        method: auditLog.method,
        body: auditLog.request_body,
        response_status: auditLog.response_status
      }),
      getSeverityLevel(eventType)
    ]);
  } catch (error) {
    console.error('Security event logging error:', error);
  }
}

// Get severity level for security events
function getSeverityLevel(eventType) {
  const severityMap = {
    'FAILED_LOGIN': 'medium',
    'UNAUTHORIZED_ACCESS': 'high',
    'RATE_LIMIT_EXCEEDED': 'medium',
    'DATA_DELETION': 'low',
    'SUSPICIOUS_ACTIVITY': 'high',
    'BRUTE_FORCE_ATTEMPT': 'critical'
  };
  return severityMap[eventType] || 'low';
}

// Request ID middleware
export function requestId(req, res, next) {
  req.startTime = Date.now();
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

// Audit log query functions
export async function getAuditLogs(filters = {}) {
  let queryStr = `
    SELECT * FROM audit_logs 
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.userId) {
    queryStr += ` AND user_id = $${paramIndex++}`;
    params.push(filters.userId);
  }

  if (filters.userRole) {
    queryStr += ` AND user_role = $${paramIndex++}`;
    params.push(filters.userRole);
  }

  if (filters.action) {
    queryStr += ` AND action ILIKE $${paramIndex++}`;
    params.push(`%${filters.action}%`);
  }

  if (filters.entityType) {
    queryStr += ` AND entity_type = $${paramIndex++}`;
    params.push(filters.entityType);
  }

  if (filters.startDate) {
    queryStr += ` AND timestamp >= $${paramIndex++}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    queryStr += ` AND timestamp <= $${paramIndex++}`;
    params.push(filters.endDate);
  }

  if (filters.success !== undefined) {
    queryStr += ` AND success = $${paramIndex++}`;
    params.push(filters.success);
  }

  queryStr += ` ORDER BY timestamp DESC`;

  if (filters.limit) {
    queryStr += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  if (filters.offset) {
    queryStr += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
  }

  const result = await query(queryStr, params);
  return result.rows;
}

export async function getSecurityEvents(filters = {}) {
  let queryStr = `
    SELECT * FROM security_events 
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.eventType) {
    queryStr += ` AND event_type = $${paramIndex++}`;
    params.push(filters.eventType);
  }

  if (filters.severity) {
    queryStr += ` AND severity = $${paramIndex++}`;
    params.push(filters.severity);
  }

  if (filters.startDate) {
    queryStr += ` AND timestamp >= $${paramIndex++}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    queryStr += ` AND timestamp <= $${paramIndex++}`;
    params.push(filters.endDate);
  }

  queryStr += ` ORDER BY timestamp DESC`;

  if (filters.limit) {
    queryStr += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
  }

  const result = await query(queryStr, params);
  return result.rows;
}

// Audit log statistics
export async function getAuditStatistics(timeRange = '24h') {
  let timeFilter = '';
  switch (timeRange) {
    case '1h':
      timeFilter = "AND timestamp >= NOW() - INTERVAL '1 hour'";
      break;
    case '24h':
      timeFilter = "AND timestamp >= NOW() - INTERVAL '24 hours'";
      break;
    case '7d':
      timeFilter = "AND timestamp >= NOW() - INTERVAL '7 days'";
      break;
    case '30d':
      timeFilter = "AND timestamp >= NOW() - INTERVAL '30 days'";
      break;
  }

  const queries = [
    // Total requests
    `SELECT COUNT(*) as total_requests FROM audit_logs WHERE 1=1 ${timeFilter}`,
    
    // Success rate
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE success = true) as successful,
      COUNT(*) FILTER (WHERE success = false) as failed
    FROM audit_logs WHERE 1=1 ${timeFilter}`,
    
    // Top users
    `SELECT user_role, COUNT(*) as request_count 
    FROM audit_logs WHERE 1=1 ${timeFilter}
    GROUP BY user_role 
    ORDER BY request_count DESC 
    LIMIT 5`,
    
    // Top actions
    `SELECT action, COUNT(*) as action_count 
    FROM audit_logs WHERE 1=1 ${timeFilter}
    GROUP BY action 
    ORDER BY action_count DESC 
    LIMIT 10`,
    
    // Average response time
    `SELECT AVG(duration) as avg_duration 
    FROM audit_logs WHERE 1=1 ${timeFilter}`,
    
    // Error rate by endpoint
    `SELECT endpoint, COUNT(*) as error_count 
    FROM audit_logs WHERE success = false ${timeFilter}
    GROUP BY endpoint 
    ORDER BY error_count DESC 
    LIMIT 5`
  ];

  const results = await Promise.all(queries.map(q => query(q)));
  
  return {
    totalRequests: parseInt(results[0].rows[0].total_requests),
    successRate: {
      total: parseInt(results[1].rows[0].total),
      successful: parseInt(results[1].rows[0].successful),
      failed: parseInt(results[1].rows[0].failed),
      percentage: results[1].rows[0].total > 0 
        ? (results[1].rows[0].successful / results[1].rows[0].total * 100).toFixed(2)
        : 0
    },
    topUsers: results[2].rows,
    topActions: results[3].rows,
    avgResponseTime: parseFloat(results[4].rows[0].avg_duration || 0).toFixed(2),
    topErrorEndpoints: results[5].rows
  };
}
