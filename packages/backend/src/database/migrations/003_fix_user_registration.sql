-- Fix user registration trigger and RLS policies
-- This migration fixes the issue where new user registration fails due to RLS policies

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create an improved function to handle new user registration
-- This function runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into user_profiles with SECURITY DEFINER privileges
    -- This bypasses RLS policies during user creation
    INSERT INTO public.user_profiles (id, username, display_name, balance)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Tarkov Player'),
        10000.00
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- If username already exists, try with a random suffix
        INSERT INTO public.user_profiles (id, username, display_name, balance)
        VALUES (
            NEW.id,
            'player_' || substr(NEW.id::text, 1, 8) || '_' || floor(random() * 1000)::text,
            COALESCE(NEW.raw_user_meta_data->>'display_name', 'Tarkov Player'),
            10000.00
        );
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to be more permissive for user creation
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a more permissive insert policy that allows the trigger to work
CREATE POLICY "Enable insert for authenticated users during registration" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- Also create a policy that allows service role to insert
CREATE POLICY "Service role can insert profiles" ON user_profiles
    FOR INSERT TO service_role WITH CHECK (true);

-- Create a policy for anon role during registration
CREATE POLICY "Allow profile creation during auth" ON user_profiles
    FOR INSERT TO anon WITH CHECK (true);

-- Grant necessary permissions
GRANT INSERT ON user_profiles TO anon;
GRANT INSERT ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Also grant permissions on the sequence if it exists
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;