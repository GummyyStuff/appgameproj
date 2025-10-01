-- Real-time triggers for Supabase Realtime integration
-- These triggers automatically broadcast changes to connected clients

-- Function to notify balance changes
CREATE OR REPLACE FUNCTION notify_balance_change()
RETURNS TRIGGER AS $
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
$ LANGUAGE plpgsql;

-- Function to notify game completion
CREATE OR REPLACE FUNCTION notify_game_completion()
RETURNS TRIGGER AS $
DECLARE
    payload JSONB;
    user_info RECORD;
    is_big_win BOOLEAN;
BEGIN
    -- Get user information
    SELECT username, display_name INTO user_info
    FROM user_profiles
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
$ LANGUAGE plpgsql;

-- Function to notify daily bonus claims
CREATE OR REPLACE FUNCTION notify_daily_bonus()
RETURNS TRIGGER AS $
DECLARE
    payload JSONB;
    user_info RECORD;
BEGIN
    -- Get user information
    SELECT username, display_name INTO user_info
    FROM user_profiles
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
$ LANGUAGE plpgsql;

-- Create triggers for real-time notifications

-- Balance change trigger
DROP TRIGGER IF EXISTS trigger_balance_change ON user_profiles;
CREATE TRIGGER trigger_balance_change
    AFTER UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_balance_change();

-- Game completion trigger
DROP TRIGGER IF EXISTS trigger_game_completion ON game_history;
CREATE TRIGGER trigger_game_completion
    AFTER INSERT ON game_history
    FOR EACH ROW
    EXECUTE FUNCTION notify_game_completion();

-- Daily bonus trigger
DROP TRIGGER IF EXISTS trigger_daily_bonus ON daily_bonuses;
CREATE TRIGGER trigger_daily_bonus
    AFTER INSERT ON daily_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION notify_daily_bonus();

-- Enable realtime for all relevant tables (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE game_history;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_bonuses;

-- Create indexes for realtime performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_realtime ON user_profiles(id, balance, updated_at);
CREATE INDEX IF NOT EXISTS idx_game_history_realtime ON game_history(user_id, created_at, win_amount);
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_realtime ON daily_bonuses(user_id, claimed_at);

-- Grant necessary permissions for realtime
GRANT SELECT ON user_profiles TO anon, authenticated;
GRANT SELECT ON game_history TO anon, authenticated;
GRANT SELECT ON daily_bonuses TO anon, authenticated;

-- Create a function to get real-time channel info
CREATE OR REPLACE FUNCTION get_realtime_channels()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
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
$;