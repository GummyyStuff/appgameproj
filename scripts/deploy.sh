#!/bin/bash

# Tarkov Casino Deployment Script
# This script helps with deployment preparation and validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="tarkov-casino"
DOCKER_IMAGE_NAME="tarkov-casino"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
MAX_WAIT_TIME=120  # seconds

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

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed or not in PATH"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_info "Please set these variables or create a .env file"
        exit 1
    fi
    
    # Validate JWT secret length
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        log_error "JWT_SECRET must be at least 32 characters long"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    if docker build -t "$DOCKER_IMAGE_NAME:latest" .; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Test the built image
test_image() {
    log_info "Testing Docker image..."
    
    # Stop any existing container
    docker stop "$PROJECT_NAME-test" 2>/dev/null || true
    docker rm "$PROJECT_NAME-test" 2>/dev/null || true
    
    # Start test container
    log_info "Starting test container..."
    if ! docker run -d \
        --name "$PROJECT_NAME-test" \
        --env-file .env \
        -p 3001:3000 \
        "$DOCKER_IMAGE_NAME:latest"; then
        log_error "Failed to start test container"
        exit 1
    fi
    
    # Wait for container to be ready
    log_info "Waiting for container to be ready..."
    local wait_time=0
    local health_url="http://localhost:3001/api/health"
    
    while [[ $wait_time -lt $MAX_WAIT_TIME ]]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_success "Container is healthy and responding"
            break
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
        echo -n "."
    done
    
    if [[ $wait_time -ge $MAX_WAIT_TIME ]]; then
        log_error "Container failed to become healthy within $MAX_WAIT_TIME seconds"
        docker logs "$PROJECT_NAME-test"
        docker stop "$PROJECT_NAME-test"
        docker rm "$PROJECT_NAME-test"
        exit 1
    fi
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    local health_response
    health_response=$(curl -s "$health_url")
    
    if echo "$health_response" | grep -q '"status":"ok"'; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        echo "Response: $health_response"
        docker logs "$PROJECT_NAME-test"
        docker stop "$PROJECT_NAME-test"
        docker rm "$PROJECT_NAME-test"
        exit 1
    fi
    
    # Cleanup test container
    docker stop "$PROJECT_NAME-test"
    docker rm "$PROJECT_NAME-test"
    
    log_success "Image testing completed successfully"
}

# Run pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if .env file exists
    if [[ ! -f .env ]]; then
        log_warning ".env file not found, using environment variables"
    fi
    
    # Check if production environment file exists
    if [[ -f .env.production ]]; then
        log_info "Found .env.production file"
        log_warning "Make sure to use production environment variables in Coolify"
    fi
    
    # Validate Dockerfile
    if [[ ! -f Dockerfile ]]; then
        log_error "Dockerfile not found"
        exit 1
    fi
    
    # Check if coolify.json exists
    if [[ -f coolify.json ]]; then
        log_info "Found coolify.json configuration"
    else
        log_warning "coolify.json not found, using default configuration"
    fi
    
    log_success "Pre-deployment checks completed"
}

# Generate deployment summary
generate_summary() {
    log_info "Deployment Summary:"
    echo "===================="
    echo "Project: $PROJECT_NAME"
    echo "Docker Image: $DOCKER_IMAGE_NAME:latest"
    echo "Environment: ${NODE_ENV:-production}"
    echo "Port: ${PORT:-3000}"
    echo "Supabase URL: ${SUPABASE_URL}"
    echo "===================="
    echo ""
    log_info "Next steps:"
    echo "1. Push your code to the Git repository"
    echo "2. Configure environment variables in Coolify"
    echo "3. Deploy using Coolify dashboard"
    echo "4. Monitor deployment logs and health checks"
    echo ""
    log_info "Health check URL: https://your-domain.com/api/health"
    log_info "Metrics URL: https://your-domain.com/api/metrics"
}

# Main deployment preparation function
main() {
    echo "========================================"
    echo "  Tarkov Casino Deployment Preparation"
    echo "========================================"
    echo ""
    
    # Load environment variables if .env exists
    if [[ -f .env ]]; then
        log_info "Loading environment variables from .env file"
        set -a  # automatically export all variables
        source .env
        set +a
    fi
    
    check_dependencies
    validate_environment
    pre_deployment_checks
    build_image
    test_image
    generate_summary
    
    log_success "Deployment preparation completed successfully!"
    log_info "Your application is ready for deployment to Coolify"
}

# Handle script arguments
case "${1:-}" in
    "build")
        build_image
        ;;
    "test")
        test_image
        ;;
    "validate")
        validate_environment
        ;;
    "check")
        pre_deployment_checks
        ;;
    *)
        main
        ;;
esac