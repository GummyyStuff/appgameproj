#!/bin/bash

# Production Validation Script
# Validates that the production deployment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"https://tarkov.juanis.cool"}
TIMEOUT=10

echo -e "${BLUE}🔍 Validating production deployment at: $DOMAIN${NC}"
echo ""

# Function to check HTTP status
check_endpoint() {
    local url="$1"
    local expected_status="$2"
    local description="$3"
    
    echo -n "Checking $description... "
    
    if command -v curl >/dev/null 2>&1; then
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
    else
        echo -e "${RED}❌ curl not available${NC}"
        return 1
    fi
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK ($status)${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed ($status, expected $expected_status)${NC}"
        return 1
    fi
}

# Function to check for specific content
check_content() {
    local url="$1"
    local pattern="$2"
    local description="$3"
    
    echo -n "Checking $description... "
    
    if command -v curl >/dev/null 2>&1; then
        content=$(curl -s --max-time $TIMEOUT "$url" || echo "")
    else
        echo -e "${RED}❌ curl not available${NC}"
        return 1
    fi
    
    if echo "$content" | grep -q "$pattern"; then
        echo -e "${GREEN}✅ Found${NC}"
        return 0
    else
        echo -e "${RED}❌ Not found${NC}"
        return 1
    fi
}

# Function to check CSP headers
check_csp() {
    local url="$1"
    
    echo -n "Checking CSP headers... "
    
    if command -v curl >/dev/null 2>&1; then
        csp_header=$(curl -s -I --max-time $TIMEOUT "$url" | grep -i "content-security-policy" || echo "")
    else
        echo -e "${RED}❌ curl not available${NC}"
        return 1
    fi
    
    if [ -n "$csp_header" ]; then
        echo -e "${GREEN}✅ Present${NC}"
        
        # Check for specific CSP directives
        if echo "$csp_header" | grep -q "fonts.googleapis.com"; then
            echo "  ✅ Google Fonts allowed"
        else
            echo -e "  ${YELLOW}⚠️  Google Fonts not in CSP${NC}"
        fi
        
        if echo "$csp_header" | grep -q "static.cloudflareinsights.com"; then
            echo "  ✅ Cloudflare Insights allowed"
        else
            echo -e "  ${YELLOW}⚠️  Cloudflare Insights not in CSP${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Not found${NC}"
        return 1
    fi
}

echo "=== Basic Connectivity ==="
check_endpoint "$DOMAIN" "200" "Main page"
check_endpoint "$DOMAIN/api/health" "200" "Health endpoint"

echo ""
echo "=== Frontend Validation ==="
check_content "$DOMAIN" "Tarkov Casino" "Page title"
check_content "$DOMAIN" "root" "React root element"

echo ""
echo "=== API Validation ==="
check_endpoint "$DOMAIN/api/health/detailed" "200" "Detailed health check"
check_endpoint "$DOMAIN/api/ready" "200" "Readiness probe"
check_endpoint "$DOMAIN/api/live" "200" "Liveness probe"

echo ""
echo "=== Security Headers ==="
check_csp "$DOMAIN"

# Check for common security headers
echo -n "Checking security headers... "
if command -v curl >/dev/null 2>&1; then
    headers=$(curl -s -I --max-time $TIMEOUT "$DOMAIN")
    
    security_score=0
    total_checks=5
    
    if echo "$headers" | grep -qi "x-content-type-options"; then
        echo "  ✅ X-Content-Type-Options"
        ((security_score++))
    else
        echo -e "  ${YELLOW}⚠️  X-Content-Type-Options missing${NC}"
    fi
    
    if echo "$headers" | grep -qi "x-frame-options"; then
        echo "  ✅ X-Frame-Options"
        ((security_score++))
    else
        echo -e "  ${YELLOW}⚠️  X-Frame-Options missing${NC}"
    fi
    
    if echo "$headers" | grep -qi "x-xss-protection"; then
        echo "  ✅ X-XSS-Protection"
        ((security_score++))
    else
        echo -e "  ${YELLOW}⚠️  X-XSS-Protection missing${NC}"
    fi
    
    if echo "$headers" | grep -qi "referrer-policy"; then
        echo "  ✅ Referrer-Policy"
        ((security_score++))
    else
        echo -e "  ${YELLOW}⚠️  Referrer-Policy missing${NC}"
    fi
    
    if echo "$headers" | grep -qi "strict-transport-security"; then
        echo "  ✅ HSTS"
        ((security_score++))
    else
        echo -e "  ${YELLOW}⚠️  HSTS missing${NC}"
    fi
    
    echo -e "${GREEN}Security Score: $security_score/$total_checks${NC}"
fi

echo ""
echo "=== Performance Check ==="
echo -n "Measuring response time... "
if command -v curl >/dev/null 2>&1; then
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "$DOMAIN")
    echo -e "${GREEN}${response_time}s${NC}"
    
    # Convert to milliseconds for comparison
    response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "0")
    if [ "${response_ms%.*}" -lt 2000 ]; then
        echo "  ✅ Response time good (< 2s)"
    else
        echo -e "  ${YELLOW}⚠️  Response time slow (> 2s)${NC}"
    fi
fi

echo ""
echo "=== Environment Variables Check ==="
# Check if the frontend is getting proper environment variables
echo -n "Checking for environment variable issues... "
if command -v curl >/dev/null 2>&1; then
    page_content=$(curl -s --max-time $TIMEOUT "$DOMAIN")
    
    if echo "$page_content" | grep -q "your-supabase-project-url"; then
        echo -e "${RED}❌ Placeholder Supabase URL detected${NC}"
        echo "  🚨 Production environment variables not properly configured"
    elif echo "$page_content" | grep -q "localhost"; then
        echo -e "${YELLOW}⚠️  Localhost references found${NC}"
        echo "  🚨 Development URLs in production build"
    else
        echo -e "${GREEN}✅ No obvious environment issues${NC}"
    fi
fi

echo ""
echo "=== Summary ==="
echo -e "${BLUE}Validation complete for: $DOMAIN${NC}"
echo ""
echo "If you see any ❌ or 🚨 issues above, please:"
echo "1. Check your environment variables configuration"
echo "2. Ensure proper build-time variables are set"
echo "3. Rebuild and redeploy the application"
echo "4. Check browser console for additional errors"
echo ""
echo -e "${GREEN}For detailed setup instructions, run: ./scripts/setup-production-env.sh${NC}"