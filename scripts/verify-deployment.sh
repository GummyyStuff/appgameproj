#!/bin/bash
# Deployment verification script for Tarkov Casino

set -e

# Configuration
BASE_URL="${BASE_URL:-https://your-domain.com}"
API_URL="${API_URL:-$BASE_URL/api}"
TIMEOUT=30
MAX_RETRIES=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log "${BLUE}Running test: $test_name${NC}"
    
    if eval "$test_command"; then
        log "${GREEN}✓ PASSED: $test_name${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log "${RED}✗ FAILED: $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local url="$1"
    local service_name="$2"
    local retries=0
    
    log "${YELLOW}Waiting for $service_name to be ready...${NC}"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s -f --max-time $TIMEOUT "$url" > /dev/null; then
            log "${GREEN}$service_name is ready${NC}"
            return 0
        fi
        
        retries=$((retries + 1))
        log "Attempt $retries/$MAX_RETRIES failed, retrying in 10 seconds..."
        sleep 10
    done
    
    log "${RED}$service_name failed to become ready after $MAX_RETRIES attempts${NC}"
    return 1
}

# Test health endpoint
test_health_endpoint() {
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$API_URL/health")
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" != "200" ]; then
        log "Health endpoint returned HTTP $http_code"
        return 1
    fi
    
    # Check if response is valid JSON
    if ! echo "$body" | jq . > /dev/null 2>&1; then
        log "Health endpoint returned invalid JSON"
        return 1
    fi
    
    # Check required fields
    local status=$(echo "$body" | jq -r '.status')
    local database=$(echo "$body" | jq -r '.database')
    
    if [ "$status" != "healthy" ]; then
        log "Health status is not healthy: $status"
        return 1
    fi
    
    if [ "$database" != "connected" ]; then
        log "Database is not connected: $database"
        return 1
    fi
    
    return 0
}

# Test frontend accessibility
test_frontend_accessibility() {
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL")
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" != "200" ]; then
        log "Frontend returned HTTP $http_code"
        return 1
    fi
    
    # Check if HTML contains expected content
    if ! echo "$body" | grep -q "Tarkov Casino"; then
        log "Frontend does not contain expected content"
        return 1
    fi
    
    return 0
}

# Test API authentication endpoints
test_auth_endpoints() {
    # Test registration endpoint (should return validation error for empty data)
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        "$API_URL/auth/register")
    
    local http_code="${response: -3}"
    
    # Should return 400 for validation error
    if [ "$http_code" != "400" ]; then
        log "Auth registration endpoint returned unexpected HTTP $http_code (expected 400)"
        return 1
    fi
    
    # Test login endpoint (should return validation error for empty data)
    response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        "$API_URL/auth/login")
    
    http_code="${response: -3}"
    
    # Should return 400 for validation error
    if [ "$http_code" != "400" ]; then
        log "Auth login endpoint returned unexpected HTTP $http_code (expected 400)"
        return 1
    fi
    
    return 0
}

# Test game endpoints (without authentication - should return 401)
test_game_endpoints() {
    local endpoints=(
        "games/roulette/bet"
        "games/blackjack/start"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{"betAmount": 100}' \
            "$API_URL/$endpoint")
        
        local http_code="${response: -3}"
        
        # Should return 401 for unauthorized access
        if [ "$http_code" != "401" ]; then
            log "Game endpoint $endpoint returned unexpected HTTP $http_code (expected 401)"
            return 1
        fi
    done
    
    return 0
}

# Test user endpoints (without authentication - should return 401)
test_user_endpoints() {
    local endpoints=(
        "user/profile"
        "user/balance"
        "user/history"
        "user/stats"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT \
            -X GET \
            "$API_URL/$endpoint")
        
        local http_code="${response: -3}"
        
        # Should return 401 for unauthorized access
        if [ "$http_code" != "401" ]; then
            log "User endpoint $endpoint returned unexpected HTTP $http_code (expected 401)"
            return 1
        fi
    done
    
    return 0
}

# Test database connectivity
test_database_connectivity() {
    # This is tested indirectly through the health endpoint
    # but we can add additional checks here if needed
    
    local response=$(curl -s --max-time $TIMEOUT "$API_URL/health")
    local database_status=$(echo "$response" | jq -r '.database')
    
    if [ "$database_status" != "connected" ]; then
        log "Database connectivity test failed: $database_status"
        return 1
    fi
    
    return 0
}

# Test SSL certificate (if HTTPS)
test_ssl_certificate() {
    if [[ "$BASE_URL" == https://* ]]; then
        local domain=$(echo "$BASE_URL" | sed 's|https://||' | sed 's|/.*||')
        
        # Check certificate validity
        if ! openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null 2>/dev/null | \
             openssl x509 -checkend 86400 -noout > /dev/null 2>&1; then
            log "SSL certificate is invalid or expires within 24 hours"
            return 1
        fi
        
        return 0
    else
        log "Skipping SSL test for non-HTTPS URL"
        return 0
    fi
}

# Test response times
test_response_times() {
    local endpoints=(
        "$API_URL/health"
        "$BASE_URL"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local response_time=$(curl -s -w "%{time_total}" -o /dev/null --max-time $TIMEOUT "$endpoint")
        local response_time_ms=$(echo "$response_time * 1000" | bc)
        
        # Response time should be under 2 seconds
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            log "Endpoint $endpoint response time too slow: ${response_time_ms}ms"
            return 1
        fi
        
        log "Response time for $endpoint: ${response_time_ms}ms"
    done
    
    return 0
}

# Test CORS headers
test_cors_headers() {
    local response=$(curl -s -I --max-time $TIMEOUT \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        "$API_URL/auth/login")
    
    if ! echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        log "CORS headers not found in response"
        return 1
    fi
    
    return 0
}

# Test rate limiting
test_rate_limiting() {
    local endpoint="$API_URL/health"
    local requests_made=0
    local rate_limit_hit=false
    
    # Make multiple requests quickly to test rate limiting
    for i in {1..20}; do
        local response=$(curl -s -w "%{http_code}" --max-time 5 "$endpoint")
        local http_code="${response: -3}"
        
        requests_made=$((requests_made + 1))
        
        if [ "$http_code" = "429" ]; then
            rate_limit_hit=true
            break
        fi
        
        sleep 0.1
    done
    
    # For health endpoint, rate limiting might not apply
    # This test is more informational
    log "Made $requests_made requests, rate limit hit: $rate_limit_hit"
    return 0
}

# Test error handling
test_error_handling() {
    # Test 404 endpoint
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$API_URL/nonexistent")
    local http_code="${response: -3}"
    
    if [ "$http_code" != "404" ]; then
        log "404 error handling failed, got HTTP $http_code"
        return 1
    fi
    
    return 0
}

# Main verification function
main() {
    log "${GREEN}=== Tarkov Casino Deployment Verification ===${NC}"
    log "Base URL: $BASE_URL"
    log "API URL: $API_URL"
    log "Timeout: ${TIMEOUT}s"
    echo ""
    
    # Wait for services to be ready
    if ! wait_for_service "$API_URL/health" "API"; then
        log "${RED}API service is not ready, aborting verification${NC}"
        exit 1
    fi
    
    if ! wait_for_service "$BASE_URL" "Frontend"; then
        log "${RED}Frontend service is not ready, aborting verification${NC}"
        exit 1
    fi
    
    echo ""
    log "${YELLOW}Running deployment verification tests...${NC}"
    echo ""
    
    # Run all tests
    run_test "Health Endpoint" "test_health_endpoint"
    run_test "Frontend Accessibility" "test_frontend_accessibility"
    run_test "Authentication Endpoints" "test_auth_endpoints"
    run_test "Game Endpoints" "test_game_endpoints"
    run_test "User Endpoints" "test_user_endpoints"
    run_test "Database Connectivity" "test_database_connectivity"
    run_test "SSL Certificate" "test_ssl_certificate"
    run_test "Response Times" "test_response_times"
    run_test "CORS Headers" "test_cors_headers"
    run_test "Rate Limiting" "test_rate_limiting"
    run_test "Error Handling" "test_error_handling"
    
    echo ""
    log "${YELLOW}=== Verification Summary ===${NC}"
    log "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    log "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -gt 0 ]; then
        log "${RED}Failed Tests:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            log "  - $test"
        done
        echo ""
        log "${RED}Deployment verification FAILED${NC}"
        exit 1
    else
        echo ""
        log "${GREEN}All tests passed! Deployment verification SUCCESSFUL${NC}"
        exit 0
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL           Base URL to test (default: https://your-domain.com)"
    echo "  -t, --timeout SECONDS   Request timeout (default: 30)"
    echo "  -r, --retries COUNT     Max retries for service readiness (default: 5)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BASE_URL                Base URL to test"
    echo "  API_URL                 API URL to test (default: BASE_URL/api)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test default URL"
    echo "  $0 -u https://staging.example.com    # Test staging environment"
    echo "  BASE_URL=http://localhost:3000 $0    # Test local development"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            API_URL="$BASE_URL/api"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -r|--retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Check dependencies
if ! command -v curl &> /dev/null; then
    log "${RED}curl is required but not installed${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log "${RED}jq is required but not installed${NC}"
    exit 1
fi

if ! command -v bc &> /dev/null; then
    log "${RED}bc is required but not installed${NC}"
    exit 1
fi

# Run main function
main "$@"