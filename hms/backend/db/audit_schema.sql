-- Audit Logging and Security Events Schema
-- This file creates tables for comprehensive audit logging and security monitoring

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_status INTEGER,
    response_data JSONB,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration INTEGER, -- Response time in milliseconds
    details JSONB,
    
    -- Indexes for performance
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_user_role (user_role),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_entity_type (entity_type),
    INDEX idx_audit_logs_timestamp (timestamp),
    INDEX idx_audit_logs_success (success),
    INDEX idx_audit_logs_ip_address (ip_address),
    INDEX idx_audit_logs_endpoint (endpoint)
);

-- Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(255),
    request_id VARCHAR(36),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB,
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    
    -- Indexes for performance
    INDEX idx_security_events_event_type (event_type),
    INDEX idx_security_events_user_id (user_id),
    INDEX idx_security_events_ip_address (ip_address),
    INDEX idx_security_events_timestamp (timestamp),
    INDEX idx_security_events_severity (severity),
    INDEX idx_security_events_resolved (resolved)
);

-- Failed Login Attempts Table (for brute force detection)
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempt_count INTEGER DEFAULT 1,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_failed_login_attempts_email (email),
    INDEX idx_failed_login_attempts_ip (ip_address),
    INDEX idx_failed_login_attempts_timestamp (timestamp),
    UNIQUE (email, ip_address)
);

-- Data Access Log Table (for sensitive data access tracking)
CREATE TABLE IF NOT EXISTS data_access_log (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    data_type VARCHAR(50) NOT NULL, -- 'PATIENT', 'DOCTOR', 'BILLING', etc.
    data_id INTEGER,
    access_type VARCHAR(20) NOT NULL, -- 'READ', 'EXPORT', 'PRINT', etc.
    purpose VARCHAR(255),
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_data_access_log_user_id (user_id),
    INDEX idx_data_access_log_data_type (data_type),
    INDEX idx_data_access_log_timestamp (timestamp)
);

-- System Configuration Changes Table
CREATE TABLE IF NOT EXISTS system_config_changes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    config_key VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_system_config_changes_user_id (user_id),
    INDEX idx_system_config_changes_config_key (config_key),
    INDEX idx_system_config_changes_timestamp (timestamp)
);

-- Create function to automatically log failed login attempts
CREATE OR REPLACE FUNCTION log_failed_login_attempt()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO failed_login_attempts (email, ip_address, user_agent, attempt_count)
    VALUES (
        NEW.email,
        inet_client_addr(),
        NEW.user_agent,
        1
    )
    ON CONFLICT (email, ip_address) 
    DO UPDATE SET 
        attempt_count = failed_login_attempts.attempt_count + 1,
        timestamp = NOW(),
        locked_until = CASE 
            WHEN failed_login_attempts.attempt_count + 1 >= 5 
            THEN NOW() + INTERVAL '15 minutes'
            ELSE failed_login_attempts.locked_until
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for failed login attempts
CREATE TRIGGER trigger_failed_login_attempt
    AFTER INSERT ON users
    FOR EACH ROW
    WHEN (NEW.email IS NOT NULL AND NEW.password_hash IS NULL)
    EXECUTE FUNCTION log_failed_login_attempt();

-- Create view for audit summary statistics
CREATE OR REPLACE VIEW audit_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    COUNT(*) FILTER (WHERE success = false) as failed_requests,
    AVG(duration) as avg_response_time,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Create view for security event summary
CREATE OR REPLACE VIEW security_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM security_events 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), event_type
ORDER BY hour DESC, event_count DESC;

-- Function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete audit logs older than 1 year
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete security events older than 6 months
    DELETE FROM security_events 
    WHERE timestamp < NOW() - INTERVAL '6 months' AND resolved = true;
    
    -- Delete failed login attempts older than 30 days
    DELETE FROM failed_login_attempts 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Delete data access logs older than 2 years
    DELETE FROM data_access_log 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');

-- Grant permissions for audit tables
GRANT SELECT, INSERT ON audit_logs TO medicare_user;
GRANT SELECT, INSERT ON security_events TO medicare_user;
GRANT SELECT, INSERT ON failed_login_attempts TO medicare_user;
GRANT SELECT, INSERT ON data_access_log TO medicare_user;
GRANT SELECT, INSERT ON system_config_changes TO medicare_user;

-- Grant usage of sequences
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO medicare_user;
GRANT USAGE, SELECT ON SEQUENCE security_events_id_seq TO medicare_user;
GRANT USAGE, SELECT ON SEQUENCE failed_login_attempts_id_seq TO medicare_user;
GRANT USAGE, SELECT ON SEQUENCE data_access_log_id_seq TO medicare_user;
GRANT USAGE, SELECT ON SEQUENCE system_config_changes_id_seq TO medicare_user;

-- Grant access to views
GRANT SELECT ON audit_summary TO medicare_user;
GRANT SELECT ON security_summary TO medicare_user;

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for all API requests and responses';
COMMENT ON TABLE security_events IS 'Security-related events and incidents tracking';
COMMENT ON TABLE failed_login_attempts IS 'Failed login attempt tracking for brute force detection';
COMMENT ON TABLE data_access_log IS 'Sensitive data access tracking';
COMMENT ON TABLE system_config_changes IS 'System configuration changes audit trail';

COMMENT ON COLUMN audit_logs.request_id IS 'Unique identifier for tracking requests across systems';
COMMENT ON COLUMN audit_logs.duration IS 'Response time in milliseconds';
COMMENT ON COLUMN audit_logs.details IS 'Additional context and metadata';
COMMENT ON COLUMN security_events.severity IS 'Security event severity: low, medium, high, critical';
COMMENT ON COLUMN security_events.resolved IS 'Whether the security event has been resolved';
COMMENT ON COLUMN failed_login_attempts.locked_until IS 'Account lockout expiration time';
COMMENT ON COLUMN data_access_log.access_type IS 'Type of data access: READ, EXPORT, PRINT, etc.';
COMMENT ON COLUMN system_config_changes.config_key IS 'Configuration parameter that was changed';
