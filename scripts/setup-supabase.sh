#!/bin/bash

# Supabase Setup Script for Tarkov Casino
# This script helps you get your Supabase keys and test the connection

echo "🚀 Tarkov Casino - Supabase Setup"
echo "=================================="
echo ""

SUPABASE_URL="http://192.168.0.69:8001"

echo "Your Supabase URL: $SUPABASE_URL"
echo ""

echo "📋 To get your Supabase keys:"
echo "1. Open your browser and go to: $SUPABASE_URL"
echo "2. Go to Settings > API"
echo "3. Copy the following keys:"
echo "   - anon/public key (for SUPABASE_ANON_KEY)"
echo "   - service_role key (for SUPABASE_SERVICE_ROLE_KEY)"
echo ""

echo "🔧 Once you have the keys, update your .env file:"
echo "   SUPABASE_ANON_KEY=your_anon_key_here"
echo "   SUPABASE_SERVICE_ROLE_KEY=your_service_key_here"
echo ""

echo "🧪 Testing connection to Supabase..."
echo "Checking if Supabase is accessible at $SUPABASE_URL"

# Test if Supabase is accessible
if curl -s --connect-timeout 5 "$SUPABASE_URL/health" > /dev/null 2>&1; then
    echo "✅ Supabase is accessible at $SUPABASE_URL"
elif curl -s --connect-timeout 5 "$SUPABASE_URL" > /dev/null 2>&1; then
    echo "✅ Supabase is accessible at $SUPABASE_URL"
else
    echo "❌ Cannot connect to Supabase at $SUPABASE_URL"
    echo "   Please check:"
    echo "   - Is Supabase running?"
    echo "   - Is the IP address correct?"
    echo "   - Are there any firewall issues?"
fi

echo ""
echo "📚 Next steps:"
echo "1. Get your keys from the Supabase dashboard"
echo "2. Update the .env file with your actual keys"
echo "3. Run: bun run db:setup to create the database schema"
echo "4. Run: bun test to verify everything works"
echo ""