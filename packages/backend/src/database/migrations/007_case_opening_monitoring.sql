-- Case Opening Monitoring and Metrics Tables
-- Migration 007: Add monitoring and metrics tracking for case opening system

-- Create case opening metrics table for performance and operational monitoring
CREATE TABLE IF NOT EXISTS case_opening_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operation VARCHAR(100) NOT NULL,
    duration_ms DECIMAL(10,2) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    case_type_id UUID,
    item_rarity VARCHAR(20),
    currency_awarded INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_timestamp ON case_opening_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_operation ON case_opening_metrics(operation);
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_success ON case_opening_metrics(success);
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_user_id ON case_opening_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_case_type_id ON case_opening_metrics(case_type_id);
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_item_rarity ON case_opening_metrics(item_rarity);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_operation_timestamp ON case_opening_metrics(operation, timestamp);
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_user_operation ON case_opening_metrics(user_id, operation, timestamp);

-- Create system health monitoring view
CREATE OR REPLACE VIEW case_opening_system_health AS
SELECT 
    operation,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    COUNT(*) FILTER (WHERE success = false) as failed_operations,
    ROUND(AVG(duration_ms), 2) as avg_duration_ms,
    ROUND(MIN(duration_ms), 2) as min_duration_ms,
    ROUND(MAX(duration_ms), 2) as max_duration_ms,
    ROUND(
        (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as success_rate_percent,
    DATE_TRUNC('hour', timestamp) as hour_bucket
FROM case_opening_metrics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY operation, DATE_TRUNC('hour', timestamp)
ORDER BY hour_bucket DESC, operation;

-- Create fairness monitoring view
CREATE OR REPLACE VIEW case_opening_fairness_stats AS
SELECT 
    case_type_id,
    item_rarity,
    COUNT(*) as total_openings,
    ROUND(
        (COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER (PARTITION BY case_type_id)) * 100, 
        2
    ) as actual_percentage,
    DATE_TRUNC('day', timestamp) as day_bucket
FROM case_opening_metrics 
WHERE operation = 'case_opening' 
    AND success = true 
    AND item_rarity IS NOT NULL
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY case_type_id, item_rarity, DATE_TRUNC('day', timestamp)
ORDER BY day_bucket DESC, case_type_id, item_rarity;

-- Create performance alerts view
CREATE OR REPLACE VIEW case_opening_performance_alerts AS
SELECT 
    operation,
    'High Average Response Time' as alert_type,
    ROUND(AVG(duration_ms), 2) as avg_duration_ms,
    COUNT(*) as sample_size,
    NOW() as alert_timestamp
FROM case_opening_metrics 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY operation
HAVING AVG(duration_ms) > 1000 -- Alert if average > 1 second

UNION ALL

SELECT 
    operation,
    'High Error Rate' as alert_type,
    ROUND(
        (COUNT(*) FILTER (WHERE success = false)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as error_rate_percent,
    COUNT(*) as sample_size,
    NOW() as alert_timestamp
FROM case_opening_metrics 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY operation
HAVING (COUNT(*) FILTER (WHERE success = false)::DECIMAL / COUNT(*)) > 0.05; -- Alert if error rate > 5%

-- Create RLS policies for metrics table
ALTER TABLE case_opening_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own metrics
CREATE POLICY "Users can view own metrics" ON case_opening_metrics
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert metrics
CREATE POLICY "Service can insert metrics" ON case_opening_metrics
    FOR INSERT WITH CHECK (true);

-- Policy: Service role can view all metrics (for monitoring dashboard)
CREATE POLICY "Service can view all metrics" ON case_opening_metrics
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to clean up old metrics (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_case_opening_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete metrics older than 90 days
    DELETE FROM case_opening_metrics 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Log cleanup operation
    INSERT INTO case_opening_metrics (
        operation, 
        duration_ms, 
        success, 
        metadata
    ) VALUES (
        'metrics_cleanup',
        0,
        true,
        jsonb_build_object(
            'cleanup_timestamp', NOW(),
            'retention_days', 90
        )
    );
END;
$$;

-- Create function to get system health summary
CREATE OR REPLACE FUNCTION get_case_opening_system_health(
    time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    status TEXT,
    avg_response_time_ms DECIMAL,
    success_rate_percent DECIMAL,
    error_rate_percent DECIMAL,
    operations_per_minute DECIMAL,
    total_operations BIGINT,
    issues TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    health_record RECORD;
    issues_array TEXT[] := '{}';
BEGIN
    -- Get aggregated metrics for the time range
    SELECT 
        COUNT(*) as total_ops,
        ROUND(AVG(duration_ms), 2) as avg_duration,
        ROUND(
            (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100, 
            2
        ) as success_pct,
        ROUND(
            (COUNT(*) FILTER (WHERE success = false)::DECIMAL / COUNT(*)) * 100, 
            2
        ) as error_pct,
        ROUND(COUNT(*)::DECIMAL / (time_range_hours * 60), 2) as ops_per_min
    INTO health_record
    FROM case_opening_metrics 
    WHERE timestamp >= NOW() - (time_range_hours || ' hours')::INTERVAL;

    -- Determine status and issues
    IF health_record.avg_duration > 5000 THEN
        status := 'unhealthy';
        issues_array := array_append(issues_array, 'Very high response time: ' || health_record.avg_duration || 'ms');
    ELSIF health_record.avg_duration > 1000 THEN
        status := 'degraded';
        issues_array := array_append(issues_array, 'High response time: ' || health_record.avg_duration || 'ms');
    ELSE
        status := 'healthy';
    END IF;

    IF health_record.error_pct > 20 THEN
        status := 'unhealthy';
        issues_array := array_append(issues_array, 'Very high error rate: ' || health_record.error_pct || '%');
    ELSIF health_record.error_pct > 5 THEN
        IF status = 'healthy' THEN
            status := 'degraded';
        END IF;
        issues_array := array_append(issues_array, 'High error rate: ' || health_record.error_pct || '%');
    END IF;

    -- Return results
    RETURN QUERY SELECT 
        status,
        health_record.avg_duration,
        health_record.success_pct,
        health_record.error_pct,
        health_record.ops_per_min,
        health_record.total_ops,
        issues_array;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON case_opening_metrics TO authenticated;
GRANT INSERT ON case_opening_metrics TO service_role;
GRANT SELECT ON case_opening_system_health TO authenticated;
GRANT SELECT ON case_opening_fairness_stats TO authenticated;
GRANT SELECT ON case_opening_performance_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_case_opening_system_health(INTEGER) TO authenticated;

-- Create scheduled job to clean up old metrics (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-case-opening-metrics', '0 2 * * *', 'SELECT cleanup_old_case_opening_metrics();');

COMMENT ON TABLE case_opening_metrics IS 'Stores performance and operational metrics for case opening system monitoring';
COMMENT ON VIEW case_opening_system_health IS 'Provides system health metrics aggregated by operation and time';
COMMENT ON VIEW case_opening_fairness_stats IS 'Tracks fairness statistics for case opening rarity distribution';
COMMENT ON VIEW case_opening_performance_alerts IS 'Identifies performance issues requiring attention';
COMMENT ON FUNCTION get_case_opening_system_health(INTEGER) IS 'Returns overall system health status with issues';
COMMENT ON FUNCTION cleanup_old_case_opening_metrics() IS 'Removes old metrics data according to retention policy';