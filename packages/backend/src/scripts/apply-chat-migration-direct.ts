#!/usr/bin/env bun

/**
 * Apply Chat System Migration - Direct SQL Version
 * 
 * This script applies the chat system migration using direct SQL execution
 * instead of the exec_sql function which may not be available.
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyChatMigration() {
  try {
    console.log('🚀 Applying chat system migration...');

    // Step 1: Create chat_messages table
    console.log('📊 Creating chat_messages table...');
    const { error: tableError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS chat_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          content text NOT NULL CHECK (length(content) <= 500),
          created_at timestamptz DEFAULT now(),
          is_deleted boolean DEFAULT false,
          deleted_at timestamptz,
          deleted_by uuid REFERENCES user_profiles(id)
        );
      `
    });

    if (tableError) {
      console.error('❌ Failed to create chat_messages table:', tableError);
      throw tableError;
    }

    console.log('✅ chat_messages table created');

    // Step 2: Create indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted ON chat_messages(is_deleted);'
    ];

    for (const indexSQL of indexes) {
      const { error: indexError } = await supabase.rpc('exec', { sql: indexSQL });
      if (indexError) {
        console.error('❌ Failed to create index:', indexError);
        throw indexError;
      }
    }

    console.log('✅ Indexes created');

    // Step 3: Extend user_profiles table
    console.log('📊 Extending user_profiles table...');
    const alterColumns = [
      'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;',
      'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_path text DEFAULT \'defaults/default-avatar.svg\';',
      'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS chat_rules_version int DEFAULT 1;',
      'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS chat_rules_accepted_at timestamptz;'
    ];

    for (const alterSQL of alterColumns) {
      const { error: alterError } = await supabase.rpc('exec', { sql: alterSQL });
      if (alterError) {
        console.error('❌ Failed to alter user_profiles:', alterError);
        throw alterError;
      }
    }

    console.log('✅ user_profiles table extended');

    // Step 4: Enable RLS
    console.log('📊 Enabling Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('❌ Failed to enable RLS:', rlsError);
      throw rlsError;
    }

    console.log('✅ RLS enabled');

    // Step 5: Create RLS policies
    console.log('📊 Creating RLS policies...');
    const policies = [
      `CREATE POLICY "Users can read non-deleted messages" ON chat_messages
        FOR SELECT TO authenticated
        USING (is_deleted = false);`,
      
      `CREATE POLICY "Users can insert messages after accepting rules" ON chat_messages
        FOR INSERT TO authenticated
        WITH CHECK (
          auth.uid() = user_id AND
          EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.is_active = true 
            AND up.chat_rules_accepted_at IS NOT NULL
          )
        );`,
      
      `CREATE POLICY "Moderators can soft delete messages" ON chat_messages
        FOR UPDATE TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.is_moderator = true
          )
        )
        WITH CHECK (
          is_deleted = true AND
          deleted_at IS NOT NULL AND
          deleted_by = auth.uid()
        );`
    ];

    for (const policySQL of policies) {
      const { error: policyError } = await supabase.rpc('exec', { sql: policySQL });
      if (policyError && !policyError.message.includes('already exists')) {
        console.error('❌ Failed to create policy:', policyError);
        throw policyError;
      }
    }

    console.log('✅ RLS policies created');

    // Step 6: Create trigger function
    console.log('📊 Creating trigger function...');
    const { error: triggerError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION set_deleted_fields()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
            NEW.deleted_at = now();
            NEW.deleted_by = auth.uid();
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (triggerError) {
      console.error('❌ Failed to create trigger function:', triggerError);
      throw triggerError;
    }

    console.log('✅ Trigger function created');

    // Step 7: Create trigger
    console.log('📊 Creating trigger...');
    const { error: triggerCreateError } = await supabase.rpc('exec', {
      sql: `
        DROP TRIGGER IF EXISTS trigger_set_deleted_fields ON chat_messages;
        CREATE TRIGGER trigger_set_deleted_fields
          BEFORE UPDATE ON chat_messages
          FOR EACH ROW
          EXECUTE FUNCTION set_deleted_fields();
      `
    });

    if (triggerCreateError) {
      console.error('❌ Failed to create trigger:', triggerCreateError);
      throw triggerCreateError;
    }

    console.log('✅ Trigger created');

    // Step 8: Create helper functions
    console.log('📊 Creating helper functions...');
    const { error: helperError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION get_recent_chat_messages(message_limit int DEFAULT 100)
        RETURNS TABLE (
          id uuid,
          user_id uuid,
          content text,
          created_at timestamptz,
          username text,
          display_name text,
          avatar_path text
        ) 
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            cm.id,
            cm.user_id,
            cm.content,
            cm.created_at,
            up.username,
            up.display_name,
            up.avatar_path
          FROM chat_messages cm
          JOIN user_profiles up ON cm.user_id = up.id
          WHERE cm.is_deleted = false
          ORDER BY cm.created_at DESC
          LIMIT message_limit;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (helperError) {
      console.error('❌ Failed to create helper function:', helperError);
      throw helperError;
    }

    console.log('✅ Helper functions created');

    // Step 9: Enable realtime
    console.log('📊 Enabling realtime...');
    const { error: realtimeError } = await supabase.rpc('exec', {
      sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;'
    });

    if (realtimeError && !realtimeError.message.includes('already exists')) {
      console.error('❌ Failed to enable realtime:', realtimeError);
      throw realtimeError;
    }

    console.log('✅ Realtime enabled');

    console.log('\n🎉 Chat system migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ chat_messages table created with constraints and indexes');
    console.log('   ✅ user_profiles extended with chat-related fields');
    console.log('   ✅ Row Level Security policies configured');
    console.log('   ✅ Real-time triggers and functions created');
    console.log('   ✅ Helper functions for common operations');
    console.log('   ✅ Real-time subscriptions enabled');
    console.log('\n🚀 The chat system is ready for use!');

  } catch (error) {
    console.error('❌ Failed to apply chat migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyChatMigration();
