-- Fix the get_leaderboard function
-- This corrects the dollar-quoted string issue

DROP FUNCTION IF EXISTS get_leaderboard(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION get_leaderboard(
    metric_param TEXT DEFAULT 'balance',
    limit_param INTEGER DEFAULT 10
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $function$
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
            FROM user_profiles
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
            FROM user_profiles
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
            FROM user_profiles
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
            FROM user_profiles
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
$function$;