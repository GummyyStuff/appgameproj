#!/bin/bash

# Restore original main.tsx after debug testing

set -e

echo "🔄 Restoring original main.tsx..."

if [ -f "packages/frontend/src/main.tsx.backup" ]; then
    cp packages/frontend/src/main.tsx.backup packages/frontend/src/main.tsx
    rm packages/frontend/src/main.tsx.backup
    echo "✅ Original main.tsx restored"
else
    echo "❌ Backup file not found"
    exit 1
fi