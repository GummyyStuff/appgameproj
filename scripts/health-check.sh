#!/bin/bash

# Health Check Script for Tarkov Casino
# This script performs comprehensive health checks on the deployed application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_URL="http://localhost:3000"
TIMEOUT=10
VERBOSE=false

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL       Base URL to check (default: $DEFAULT_URL)"
    echo "  -t, --timeout SEC   Request timeout in seconds (default: $TIMEOUT)"
    echo "  -v, --verbose       Enable verbose output"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Check localhost"
    echo "  $0 -u https://your-domain.com        # Check production"
    echo "  $0 -u http://localhost:3000 -v       # Verbose local check"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--url)
                BASE_URL="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Set default URL if not provided
    BASE_URL="${BASE_URL:-$DEFAULT_URL}"
}

# Make HTTP request with error handling
make_request() {
    local url="$1"
    local expected_status="${2:-200}"
    local description="$3"
    
    if [[ "$VERBOSE" == true ]]; then
        log_info "Checking: $description"
        log_info "URL: $url"
    fi
    
    local response
    local status_code
    
    # Make request and capture both response and status code
    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null) || {
        log_error "$description - Request failed (connection error)"
        return 1
    }
    
    # Extract status code (last line) and response body (everything else)
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [[ "$status_code" == "$expected_status" ]]; then
        log_success "$description - HTTP $status_code"
        if [[ "$VERBOSE" == true ]]; then
            echo "Response: $response_body" | head -c 200
            echo ""
        fi
        return 0
    else
        log_error "$description - HTTP $status_code (expected $expected_status)"
        if [[ "$VERBOSE" == true ]]; then
            echo "Response: $response_body"
        fi
        return 1
    fi
}

# Check JSON response contains expected field
check_json_field() {
    local url="$1"
    local field="$2"
    local expected_value="$3"
    local description="$4"
    
    if [[ "$VERBOSE" == true ]]; then
        log_info "Checking JSON field: $description"
    fi
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null) || {
        log_error "$description - Request failed"
        return 1
    }
    
    # Check if response contains expected field and value
    if echo "$response" | grep -q "\"$field\":\"$expected_value\""; then
        log_success "$description - $field: $expected_value"
        return 0
    else
        log_error "$description - $field not found or incorrect value"
        if [[ "$VERBOSE" == true ]]; then
            echo "Response: $response"
        fi
        return 1
    fi
}

# Basic health check
check_basic_health() {
    log_info "Running basic health check..."
    
    local health_url="$BASE_URL/api/health"
    
    if make_request "$health_url" "200" "Basic health check"; then
        if check_json_field "$health_url" "status" "ok" "Health status"; then
            return 0
        fi
    fi
    
    return 1
}

# Detailed health check
check_detailed_health() {
    log_info "Running detailed health check..."
    
    local detailed_url="$BASE_URL/api/health/detailed"
    
    if make_request "$detailed_url" "200" "Detailed health check"; then
        local response
        response=$(curl -s --max-time "$TIMEOUT" "$detailed_url" 2>/dev/null)
        
        # Check for specific fields in detailed response
        if echo "$response" | grep -q '"dependencies"'; then
            log_success "Dependencies check included"
        else
            log_warning "Dependencies check missing"
        fi
        
        if echo "$response" | grep -q '"memory"'; then
            log_success "Memory usage included"
        else
            log_warning "Memory usage missing"
        fi
        
        if echo "$response" | grep -q '"system"'; then
            log_success "System info included"
        else
            log_warning "System info missing"
        fi
        
        return 0
    fi
    
    return 1
}

# Check readiness endpoint
check_readiness() {
    log_info "Checking readiness..."
    
    local ready_url="$BASE_URL/api/ready"
    
    if make_request "$ready_url" "200" "Readiness check"; then
        if check_json_field "$ready_url" "ready" "true" "Ready status"; then
            return 0
        fi
    fi
    
    return 1
}

# Check liveness endpoint
check_liveness() {
    log_info "Checking liveness..."
    
    local live_url="$BASE_URL/api/live"
    
    if make_request "$live_url" "200" "Liveness check"; then
        if check_json_field "$live_url" "alive" "true" "Alive status"; then
            return 0
        fi
    fi
    
    return 1
}

# Check metrics endpoint
check_metrics() {
    log_info "Checking metrics endpoint..."
    
    local metrics_url="$BASE_URL/api/metrics"
    
    # Metrics might be disabled, so we accept both 200 and 404
    local response
    local status_code
    
    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$metrics_url" 2>/dev/null) || {
        log_warning "Metrics endpoint - Request failed"
        return 1
    }
    
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [[ "$status_code" == "200" ]]; then
        log_success "Metrics endpoint - HTTP 200 (enabled)"
        if [[ "$VERBOSE" == true ]]; then
            echo "$response_body" | head -5
        fi
        return 0
    elif [[ "$status_code" == "404" ]]; then
        log_warning "Metrics endpoint - HTTP 404 (disabled)"
        return 0
    else
        log_error "Metrics endpoint - HTTP $status_code"
        return 1
    fi
}

# Check frontend (static files)
check_frontend() {
    log_info "Checking frontend..."
    
    local frontend_url="$BASE_URL/"
    
    if make_request "$frontend_url" "200" "Frontend check"; then
        return 0
    fi
    
    return 1
}

# Performance test
performance_test() {
    log_info "Running performance test..."
    
    local health_url="$BASE_URL/api/health"
    local total_time=0
    local requests=5
    
    for i in $(seq 1 $requests); do
        local start_time
        local end_time
        local request_time
        
        start_time=$(date +%s%N)
        
        if curl -s --max-time "$TIMEOUT" "$health_url" > /dev/null 2>&1; then
            end_time=$(date +%s%N)
            request_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
            total_time=$((total_time + request_time))
            
            if [[ "$VERBOSE" == true ]]; then
                echo "Request $i: ${request_time}ms"
            fi
        else
            log_error "Performance test - Request $i failed"
            return 1
        fi
    done
    
    local avg_time=$((total_time / requests))
    
    if [[ $avg_time -lt 1000 ]]; then
        log_success "Performance test - Average response time: ${avg_time}ms"
    elif [[ $avg_time -lt 2000 ]]; then
        log_warning "Performance test - Average response time: ${avg_time}ms (acceptable)"
    else
        log_error "Performance test - Average response time: ${avg_time}ms (slow)"
        return 1
    fi
    
    return 0
}

# Main health check function
main() {
    echo "========================================"
    echo "  Tarkov Casino Health Check"
    echo "========================================"
    echo ""
    echo "Target URL: $BASE_URL"
    echo "Timeout: ${TIMEOUT}s"
    echo "Verbose: $VERBOSE"
    echo ""
    
    local failed_checks=0
    local total_checks=0
    
    # Run all health checks
    local checks=(
        "check_basic_health"
        "check_detailed_health"
        "check_readiness"
        "check_liveness"
        "check_metrics"
        "check_frontend"
        "performance_test"
    )
    
    for check in "${checks[@]}"; do
        total_checks=$((total_checks + 1))
        if ! $check; then
            failed_checks=$((failed_checks + 1))
        fi
        echo ""
    done
    
    # Summary
    echo "========================================"
    echo "Health Check Summary"
    echo "========================================"
    echo "Total checks: $total_checks"
    echo "Passed: $((total_checks - failed_checks))"
    echo "Failed: $failed_checks"
    echo ""
    
    if [[ $failed_checks -eq 0 ]]; then
        log_success "All health checks passed! 🎉"
        exit 0
    else
        log_error "$failed_checks health check(s) failed"
        exit 1
    fi
}

# Parse arguments and run main function
parse_args "$@"
main