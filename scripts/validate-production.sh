#!/bin/bash

# Validate production configuration before deployment
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

failures=0

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    failures=$((failures + 1))
}

ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Load .env / .env.production if present
for env_file in .env.production .env; do
    if [[ -f "$env_file" ]]; then
        set -a
        source "$env_file"
        set +a
        break
    fi
done

# Required runtime variables
required_vars=(
    "APPWRITE_ENDPOINT"
    "APPWRITE_PROJECT_ID"
    "APPWRITE_API_KEY"
    "JWT_SECRET"
    "VITE_APPWRITE_ENDPOINT"
    "VITE_APPWRITE_PROJECT_ID"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        fail "Missing environment variable: $var"
    else
        ok "$var is set"
    fi
done

# JWT secret must be at least 32 characters
if [[ -n "$JWT_SECRET" && ${#JWT_SECRET} -lt 32 ]]; then
    fail "JWT_SECRET must be at least 32 characters long"
fi

# NODE_ENV should be production for prod deploys
if [[ "${NODE_ENV:-}" != "production" ]]; then
    warn "NODE_ENV is not set to 'production' (current: ${NODE_ENV:-unset})"
fi

# Dockerfile must exist
if [[ -f Dockerfile ]]; then
    ok "Dockerfile present"
else
    fail "Dockerfile not found"
fi

if [[ $failures -gt 0 ]]; then
    echo ""
    echo -e "${RED}Validation failed with $failures error(s)${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Production configuration is valid${NC}"
