#!/bin/bash

# Production Environment Validation Script
# This script validates that all production requirements are met

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validation functions
validate_environment_variables() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "JWT_SECRET"
    )
    
    local warnings=()
    local errors=()
    
    # Check required variables
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            errors+=("$var is not set")
        else
            case $var in
                "NODE_ENV")
                    if [[ "${!var}" != "production" ]]; then
                        warnings+=("NODE_ENV is not set to 'production' (current: ${!var})")
                    fi
                    ;;
                "SUPABASE_URL")
                    if [[ "${!var}" == *"localhost"* ]] || [[ "${!var}" == *"127.0.0.1"* ]]; then
                        errors+=("SUPABASE_URL appears to be a local URL: ${!var}")
                    fi
                    ;;
                "JWT_SECRET")
                    if [[ ${#JWT_SECRET} -lt 32 ]]; then
                        errors+=("JWT_SECRET must be at least 32 characters long (current: ${#JWT_SECRET})")
                    fi
                    ;;
            esac
        fi
    done
    
    # Check optional but recommended variables
    local recommended_vars=(
        "LOG_LEVEL"
        "ENABLE_REQUEST_LOGGING"
        "ENABLE_GAME_LOGGING"
        "ENABLE_SECURITY_LOGGING"
        "METRICS_ENABLED"
        "STARTING_BALANCE"
        "DAILY_BONUS"
    )
    
    for var in "${recommended_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            warnings+=("$var is not set (will use default)")
        fi
    done
    
    # Report results
    if [[ ${#errors[@]} -gt 0 ]]; then
        log_error "Environment validation failed:"
        for error in "${errors[@]}"; do
            echo "  ❌ $error"
        done
        return 1
    fi
    
    if [[ ${#warnings[@]} -gt 0 ]]; then
        log_warning "Environment validation warnings:"
        for warning in "${warnings[@]}"; do
            echo "  ⚠️  $warning"
        done
    fi
    
    log_success "Environment variables validation passed"
    return 0
}

validate_supabase_connection() {
    log_info "Validating Supabase connection..."
    
    if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_ANON_KEY" ]]; then
        log_error "Supabase credentials not configured"
        return 1
    fi
    
    # Test Supabase connection
    local response
    local status_code
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        "$SUPABASE_URL/rest/v1/" 2>/dev/null) || {
        log_error "Failed to connect to Supabase"
        return 1
    }
    
    status_code=$(echo "$response" | tail -n1)
    
    if [[ "$status_code" == "200" ]]; then
        log_success "Supabase connection successful"
        return 0
    else
        log_error "Supabase connection failed (HTTP $status_code)"
        return 1
    fi
}

validate_security_configuration() {
    log_info "Validating security configuration..."
    
    local issues=()
    
    # Check JWT secret strength
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        issues+=("JWT_SECRET is too short (minimum 32 characters)")
    fi
    
    # Check if using default/weak secrets
    local weak_secrets=(
        "your_jwt_secret_here"
        "super-secret-jwt-token"
        "development-secret"
        "test-secret"
        "secret"
        "password"
        "123456"
    )
    
    for weak_secret in "${weak_secrets[@]}"; do
        if [[ "$JWT_SECRET" == *"$weak_secret"* ]]; then
            issues+=("JWT_SECRET appears to contain weak/default values")
            break
        fi
    done
    
    # Check Supabase keys
    if [[ "$SUPABASE_ANON_KEY" == *"your_"* ]] || [[ "$SUPABASE_SERVICE_ROLE_KEY" == *"your_"* ]]; then
        issues+=("Supabase keys appear to be placeholder values")
    fi
    
    if [[ ${#issues[@]} -gt 0 ]]; then
        log_error "Security validation failed:"
        for issue in "${issues[@]}"; do
            echo "  ❌ $issue"
        done
        return 1
    fi
    
    log_success "Security configuration validation passed"
    return 0
}

validate_docker_configuration() {
    log_info "Validating Docker configuration..."
    
    local issues=()
    
    # Check if Dockerfile exists
    if [[ ! -f "Dockerfile" ]]; then
        issues+=("Dockerfile not found")
    else
        # Check Dockerfile content
        if ! grep -q "HEALTHCHECK" Dockerfile; then
            issues+=("Dockerfile missing HEALTHCHECK instruction")
        fi
        
        if ! grep -q "USER" Dockerfile; then
            issues+=("Dockerfile missing USER instruction (security risk)")
        fi
        
        if ! grep -q "EXPOSE 3000" Dockerfile; then
            issues+=("Dockerfile missing EXPOSE instruction")
        fi
    fi
    
    # Check if coolify.json exists
    if [[ ! -f "coolify.json" ]]; then
        log_warning "coolify.json not found (optional but recommended)"
    fi
    
    if [[ ${#issues[@]} -gt 0 ]]; then
        log_error "Docker configuration validation failed:"
        for issue in "${issues[@]}"; do
            echo "  ❌ $issue"
        done
        return 1
    fi
    
    log_success "Docker configuration validation passed"
    return 0
}

validate_build_requirements() {
    log_info "Validating build requirements..."
    
    local issues=()
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        issues+=("package.json not found")
    fi
    
    # Check if backend package.json exists
    if [[ ! -f "packages/backend/package.json" ]]; then
        issues+=("Backend package.json not found")
    fi
    
    # Check if frontend package.json exists
    if [[ ! -f "packages/frontend/package.json" ]]; then
        issues+=("Frontend package.json not found")
    fi
    
    # Check if lock files exist
    if [[ ! -f "bun.lock" ]] && [[ ! -f "package-lock.json" ]] && [[ ! -f "yarn.lock" ]]; then
        log_warning "No lock file found (bun.lock, package-lock.json, or yarn.lock)")
    fi
    
    if [[ ${#issues[@]} -gt 0 ]]; then
        log_error "Build requirements validation failed:"
        for issue in "${issues[@]}"; do
            echo "  ❌ $issue"
        done
        return 1
    fi
    
    log_success "Build requirements validation passed"
    return 0
}

validate_production_readiness() {
    log_info "Validating production readiness..."
    
    local warnings=()
    
    # Check for development files that shouldn't be in production
    local dev_files=(
        ".env"
        ".env.local"
        ".env.development"
        "docker-compose.yml"
    )
    
    for file in "${dev_files[@]}"; do
        if [[ -f "$file" ]]; then
            warnings+=("Development file present: $file")
        fi
    done
    
    # Check for production-specific files
    if [[ ! -f ".env.production" ]]; then
        warnings+=("No .env.production template found")
    fi
    
    if [[ ! -f "DEPLOYMENT.md" ]]; then
        warnings+=("No deployment documentation found")
    fi
    
    if [[ ${#warnings[@]} -gt 0 ]]; then
        log_warning "Production readiness warnings:"
        for warning in "${warnings[@]}"; do
            echo "  ⚠️  $warning"
        done
    fi
    
    log_success "Production readiness validation completed"
    return 0
}

# Main validation function
main() {
    echo "========================================"
    echo "  Production Environment Validation"
    echo "========================================"
    echo ""
    
    # Load environment variables if available
    if [[ -f ".env.production" ]]; then
        log_info "Loading environment variables from .env.production"
        set -a
        source .env.production
        set +a
    elif [[ -f ".env" ]]; then
        log_info "Loading environment variables from .env"
        set -a
        source .env
        set +a
    fi
    
    local failed_validations=0
    local total_validations=0
    
    # Run all validations
    local validations=(
        "validate_environment_variables"
        "validate_supabase_connection"
        "validate_security_configuration"
        "validate_docker_configuration"
        "validate_build_requirements"
        "validate_production_readiness"
    )
    
    for validation in "${validations[@]}"; do
        total_validations=$((total_validations + 1))
        if ! $validation; then
            failed_validations=$((failed_validations + 1))
        fi
        echo ""
    done
    
    # Summary
    echo "========================================"
    echo "Validation Summary"
    echo "========================================"
    echo "Total validations: $total_validations"
    echo "Passed: $((total_validations - failed_validations))"
    echo "Failed: $failed_validations"
    echo ""
    
    if [[ $failed_validations -eq 0 ]]; then
        log_success "All validations passed! Ready for production deployment 🚀"
        exit 0
    else
        log_error "$failed_validations validation(s) failed. Please fix the issues before deploying."
        exit 1
    fi
}

# Run main function
main