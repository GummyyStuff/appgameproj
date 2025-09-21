#!/bin/bash

# Deploy debug version to test React loading
# This temporarily replaces main.tsx with a debug version

set -e

echo "🔧 Deploying debug version to test React loading..."

# Backup original main.tsx
cp packages/frontend/src/main.tsx packages/frontend/src/main.tsx.backup

# Replace with debug version
cp packages/frontend/src/main-debug.tsx packages/frontend/src/main.tsx

echo "✅ Debug version deployed"
echo ""
echo "Now:"
echo "1. Commit and push these changes"
echo "2. Wait for deployment"
echo "3. Check if the site loads with debug info"
echo "4. Run: ./scripts/restore-main.sh to restore original"
echo ""
echo "The debug version will show:"
echo "- Whether React is loading properly"
echo "- Environment variable values"
echo "- Basic React functionality test"