-- Create audit_logs table for security and compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only allow service role to read/write audit logs (admin access only)
CREATE POLICY "Service role can manage audit logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create a view for user-accessible audit information (limited fields)
CREATE OR REPLACE VIEW user_audit_summary AS
SELECT 
    id,
    user_id,
    action,
    resource_type,
    timestamp,
    success,
    CASE 
        WHEN action IN ('user_login', 'user_logout', 'user_register') THEN 'Authentication'
        WHEN action LIKE 'game_%' THEN 'Gaming'
        WHEN action LIKE 'currency_%' THEN 'Currency'
        ELSE 'Other'
    END as category
FROM audit_logs
WHERE user_id = auth.uid()
    AND action NOT IN ('security_event', 'admin_action') -- Hide sensitive actions
ORDER BY timestamp DESC;

-- Grant access to the view for authenticated users
GRANT SELECT ON user_audit_summary TO authenticated;

-- Create function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete audit logs older than 2 years, except for critical security events
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '2 years'
        AND action NOT IN ('security_event', 'ip_blocked', 'account_locked', 'admin_action');
    
    -- Log the cleanup action
    INSERT INTO audit_logs (action, resource_type, success, metadata)
    VALUES ('audit_cleanup', 'system', true, jsonb_build_object('cleaned_at', NOW()));
END;
$$;

-- Create function to get audit statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_events BIGINT,
    successful_events BIGINT,
    failed_events BIGINT,
    unique_users BIGINT,
    unique_ips BIGINT,
    top_actions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE success = true) as successful_events,
        COUNT(*) FILTER (WHERE success = false) as failed_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        jsonb_agg(
            jsonb_build_object(
                'action', action,
                'count', action_count
            ) ORDER BY action_count DESC
        ) FILTER (WHERE row_num <= 10) as top_actions
    FROM (
        SELECT 
            action,
            COUNT(*) as action_count,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as row_num
        FROM audit_logs
        WHERE timestamp BETWEEN start_date AND end_date
        GROUP BY action
    ) action_stats
    CROSS JOIN (
        SELECT *
        FROM audit_logs
        WHERE timestamp BETWEEN start_date AND end_date
    ) all_logs;
END;
$$;

-- Create function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    lookback_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    user_id UUID,
    ip_address INET,
    suspicious_patterns JSONB,
    risk_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH activity_analysis AS (
        SELECT 
            al.user_id,
            al.ip_address,
            COUNT(*) as total_events,
            COUNT(*) FILTER (WHERE success = false) as failed_events,
            COUNT(DISTINCT action) as unique_actions,
            COUNT(*) FILTER (WHERE action LIKE '%login%') as login_attempts,
            COUNT(*) FILTER (WHERE action LIKE 'game_%') as game_actions,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 as activity_span_hours
        FROM audit_logs al
        WHERE timestamp > NOW() - (lookback_hours || ' hours')::INTERVAL
        GROUP BY al.user_id, al.ip_address
    )
    SELECT 
        aa.user_id,
        aa.ip_address,
        jsonb_build_object(
            'high_failure_rate', (aa.failed_events::FLOAT / aa.total_events) > 0.3,
            'rapid_fire_actions', aa.total_events > 100,
            'suspicious_login_pattern', aa.login_attempts > 10,
            'excessive_gaming', aa.game_actions > 200,
            'short_activity_burst', aa.activity_span_hours < 1 AND aa.total_events > 50
        ) as suspicious_patterns,
        (
            CASE WHEN (aa.failed_events::FLOAT / aa.total_events) > 0.3 THEN 30 ELSE 0 END +
            CASE WHEN aa.total_events > 100 THEN 25 ELSE 0 END +
            CASE WHEN aa.login_attempts > 10 THEN 20 ELSE 0 END +
            CASE WHEN aa.game_actions > 200 THEN 15 ELSE 0 END +
            CASE WHEN aa.activity_span_hours < 1 AND aa.total_events > 50 THEN 35 ELSE 0 END
        ) as risk_score
    FROM activity_analysis aa
    WHERE (
        (aa.failed_events::FLOAT / aa.total_events) > 0.3 OR
        aa.total_events > 100 OR
        aa.login_attempts > 10 OR
        aa.game_actions > 200 OR
        (aa.activity_span_hours < 1 AND aa.total_events > 50)
    )
    ORDER BY risk_score DESC;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION get_audit_statistics(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity(INTEGER) TO service_role;

-- Create a trigger to automatically log certain table changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log changes to user_profiles table
    IF TG_TABLE_NAME = 'user_profiles' THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values
        ) VALUES (
            COALESCE(NEW.id, OLD.id),
            TG_OP || '_user_profile',
            'user_profile',
            COALESCE(NEW.id::TEXT, OLD.id::TEXT),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for important tables
DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
CREATE TRIGGER audit_user_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for security and compliance tracking';
COMMENT ON COLUMN audit_logs.action IS 'The action that was performed (e.g., user_login, game_play, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'The type of resource affected (e.g., user_auth, game_action, etc.)';
COMMENT ON COLUMN audit_logs.resource_id IS 'The ID of the specific resource affected';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before the action (for updates/deletes)';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after the action (for inserts/updates)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context and metadata about the action';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Removes old audit logs according to retention policy';
COMMENT ON FUNCTION get_audit_statistics(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns audit statistics for a given time period';
COMMENT ON FUNCTION detect_suspicious_activity(INTEGER) IS 'Analyzes recent activity to detect suspicious patterns';