#!/bin/bash

# Diagnostic script for blank page issue
# This helps identify why the React app isn't loading

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="https://tarkov.juanis.cool"

echo -e "${BLUE}🔍 Diagnosing Blank Page Issue${NC}"
echo "Domain: $DOMAIN"
echo ""

# Check 1: Basic connectivity
echo "=== 1. Basic Connectivity ==="
echo -n "Site responds: "
if curl -s -o /dev/null -w "%{http_code}" "$DOMAIN" | grep -q "200"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "🚨 Site is not responding. Check deployment status."
    exit 1
fi

# Check 2: HTML structure
echo ""
echo "=== 2. HTML Structure ==="
html_content=$(curl -s "$DOMAIN")

echo -n "React root element: "
if echo "$html_content" | grep -q 'id="root"'; then
    echo -e "${GREEN}✅ PRESENT${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

echo -n "JavaScript bundle: "
if echo "$html_content" | grep -q 'src=".*\.js"'; then
    echo -e "${GREEN}✅ PRESENT${NC}"
    js_file=$(echo "$html_content" | grep -o 'src="[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
    echo "  Bundle: $js_file"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

# Check 3: JavaScript errors
echo ""
echo "=== 3. JavaScript Bundle Analysis ==="
if [ -n "$js_file" ]; then
    echo "Downloading JavaScript bundle..."
    js_content=$(curl -s "$DOMAIN$js_file")
    
    echo -n "React imports: "
    if echo "$js_content" | grep -q "createContext\|useState\|useEffect"; then
        echo -e "${GREEN}✅ PRESENT${NC}"
    else
        echo -e "${RED}❌ MISSING${NC}"
        echo "🚨 React code not found in bundle"
    fi
    
    echo -n "Supabase client: "
    if echo "$js_content" | grep -q "supabase\|createClient"; then
        echo -e "${GREEN}✅ PRESENT${NC}"
    else
        echo -e "${RED}❌ MISSING${NC}"
    fi
    
    echo -n "Environment variables: "
    if echo "$js_content" | grep -q "VITE_SUPABASE_URL\|import\.meta\.env"; then
        echo -e "${YELLOW}⚠️  BUILD-TIME VARIABLES VISIBLE${NC}"
        echo "🚨 This suggests environment variables weren't properly substituted"
    else
        echo -e "${GREEN}✅ PROPERLY SUBSTITUTED${NC}"
    fi
    
    echo -n "Error patterns: "
    if echo "$js_content" | grep -q "Missing required environment\|undefined.*createContext"; then
        echo -e "${RED}❌ ERROR PATTERNS FOUND${NC}"
        echo "🚨 Environment variable errors detected in bundle"
    else
        echo -e "${GREEN}✅ NO ERROR PATTERNS${NC}"
    fi
fi

# Check 4: API connectivity
echo ""
echo "=== 4. API Connectivity ==="
echo -n "Backend API: "
api_response=$(curl -s "$DOMAIN/api/health" || echo "")
if echo "$api_response" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ WORKING${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "API Response: $api_response"
fi

# Check 5: Environment variable diagnosis
echo ""
echo "=== 5. Environment Variable Diagnosis ==="

# Check if placeholder values are in the bundle
echo -n "Checking for placeholder values: "
if echo "$js_content" | grep -q "your-supabase-project-url\|your_production_supabase"; then
    echo -e "${RED}❌ PLACEHOLDER VALUES FOUND${NC}"
    echo "🚨 CRITICAL: Build used placeholder environment variables"
    echo ""
    echo "This means:"
    echo "1. Environment variables weren't set in Coolify during build"
    echo "2. The build process used values from .env.production file"
    echo "3. Supabase client can't initialize with invalid URLs"
    echo ""
    echo "SOLUTION:"
    echo "1. Set proper environment variables in Coolify"
    echo "2. Trigger a rebuild"
    echo "3. Verify variables are available during build process"
else
    echo -e "${GREEN}✅ NO PLACEHOLDER VALUES${NC}"
fi

# Check 6: Build-time vs Runtime issues
echo ""
echo "=== 6. Build vs Runtime Analysis ==="

echo "Checking current .env.production file:"
if [ -f "packages/frontend/.env.production" ]; then
    echo -e "${YELLOW}Current .env.production:${NC}"
    cat packages/frontend/.env.production | grep -v "^#" | grep -v "^$"
    echo ""
    
    if grep -q "your-supabase-project-url" packages/frontend/.env.production; then
        echo -e "${RED}🚨 PROBLEM IDENTIFIED:${NC}"
        echo "The .env.production file contains placeholder values."
        echo "During Docker build, if Coolify environment variables aren't set,"
        echo "the build process falls back to these placeholder values."
        echo ""
        echo "This causes the Supabase client to fail initialization."
    fi
fi

# Summary and recommendations
echo ""
echo "=== 🎯 DIAGNOSIS SUMMARY ==="
echo ""

if echo "$js_content" | grep -q "your-supabase-project-url\|your_production_supabase"; then
    echo -e "${RED}🚨 ROOT CAUSE IDENTIFIED: Environment Variables${NC}"
    echo ""
    echo "The blank page is caused by:"
    echo "1. Missing/incorrect environment variables in Coolify"
    echo "2. Build process using placeholder values"
    echo "3. Supabase client failing to initialize"
    echo "4. React app crashing on startup"
    echo ""
    echo -e "${YELLOW}IMMEDIATE ACTION REQUIRED:${NC}"
    echo "1. Set proper environment variables in Coolify:"
    echo "   - VITE_SUPABASE_URL=https://your-project.supabase.co"
    echo "   - VITE_SUPABASE_ANON_KEY=your_anon_key"
    echo "   - VITE_API_URL=https://tarkov.juanis.cool/api"
    echo "2. Trigger a rebuild in Coolify"
    echo "3. Wait for deployment to complete"
    echo ""
    echo -e "${BLUE}📖 See COOLIFY_SETUP.md for detailed instructions${NC}"
else
    echo -e "${GREEN}✅ Environment variables appear to be properly configured${NC}"
    echo ""
    echo "The issue might be:"
    echo "1. JavaScript execution errors"
    echo "2. Network connectivity issues"
    echo "3. Browser caching problems"
    echo ""
    echo "Try:"
    echo "1. Hard refresh (Ctrl+F5)"
    echo "2. Check browser console for errors"
    echo "3. Test in incognito mode"
fi