-- Fix Function Search Path Security Issues
-- Migration 025: Add SET search_path = '' to all vulnerable functions
-- This prevents search_path attacks where users could override functions

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix get_online_users function
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.user_id,
        p.username,
        p.last_seen
    FROM public.chat_presence p
    WHERE p.is_online = true
    ORDER BY p.username ASC;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix cleanup_stale_presence function
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void AS $$
BEGIN
    -- Mark users as offline if they haven't been seen for more than 5 minutes
    UPDATE public.chat_presence
    SET is_online = false
    WHERE last_seen < NOW() - INTERVAL '5 minutes'
    AND is_online = true;

    -- Delete presence records older than 24 hours
    DELETE FROM public.chat_presence
    WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix handle_user_presence function
CREATE OR REPLACE FUNCTION public.handle_user_presence()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user presence when they send a message
    INSERT INTO public.chat_presence (user_id, username, last_seen, is_online)
    VALUES (NEW.user_id, NEW.username, NOW(), true)
    ON CONFLICT (user_id)
    DO UPDATE SET
        username = EXCLUDED.username,
        last_seen = EXCLUDED.last_seen,
        is_online = EXCLUDED.is_online;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix broadcast_chat_message function
CREATE OR REPLACE FUNCTION public.broadcast_chat_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast new message to all connected clients
    PERFORM pg_notify(
        'chat_message',
        json_build_object(
            'id', NEW.id,
            'content', NEW.content,
            'user_id', NEW.user_id,
            'username', NEW.username,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        )::text
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix broadcast_presence_change function
CREATE OR REPLACE FUNCTION public.broadcast_presence_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast presence change to all connected clients
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM pg_notify(
            'chat_presence',
            json_build_object(
                'user_id', NEW.user_id,
                'username', NEW.username,
                'last_seen', NEW.last_seen,
                'is_online', NEW.is_online,
                'action', CASE
                    WHEN TG_OP = 'INSERT' THEN 'join'
                    WHEN OLD.is_online != NEW.is_online THEN
                        CASE WHEN NEW.is_online THEN 'online' ELSE 'offline' END
                    ELSE 'update'
                END
            )::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify(
            'chat_presence',
            json_build_object(
                'user_id', OLD.user_id,
                'username', OLD.username,
                'action', 'leave'
            )::text
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix get_recent_chat_messages function
CREATE OR REPLACE FUNCTION public.get_recent_chat_messages(message_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    content TEXT,
    user_id UUID,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.user_id,
        m.username,
        m.created_at,
        m.updated_at
    FROM public.chat_messages m
    ORDER BY m.created_at DESC
    LIMIT message_limit;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix get_user_statistics function
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql SET search_path = ''
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
    FROM user_profiles
    WHERE id = user_uuid;

    IF user_stats IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Get game-specific statistics (fixed nested aggregate issue)
    SELECT jsonb_object_agg(
        game_type,
        jsonb_build_object(
            'games_played', game_count,
            'total_wagered', COALESCE(total_wagered, 0),
            'total_won', COALESCE(total_won, 0),
            'biggest_win', COALESCE(biggest_win, 0),
            'win_rate', CASE
                WHEN game_count > 0 THEN
                    round((wins::decimal / game_count * 100), 2)
                ELSE 0
            END
        )
    ) INTO game_stats
    FROM (
        SELECT
            game_type,
            count(*) as game_count,
            sum(bet_amount) as total_wagered,
            sum(win_amount) as total_won,
            max(win_amount) as biggest_win,
            count(*) FILTER (WHERE win_amount > bet_amount) as wins
        FROM game_history
        WHERE user_id = user_uuid
        GROUP BY game_type
    ) game_summary;

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

-- Fix get_daily_bonus_status function
CREATE OR REPLACE FUNCTION get_daily_bonus_status(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
    user_exists BOOLEAN;
    last_bonus_date DATE;
    can_claim BOOLEAN;
    next_bonus_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = user_uuid) INTO user_exists;

    IF NOT user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Get the last bonus date for this user
    SELECT last_daily_bonus INTO last_bonus_date
    FROM user_profiles
    WHERE id = user_uuid;

    -- Determine if user can claim bonus today
    can_claim := (last_bonus_date IS NULL OR last_bonus_date < CURRENT_DATE);

    -- Calculate next bonus time (tomorrow at midnight)
    next_bonus_time := DATE_TRUNC('day', CURRENT_TIMESTAMP + INTERVAL '1 day');

    RETURN jsonb_build_object(
        'success', true,
        'can_claim_bonus', can_claim,
        'last_bonus_date', last_bonus_date,
        'next_bonus_time', next_bonus_time,
        'current_time', CURRENT_TIMESTAMP
    );
END;
$$;
