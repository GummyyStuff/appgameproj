#!/bin/bash

# Production Environment Setup Script
# This script helps configure production environment variables

set -e

echo "🚀 Setting up production environment for Tarkov Casino"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to prompt for input with default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    echo -e "${YELLOW}$prompt${NC}"
    if [ -n "$default" ]; then
        echo -e "Default: ${GREEN}$default${NC}"
    fi
    read -p "Enter value: " input
    
    if [ -z "$input" ] && [ -n "$default" ]; then
        input="$default"
    fi
    
    eval "$var_name='$input'"
}

# Function to generate random JWT secret
generate_jwt_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

echo "📋 Please provide the following production configuration:"
echo ""

# Supabase Configuration
echo "=== Supabase Configuration ==="
prompt_with_default "Supabase Project URL (e.g., https://your-project.supabase.co):" "" "SUPABASE_URL"
prompt_with_default "Supabase Anonymous Key:" "" "SUPABASE_ANON_KEY"
prompt_with_default "Supabase Service Role Key:" "" "SUPABASE_SERVICE_ROLE_KEY"

# Application Configuration
echo ""
echo "=== Application Configuration ==="
prompt_with_default "Production Domain (e.g., https://tarkov.juanis.cool):" "https://tarkov.juanis.cool" "DOMAIN"
prompt_with_default "JWT Secret (leave empty to generate):" "" "JWT_SECRET"

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(generate_jwt_secret)
    echo -e "${GREEN}Generated JWT Secret: $JWT_SECRET${NC}"
fi

# Game Configuration
echo ""
echo "=== Game Configuration ==="
prompt_with_default "Starting Balance for new users:" "10000" "STARTING_BALANCE"
prompt_with_default "Daily Bonus Amount:" "1000" "DAILY_BONUS"

# Create production environment files
echo ""
echo "📝 Creating production environment files..."

# Backend production environment
cat > .env.production << EOF
# Production Environment Variables - Generated $(date)

# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Application Configuration
PORT=3000
NODE_ENV=production
JWT_SECRET=$JWT_SECRET

# Game Configuration
STARTING_BALANCE=$STARTING_BALANCE
DAILY_BONUS=$DAILY_BONUS

# Logging Configuration
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_GAME_LOGGING=true
ENABLE_SECURITY_LOGGING=true

# Performance Configuration
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Monitoring Configuration
HEALTH_CHECK_TIMEOUT=5000
METRICS_ENABLED=true
EOF

# Frontend production environment
cat > packages/frontend/.env.production << EOF
# Production Frontend Environment Variables - Generated $(date)

# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# API Configuration
VITE_API_URL=$DOMAIN/api

# Realtime Configuration
VITE_REALTIME_ENABLED=true
EOF

echo -e "${GREEN}✅ Production environment files created successfully!${NC}"
echo ""
echo "📁 Files created:"
echo "  - .env.production"
echo "  - packages/frontend/.env.production"
echo ""
echo "🔒 Security Notes:"
echo "  - Keep these environment variables secure"
echo "  - Never commit production secrets to version control"
echo "  - Rotate JWT secrets regularly"
echo "  - Monitor Supabase usage and quotas"
echo ""
echo "🚀 Next Steps:"
echo "  1. Verify the configuration is correct"
echo "  2. Test the build process: bun run build"
echo "  3. Deploy to production"
echo "  4. Run health checks after deployment"
echo ""
echo -e "${GREEN}Production environment setup complete!${NC}"