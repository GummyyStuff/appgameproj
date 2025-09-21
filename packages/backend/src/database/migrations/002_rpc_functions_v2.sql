-- RPC Functions for Tarkov Casino Website
-- These functions handle currency operations and game transactions atomically

-- Function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(user_uuid UUID)
RETURNS DECIMAL(15,2) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    user_balance DECIMAL(15,2);
BEGIN
    SELECT balance INTO user_balance
    FROM user_profiles
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_balance, 0);
END;
$$;

-- Function to process game transaction (bet and win in single transaction)
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
AS $$
DECLARE
    current_balance DECIMAL(15,2);
    new_balance DECIMAL(15,2);
    game_id UUID;
BEGIN
    -- Check if user exists and get current balance
    SELECT balance INTO current_balance
    FROM user_profiles
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
    IF game_type_param NOT IN ('roulette', 'blackjack', 'plinko') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid game type'
        );
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - bet_amount_param + win_amount_param;
    
    -- Update user balance and statistics
    UPDATE user_profiles
    SET 
        balance = new_balance,
        total_wagered = total_wagered + bet_amount_param,
        total_won = total_won + win_amount_param,
        games_played = games_played + 1,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Insert game history record
    INSERT INTO game_history (user_id, game_type, bet_amount, win_amount, result_data, game_duration)
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

-- Function to claim daily bonus
CREATE OR REPLACE FUNCTION claim_daily_bonus(user_uuid UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
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
    FROM user_profiles
    WHERE id = user_uuid;
    
    IF current_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if user already claimed bonus today
    SELECT id INTO existing_bonus_id
    FROM daily_bonuses
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
    UPDATE user_profiles
    SET 
        balance = new_balance,
        last_daily_bonus = today_date,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Record bonus claim
    INSERT INTO daily_bonuses (user_id, bonus_date, bonus_amount)
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

-- Function to get user statistics
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
    FROM game_history
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

-- Function to get game history with pagination
CREATE OR REPLACE FUNCTION get_game_history(
    user_uuid UUID,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0,
    game_type_filter TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    games JSONB;
    total_count INTEGER;
BEGIN
    -- Validate game type filter if provided
    IF game_type_filter IS NOT NULL AND game_type_filter NOT IN ('roulette', 'blackjack', 'plinko') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid game type filter'
        );
    END IF;
    
    -- Get total count for pagination
    SELECT count(*) INTO total_count
    FROM game_history
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
        FROM game_history
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

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(
    metric_param TEXT DEFAULT 'balance',
    limit_param INTEGER DEFAULT 10
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
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
$$;