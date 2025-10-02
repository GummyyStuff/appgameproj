#!/bin/bash

# Deploy the proxy-avatar Edge Function to Supabase
echo "🚀 Deploying proxy-avatar Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy the function
supabase functions deploy proxy-avatar \
  --project-ref zjsmqnupvhqsedujwlou \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully!"
    echo "📝 Function URL: https://zjsmqnupvhqsedujwlou.supabase.co/functions/v1/proxy-avatar"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Upload default avatar to Storage → avatars → defaults/default-avatar.svg"
    echo "2. Test the function with your frontend"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
