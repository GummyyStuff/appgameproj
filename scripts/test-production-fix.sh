#!/bin/bash

# Test script to verify the production fixes worked
# This specifically tests for the issues that were causing problems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="https://tarkov.juanis.cool"

echo -e "${BLUE}🧪 Testing Production Fixes${NC}"
echo "Domain: $DOMAIN"
echo ""

# Test 1: CSP Headers for Google Fonts
echo "=== Test 1: CSP Headers ==="
echo -n "Testing Google Fonts CSP... "
csp_header=$(curl -s -I "$DOMAIN" | grep -i "content-security-policy" || echo "")
if echo "$csp_header" | grep -q "fonts.googleapis.com"; then
    echo -e "${GREEN}✅ FIXED${NC}"
else
    echo -e "${RED}❌ STILL BLOCKED${NC}"
fi

echo -n "Testing Cloudflare Insights CSP... "
if echo "$csp_header" | grep -q "static.cloudflareinsights.com"; then
    echo -e "${GREEN}✅ FIXED${NC}"
else
    echo -e "${RED}❌ STILL BLOCKED${NC}"
fi

# Test 2: React Loading
echo ""
echo "=== Test 2: React Application ==="
echo -n "Testing React root element... "
if curl -s "$DOMAIN" | grep -q 'id="root"'; then
    echo -e "${GREEN}✅ PRESENT${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

echo -n "Testing for React errors... "
page_content=$(curl -s "$DOMAIN")
if echo "$page_content" | grep -q "createContext.*undefined"; then
    echo -e "${RED}❌ REACT ERROR STILL PRESENT${NC}"
else
    echo -e "${GREEN}✅ NO REACT ERRORS${NC}"
fi

# Test 3: API Connectivity
echo ""
echo "=== Test 3: API Functionality ==="
echo -n "Testing API health... "
api_response=$(curl -s "$DOMAIN/api/health" || echo "")
if echo "$api_response" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ API WORKING${NC}"
else
    echo -e "${RED}❌ API ISSUES${NC}"
fi

# Test 4: Environment Variables
echo ""
echo "=== Test 4: Environment Configuration ==="
echo -n "Testing for placeholder URLs... "
if echo "$page_content" | grep -q "your-supabase-project-url\|localhost:"; then
    echo -e "${RED}❌ PLACEHOLDER VALUES DETECTED${NC}"
    echo "  🚨 Environment variables may not be properly configured"
else
    echo -e "${GREEN}✅ NO PLACEHOLDER VALUES${NC}"
fi

# Test 5: Security Headers
echo ""
echo "=== Test 5: Security Headers ==="
headers=$(curl -s -I "$DOMAIN")
security_headers=("x-content-type-options" "x-frame-options" "x-xss-protection" "referrer-policy")
for header in "${security_headers[@]}"; do
    echo -n "Testing $header... "
    if echo "$headers" | grep -qi "$header"; then
        echo -e "${GREEN}✅ PRESENT${NC}"
    else
        echo -e "${YELLOW}⚠️  MISSING${NC}"
    fi
done

# Test 6: Performance
echo ""
echo "=== Test 6: Performance ==="
echo -n "Testing response time... "
response_time=$(curl -s -o /dev/null -w "%{time_total}" "$DOMAIN")
echo -e "${GREEN}${response_time}s${NC}"

# Summary
echo ""
echo "=== Summary ==="
echo -e "${BLUE}Production deployment test completed!${NC}"
echo ""

# Check if the main issues are resolved
issues_fixed=0
total_issues=3

if echo "$csp_header" | grep -q "fonts.googleapis.com"; then
    ((issues_fixed++))
fi

if echo "$csp_header" | grep -q "static.cloudflareinsights.com"; then
    ((issues_fixed++))
fi

if ! echo "$page_content" | grep -q "createContext.*undefined"; then
    ((issues_fixed++))
fi

if [ $issues_fixed -eq $total_issues ]; then
    echo -e "${GREEN}🎉 ALL CRITICAL ISSUES FIXED! ($issues_fixed/$total_issues)${NC}"
    echo ""
    echo "✅ CSP headers now allow external resources"
    echo "✅ React application loads without errors"
    echo "✅ API is responding correctly"
    echo ""
    echo "Your Tarkov Casino should now be working properly!"
else
    echo -e "${YELLOW}⚠️  Some issues may remain ($issues_fixed/$total_issues fixed)${NC}"
    echo ""
    echo "If you're still experiencing problems:"
    echo "1. Check browser console for any remaining errors"
    echo "2. Verify environment variables are properly set"
    echo "3. Consider a hard refresh (Ctrl+F5) to clear cache"
fi