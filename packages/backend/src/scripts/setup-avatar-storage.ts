#!/usr/bin/env bun

/**
 * Setup Avatar Storage
 * 
 * This script creates the avatars storage bucket and uploads the default avatar
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function setupAvatarStorage() {
  try {
    console.log('🚀 Setting up avatar storage...');

    // Create the avatars bucket (private)
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('avatars', {
        public: false,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        fileSizeLimit: 2 * 1024 * 1024, // 2MB limit
      });

    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Failed to create avatars bucket:', bucketError);
      throw bucketError;
    }

    console.log('✅ Avatars bucket created/verified');

    // Upload default avatar
    const defaultAvatarPath = join(__dirname, '../../frontend/src/assets/default-avatar.svg');
    const defaultAvatarContent = readFileSync(defaultAvatarPath);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload('defaults/default-avatar.svg', defaultAvatarContent, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Failed to upload default avatar:', uploadError);
      throw uploadError;
    }

    console.log('✅ Default avatar uploaded');

    // Create storage policies
    console.log('📋 Creating storage policies...');

    // Policy: Authenticated users can upload their own avatars
    const { error: uploadPolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can upload own avatars" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'avatars' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    });

    if (uploadPolicyError && !uploadPolicyError.message.includes('already exists')) {
      console.error('❌ Failed to create upload policy:', uploadPolicyError);
    }

    // Policy: Authenticated users can update their own avatars
    const { error: updatePolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can update own avatars" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id = 'avatars' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    });

    if (updatePolicyError && !updatePolicyError.message.includes('already exists')) {
      console.error('❌ Failed to create update policy:', updatePolicyError);
    }

    // Policy: Authenticated users can delete their own avatars
    const { error: deletePolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can delete own avatars" ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = 'avatars' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    });

    if (deletePolicyError && !deletePolicyError.message.includes('already exists')) {
      console.error('❌ Failed to create delete policy:', deletePolicyError);
    }

    console.log('✅ Storage policies created');

    console.log('\n🎉 Avatar storage setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ avatars bucket created (private)');
    console.log('   ✅ default avatar uploaded');
    console.log('   ✅ storage policies configured');
    console.log('\n🚀 Avatar storage is ready for use!');

  } catch (error) {
    console.error('❌ Failed to setup avatar storage:', error);
    process.exit(1);
  }
}

// Run the setup
setupAvatarStorage();
