-- RPC Functions for Tarkov Casino Website
-- These functions handle currency operations and game transactions atomically

-- Function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(user_uuid UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    user_balance DECIMAL(15,2);
BEGIN
    SELECT balance INTO user_balance
    FROM user_profiles
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process game transaction (bet and win in single transaction)
CREATE OR REPLACE FUNCTION process_game_transaction(
    user_uuid UUID,
    game_type_param VARCHAR(20),
    bet_amount_param DECIMAL(15,2),
    win_amount_param DECIMAL(15,2),
    result_data_param JSONB,
    game_duration_param INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
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
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check if user has sufficient balance
    IF current_balance < bet_amount_param THEN
        RAISE EXCEPTION 'Insufficient balance';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim daily bonus
CREATE OR REPLACE FUNCTION claim_daily_bonus(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    current_balance DECIMAL(15,2);
    bonus_amount DECIMAL(15,2) := 1000.00; -- Default daily bonus
    new_balance DECIMAL(15,2);
    last_bonus_date DATE;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Get user's current balance and last bonus date
    SELECT balance, last_daily_bonus INTO current_balance, last_bonus_date
    FROM user_profiles
    WHERE id = user_uuid;
    
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check if user already claimed bonus today
    IF last_bonus_date = today_date THEN
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
    INSERT INTO daily_bonuses (user_id, bonus_amount)
    VALUES (user_uuid, bonus_amount);
    
    -- Return success result
    RETURN jsonb_build_object(
        'success', true,
        'bonus_amount', bonus_amount,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'next_bonus_available', (today_date + INTERVAL '1 day')::timestamp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS JSONB AS $$
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
        RAISE EXCEPTION 'User not found';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent game history with pagination
CREATE OR REPLACE FUNCTION get_game_history(
    user_uuid UUID,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0,
    game_type_filter VARCHAR(20) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    games JSONB;
    total_count INTEGER;
BEGIN
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
        'games', COALESCE(games, '[]'::jsonb),
        'total_count', total_count,
        'limit', limit_param,
        'offset', offset_param,
        'has_more', (offset_param + limit_param < total_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;