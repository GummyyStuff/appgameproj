-- Fix RPC function to support case_opening game type
-- This updates the process_game_transaction function to include case_opening

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
    
    -- Validate game type (now includes case_opening)
    IF game_type_param NOT IN ('roulette', 'blackjack', 'case_opening') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid game type'
        );
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - bet_amount_param + win_amount_param;
    
    -- Update user balance
    UPDATE user_profiles 
    SET balance = new_balance,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Insert game history record
    INSERT INTO game_history (
        user_id,
        game_type,
        bet_amount,
        win_amount,
        result_data,
        game_duration,
        created_at
    ) VALUES (
        user_uuid,
        game_type_param,
        bet_amount_param,
        win_amount_param,
        result_data_param,
        game_duration_param,
        NOW()
    ) RETURNING id INTO game_id;
    
    -- Return success with transaction details
    RETURN jsonb_build_object(
        'success', true,
        'game_id', game_id,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'bet_amount', bet_amount_param,
        'win_amount', win_amount_param,
        'net_result', win_amount_param - bet_amount_param
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error details
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;