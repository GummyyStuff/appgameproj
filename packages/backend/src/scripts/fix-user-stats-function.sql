-- Fixed version of get_user_statistics function
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
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