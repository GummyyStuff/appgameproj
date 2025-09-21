#!/bin/bash

# Helper script to update Supabase keys in .env file

echo "🔑 Supabase Key Updater"
echo "======================"
echo ""

echo "Please go to your Supabase dashboard:"
echo "👉 http://192.168.0.69:8001"
echo "👉 Settings > API"
echo ""

echo "📋 Copy the ANON/PUBLIC key (should be very long with 2 dots):"
read -p "Paste ANON key: " ANON_KEY

echo ""
echo "📋 Copy the SERVICE_ROLE key (should be very long with 2 dots):"
read -p "Paste SERVICE_ROLE key: " SERVICE_KEY

echo ""
echo "🔍 Validating keys..."

# Basic validation - check if keys have dots
ANON_DOTS=$(echo "$ANON_KEY" | tr -cd '.' | wc -c)
SERVICE_DOTS=$(echo "$SERVICE_KEY" | tr -cd '.' | wc -c)

if [ "$ANON_DOTS" -ne 2 ]; then
    echo "❌ ANON key appears invalid (should have exactly 2 dots, found $ANON_DOTS)"
    exit 1
fi

if [ "$SERVICE_DOTS" -ne 2 ]; then
    echo "❌ SERVICE_ROLE key appears invalid (should have exactly 2 dots, found $SERVICE_DOTS)"
    exit 1
fi

echo "✅ Keys appear to be valid JWT format"
echo ""

# Update .env file
echo "📝 Updating .env file..."

# Create backup
cp .env .env.backup

# Update the keys in .env file
sed -i "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|" .env
sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY|" .env
sed -i "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$ANON_KEY|" .env

echo "✅ Keys updated in .env file"
echo "💾 Backup saved as .env.backup"
echo ""

echo "🧪 Testing connection..."
bun run packages/backend/src/scripts/validate-keys.ts

echo ""
echo "🎉 Done! You can now test the full connection with:"
echo "   bun run packages/backend/src/scripts/test-supabase-api.ts"