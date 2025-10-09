#!/bin/bash

# Package Font Awesome Pro for upload to private server
# This script creates a compressed archive that can be uploaded to your server
# and downloaded during Docker builds

set -e

FA_DIR="packages/frontend/public/fa-v5-pro"
OUTPUT_FILE="fontawesome-pro-v5-trimmed.tar.gz"

echo "📦 Packaging Font Awesome Pro..."

# Check if Font Awesome directory exists
if [ ! -d "$FA_DIR" ]; then
  echo "❌ Error: Font Awesome directory not found at $FA_DIR"
  echo "   Please run ./trim-fontawesome.sh first"
  exit 1
fi

# Create tarball
echo "🗜️  Creating compressed archive..."
tar -czf "$OUTPUT_FILE" -C "packages/frontend/public" fa-v5-pro

# Get file size
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo "📁 File: $OUTPUT_FILE"
echo "📊 Size: $SIZE"
echo ""
echo "📤 Next steps:"
echo "   1. Upload this file to a private server or S3 bucket"
echo "   2. Get a direct download URL (can be password-protected)"
echo "   3. Add FONTAWESOME_URL to Coolify environment variables"
echo ""
echo "Example URLs:"
echo "   - Private server: https://yourdomain.com/private/fontawesome-pro-v5-trimmed.tar.gz"
echo "   - S3 bucket: https://s3.amazonaws.com/your-bucket/fontawesome-pro-v5-trimmed.tar.gz"
echo "   - DigitalOcean Spaces: https://your-space.nyc3.digitaloceanspaces.com/fontawesome-pro-v5-trimmed.tar.gz"
echo ""

