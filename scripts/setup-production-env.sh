#!/bin/bash

# Production Environment Setup Script
# This script helps configure environment variables for production deployment

echo "🚀 Setting up production environment variables..."

# Check if production environment files exist
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found!"
    echo "Please copy .env.production.example and fill in your production values."
    exit 1
fi

if [ ! -f "packages/frontend/.env.production" ]; then
    echo "❌ packages/frontend/.env.production file not found!"
    echo "Please copy packages/frontend/.env.production.example and fill in your production values."
    exit 1
fi

echo "✅ Production environment files found"

# Validate required environment variables
echo "🔍 Validating environment variables..."

# Source the production environment
set -a
source .env.production
set +a

# Check required variables
required_vars=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY" 
    "SUPABASE_SERVICE_ROLE_KEY"
    "JWT_SECRET"
    "NODE_ENV"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${missing_vars[@]}"
    exit 1
fi

# Validate HTTPS URLs for production
if [[ ! "$SUPABASE_URL" =~ ^https:// ]]; then
    echo "❌ SUPABASE_URL must use HTTPS in production"
    echo "   Current value: $SUPABASE_URL"
    exit 1
fi

# Check JWT secret length
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "❌ JWT_SECRET must be at least 32 characters long"
    echo "   Current length: ${#JWT_SECRET}"
    exit 1
fi

echo "✅ All environment variables validated"

# Test Supabase connection
echo "🔗 Testing Supabase connection..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY")

if [ "$response" = "200" ]; then
    echo "✅ Supabase connection successful"
else
    echo "❌ Supabase connection failed (HTTP $response)"
    echo "   Please check your SUPABASE_URL and SUPABASE_ANON_KEY"
    exit 1
fi

echo "🎉 Production environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your application to Coolify"
echo "2. Set the environment variables in your Coolify deployment"
echo "3. Ensure your domain (tarkov.juanis.cool) is properly configured"
echo "4. Test the authentication flow"