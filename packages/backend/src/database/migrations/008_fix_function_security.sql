-- Migration 008: Fix Function Security Vulnerabilities
-- This migration addresses Supabase Security Advisor warnings by setting search_path = '' on all functions
-- This prevents potential security vulnerabilities from search path manipulation

-- Fix get_user_balance function
CREATE OR REPLACE FUNCTION get_user_balance(user_uuid UUID)
RETURNS DECIMAL(15,2) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_balance DECIMAL(15,2);
BEGIN
    SELECT balance INTO user_balance
    FROM public.user_profiles
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_balance, 0);
END;
$$;

-- Fix process_game_transaction function
CREATE OR REPLACE FUNCTION process_game_transaction(
    user_uuid UUID,
    game_type_param TEXT,
    bet_amount_param DECIMAL(15,2),
    win_amount_param DECIMAL(15,2),
    result_data_param JSONB,
    game_duration_param INTEGER DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_balance DECIMAL(15,2);
    new_balance DECIMAL(15,2);
    game_id UUID;
BEGIN
    -- Check if user exists and get current balance
    SELECT balance INTO current_balance
    FROM public.user_profiles
    WHERE id = user_uuid;
    
    IF current_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if user has sufficient balance
    IF current_balance < bet_amount_param THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient balance'
        );
    END IF;
    
    -- Validate game type
    IF game_type_param NOT IN ('roulette', 'blackjack', 'case_opening') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid game type'
        );
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - bet_amount_param + win_amount_param;
    
    -- Update user balance and statistics
    UPDATE public.user_profiles
    SET 
        balance = new_balance,
        total_wagered = total_wagered + bet_amount_param,
        total_won = total_won + win_amount_param,
        games_played = games_played + 1,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Insert game history record
    INSERT INTO public.game_history (user_id, game_type, bet_amount, win_amount, result_data, game_duration)
    VALUES (user_uuid, game_type_param, bet_amount_param, win_amount_param, result_data_param, game_duration_param)
    RETURNING id INTO game_id;
    
    -- Return transaction result
    RETURN jsonb_build_object(
        'success', true,
        'game_id', game_id,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'bet_amount', bet_amount_param,
        'win_amount', win_amount_param
    );
END;
$$;

-- Fix claim_daily_bonus function (renamed from track_daily_bonus)
CREATE OR REPLACE FUNCTION claim_daily_bonus(user_uuid UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_balance DECIMAL(15,2);
    bonus_amount DECIMAL(15,2) := 1000.00; -- Default daily bonus
    new_balance DECIMAL(15,2);
    today_date DATE := CURRENT_DATE;
    existing_bonus_id UUID;
BEGIN
    -- Get user's current balance
    SELECT balance INTO current_balance
    FROM public.user_profiles
    WHERE id = user_uuid;
    
    IF current_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if user already claimed bonus today
    SELECT id INTO existing_bonus_id
    FROM public.daily_bonuses
    WHERE user_id = user_uuid AND bonus_date = today_date;
    
    IF existing_bonus_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Daily bonus already claimed today',
            'next_bonus_available', (today_date + INTERVAL '1 day')::timestamp
        );
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + bonus_amount;
    
    -- Update user balance and last bonus date
    UPDATE public.user_profiles
    SET 
        balance = new_balance,
        last_daily_bonus = today_date,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Record bonus claim
    INSERT INTO public.daily_bonuses (user_id, bonus_date, bonus_amount)
    VALUES (user_uuid, today_date, bonus_amount);
    
    -- Return success result
    RETURN jsonb_build_object(
        'success', true,
        'bonus_amount', bonus_amount,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'next_bonus_available', (today_date + INTERVAL '1 day')::timestamp
    );
END;
$$;

-- Fix get_user_statistics function
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_stats RECORD;
    game_stats JSONB;
BEGIN
    -- Get basic user statistics
    SELECT 
        balance,
        total_wagered,
        total_won,
        games_played,
        created_at,
        last_daily_bonus
    INTO user_stats
    FROM public.user_profiles
    WHERE id = user_uuid;
    
    IF user_stats IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get game-specific statistics
    SELECT jsonb_object_agg(
        game_type,
        jsonb_build_object(
            'games_played', count(*),
            'total_wagered', COALESCE(sum(bet_amount), 0),
            'total_won', COALESCE(sum(win_amount), 0),
            'biggest_win', COALESCE(max(win_amount), 0),
            'win_rate', CASE 
                WHEN count(*) > 0 THEN 
                    round((count(*) FILTER (WHERE win_amount > bet_amount)::decimal / count(*) * 100), 2)
                ELSE 0 
            END
        )
    ) INTO game_stats
    FROM public.game_history
    WHERE user_id = user_uuid
    GROUP BY game_type;
    
    -- Return combined statistics
    RETURN jsonb_build_object(
        'success', true,
        'balance', user_stats.balance,
        'total_wagered', user_stats.total_wagered,
        'total_won', user_stats.total_won,
        'games_played', user_stats.games_played,
        'net_profit', (user_stats.total_won - user_stats.total_wagered),
        'member_since', user_stats.created_at,
        'last_daily_bonus', user_stats.last_daily_bonus,
        'can_claim_bonus', (user_stats.last_daily_bonus IS NULL OR user_stats.last_daily_bonus < CURRENT_DATE),
        'game_statistics', COALESCE(game_stats, '{}'::jsonb)
    );
END;
$$;

-- Fix get_game_history function
CREATE OR REPLACE FUNCTION get_game_history(
    user_uuid UUID,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0,
    game_type_filter TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    games JSONB;
    total_count INTEGER;
BEGIN
    -- Validate game type filter if provided
    IF game_type_filter IS NOT NULL AND game_type_filter NOT IN ('roulette', 'blackjack', 'case_opening') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid game type filter'
        );
    END IF;
    
    -- Get total count for pagination
    SELECT count(*) INTO total_count
    FROM public.game_history
    WHERE user_id = user_uuid
    AND (game_type_filter IS NULL OR game_type = game_type_filter);
    
    -- Get paginated game history
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'game_type', game_type,
            'bet_amount', bet_amount,
            'win_amount', win_amount,
            'net_result', (win_amount - bet_amount),
            'result_data', result_data,
            'game_duration', game_duration,
            'created_at', created_at
        ) ORDER BY created_at DESC
    ) INTO games
    FROM (
        SELECT *
        FROM public.game_history
        WHERE user_id = user_uuid
        AND (game_type_filter IS NULL OR game_type = game_type_filter)
        ORDER BY created_at DESC
        LIMIT limit_param
        OFFSET offset_param
    ) subquery;
    
    -- Return paginated result
    RETURN jsonb_build_object(
        'success', true,
        'games', COALESCE(games, '[]'::jsonb),
        'total_count', total_count,
        'limit', limit_param,
        'offset', offset_param,
        'has_more', (offset_param + limit_param < total_count)
    );
END;
$$;

-- Fix get_leaderboard function
CREATE OR REPLACE FUNCTION get_leaderboard(
    metric_param TEXT DEFAULT 'balance',
    limit_param INTEGER DEFAULT 10
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    leaderboard JSONB;
BEGIN
    -- Validate metric parameter
    IF metric_param NOT IN ('balance', 'total_won', 'games_played', 'total_wagered') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid metric parameter'
        );
    END IF;
    
    -- Build leaderboard with simple ranking
    IF metric_param = 'balance' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'rank', rank_num,
                'username', username,
                'display_name', display_name,
                'value', balance,
                'games_played', games_played
            ) ORDER BY rank_num
        ) INTO leaderboard
        FROM (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY balance DESC) as rank_num,
                username, display_name, balance, games_played
            FROM public.user_profiles
            WHERE is_active = true
            ORDER BY balance DESC
            LIMIT limit_param
        ) ranked_users;
    ELSIF metric_param = 'total_won' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'rank', rank_num,
                'username', username,
                'display_name', display_name,
                'value', total_won,
                'games_played', games_played
            ) ORDER BY rank_num
        ) INTO leaderboard
        FROM (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY total_won DESC) as rank_num,
                username, display_name, total_won, games_played
            FROM public.user_profiles
            WHERE is_active = true
            ORDER BY total_won DESC
            LIMIT limit_param
        ) ranked_users;
    ELSIF metric_param = 'games_played' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'rank', rank_num,
                'username', username,
                'display_name', display_name,
                'value', games_played,
                'games_played', games_played
            ) ORDER BY rank_num
        ) INTO leaderboard
        FROM (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY games_played DESC) as rank_num,
                username, display_name, games_played
            FROM public.user_profiles
            WHERE is_active = true
            ORDER BY games_played DESC
            LIMIT limit_param
        ) ranked_users;
    ELSIF metric_param = 'total_wagered' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'rank', rank_num,
                'username', username,
                'display_name', display_name,
                'value', total_wagered,
                'games_played', games_played
            ) ORDER BY rank_num
        ) INTO leaderboard
        FROM (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY total_wagered DESC) as rank_num,
                username, display_name, total_wagered, games_played
            FROM public.user_profiles
            WHERE is_active = true
            ORDER BY total_wagered DESC
            LIMIT limit_param
        ) ranked_users;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'metric', metric_param,
        'leaderboard', COALESCE(leaderboard, '[]'::jsonb)
    );
END;
$$;

-- Fix cleanup_old_audit_logs function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Delete audit logs older than 2 years, except for critical security events
    DELETE FROM public.audit_logs 
    WHERE timestamp < NOW() - INTERVAL '2 years'
        AND action NOT IN ('security_event', 'ip_blocked', 'account_locked', 'admin_action');
    
    -- Log the cleanup action
    INSERT INTO public.audit_logs (action, resource_type, success, metadata)
    VALUES ('audit_cleanup', 'system', true, jsonb_build_object('cleaned_at', NOW()));
END;
$$;

-- Fix get_audit_statistics function
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
SET search_path = ''
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
        FROM public.audit_logs
        WHERE timestamp BETWEEN start_date AND end_date
        GROUP BY action
    ) action_stats
    CROSS JOIN (
        SELECT *
        FROM public.audit_logs
        WHERE timestamp BETWEEN start_date AND end_date
    ) all_logs;
END;
$$;

-- Fix detect_suspicious_activity function
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
SET search_path = ''
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
        FROM public.audit_logs al
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

-- Fix audit_trigger_function function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Log changes to user_profiles table
    IF TG_TABLE_NAME = 'user_profiles' THEN
        INSERT INTO public.audit_logs (
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

-- Fix cleanup_old_case_opening_metrics function
CREATE OR REPLACE FUNCTION cleanup_old_case_opening_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Delete metrics older than 90 days
    DELETE FROM public.case_opening_metrics 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Log cleanup operation
    INSERT INTO public.case_opening_metrics (
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

-- Fix get_case_opening_system_health function
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
SET search_path = ''
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
    FROM public.case_opening_metrics 
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

-- Fix realtime trigger functions
CREATE OR REPLACE FUNCTION notify_balance_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    payload JSONB;
BEGIN
    -- Only notify if balance actually changed
    IF OLD.balance IS DISTINCT FROM NEW.balance THEN
        payload := jsonb_build_object(
            'user_id', NEW.id,
            'username', NEW.username,
            'old_balance', OLD.balance,
            'new_balance', NEW.balance,
            'change', (NEW.balance - OLD.balance),
            'timestamp', extract(epoch from now())
        );
        
        -- Send notification via pg_notify for external listeners
        PERFORM pg_notify('balance_update', payload::text);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_game_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    payload JSONB;
    user_info RECORD;
    is_big_win BOOLEAN;
BEGIN
    -- Get user information
    SELECT username, display_name INTO user_info
    FROM public.user_profiles
    WHERE id = NEW.user_id;
    
    -- Determine if this is a big win (5x bet or more)
    -- Special handling for case opening: only consider big wins if bet amount > 0
    -- This prevents case winnings credit transactions (bet=0, win>0) from being flagged as big wins
    IF NEW.game_type = 'case_opening' THEN
        is_big_win := (NEW.bet_amount > 0) AND (NEW.win_amount >= NEW.bet_amount * 5);
    ELSE
        is_big_win := (NEW.win_amount >= NEW.bet_amount * 5);
    END IF;
    
    payload := jsonb_build_object(
        'game_id', NEW.id,
        'user_id', NEW.user_id,
        'username', user_info.username,
        'display_name', user_info.display_name,
        'game_type', NEW.game_type,
        'bet_amount', NEW.bet_amount,
        'win_amount', NEW.win_amount,
        'net_result', (NEW.win_amount - NEW.bet_amount),
        'result_data', NEW.result_data,
        'is_big_win', is_big_win,
        'timestamp', extract(epoch from NEW.created_at)
    );
    
    -- Send game completion notification
    PERFORM pg_notify('game_completion', payload::text);
    
    -- Send big win notification if applicable
    IF is_big_win THEN
        PERFORM pg_notify('big_win', payload::text);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_daily_bonus()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    payload JSONB;
    user_info RECORD;
BEGIN
    -- Get user information
    SELECT username, display_name INTO user_info
    FROM public.user_profiles
    WHERE id = NEW.user_id;
    
    payload := jsonb_build_object(
        'bonus_id', NEW.id,
        'user_id', NEW.user_id,
        'username', user_info.username,
        'bonus_amount', NEW.bonus_amount,
        'bonus_date', NEW.bonus_date,
        'timestamp', extract(epoch from NEW.claimed_at)
    );
    
    -- Send daily bonus notification
    PERFORM pg_notify('daily_bonus', payload::text);
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_realtime_channels()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN jsonb_build_object(
        'channels', jsonb_build_array(
            'game-events',
            'balance-updates', 
            'notifications',
            'user-profiles-changes',
            'game-history-changes'
        ),
        'tables', jsonb_build_array(
            'user_profiles',
            'game_history',
            'daily_bonuses'
        ),
        'events', jsonb_build_array(
            'balance_update',
            'game_completion',
            'big_win',
            'daily_bonus'
        )
    );
END;
$$;

-- Create missing functions that were referenced in security warnings

-- Create handle_new_user function (commonly used in Supabase auth triggers)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        username,
        display_name,
        email,
        balance,
        total_wagered,
        total_won,
        games_played,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'),
        NEW.email,
        10000.00, -- Starting balance
        0.00,
        0.00,
        0,
        true,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- Create update_updated_at_column function (commonly used for automatic timestamp updates)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_balance(UUID) IS 'Securely retrieves user balance with search_path protection';
COMMENT ON FUNCTION process_game_transaction(UUID, TEXT, DECIMAL, DECIMAL, JSONB, INTEGER) IS 'Processes game transactions atomically with security hardening';
COMMENT ON FUNCTION claim_daily_bonus(UUID) IS 'Handles daily bonus claims with security protections';
COMMENT ON FUNCTION get_user_statistics(UUID) IS 'Returns user statistics with search_path security';
COMMENT ON FUNCTION get_game_history(UUID, INTEGER, INTEGER, TEXT) IS 'Retrieves paginated game history securely';
COMMENT ON FUNCTION get_leaderboard(TEXT, INTEGER) IS 'Returns leaderboard data with security hardening';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Cleans up old audit logs with search_path protection';
COMMENT ON FUNCTION get_audit_statistics(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns audit statistics with security hardening';
COMMENT ON FUNCTION detect_suspicious_activity(INTEGER) IS 'Detects suspicious activity patterns securely';
COMMENT ON FUNCTION audit_trigger_function() IS 'Audit trigger function with search_path security';
COMMENT ON FUNCTION cleanup_old_case_opening_metrics() IS 'Cleans up old case opening metrics securely';
COMMENT ON FUNCTION get_case_opening_system_health(INTEGER) IS 'Returns system health metrics with security protection';
COMMENT ON FUNCTION handle_new_user() IS 'Handles new user creation with security hardening';
COMMENT ON FUNCTION update_updated_at_column() IS 'Updates timestamp columns with search_path protection';