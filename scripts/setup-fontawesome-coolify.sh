#!/bin/bash

# Interactive setup script for Font Awesome in Coolify
# Helps you choose and set up the best solution for your deployment

set -e

echo "🎨 Font Awesome v5 Pro Self-Hosting Setup for Coolify"
echo "======================================================"
echo ""

# Check if Font Awesome exists
FA_DIR="packages/frontend/public/fa-v5-pro"
if [ ! -d "$FA_DIR" ]; then
  echo "❌ Error: Font Awesome directory not found at $FA_DIR"
  echo ""
  echo "Please ensure Font Awesome Pro v5 is available."
  echo "If you have a backup, restore it:"
  echo "  cp -r /tmp/fa-v5-pro-backup $FA_DIR"
  exit 1
fi

# Show current size
FA_SIZE=$(du -sh "$FA_DIR" | cut -f1)
echo "✅ Font Awesome found: $FA_SIZE"
echo ""

# Show solutions
echo "📋 Available Solutions:"
echo ""
echo "1. Download during Docker build (Recommended)"
echo "   - Fully automated"
echo "   - Requires: Private server or S3 bucket"
echo "   - Best for: Most deployments"
echo ""
echo "2. Coolify Persistent Volume"
echo "   - One-time upload"
echo "   - Requires: SSH access to Coolify server"
echo "   - Best for: Self-hosted Coolify"
echo ""
echo "3. CDN / Object Storage"
echo "   - Fast delivery"
echo "   - Requires: CDN or S3 setup"
echo "   - Best for: High-traffic sites"
echo ""

read -p "Choose solution (1-3): " choice

case $choice in
  1)
    echo ""
    echo "📦 Setting up: Download during Docker build"
    echo "==========================================="
    echo ""
    
    # Package Font Awesome
    echo "Step 1: Packaging Font Awesome..."
    ./scripts/package-fontawesome.sh
    
    echo ""
    echo "Step 2: Upload the package"
    echo "-------------------------"
    echo ""
    echo "Upload 'fontawesome-pro-v5-trimmed.tar.gz' to a private server or S3 bucket."
    echo ""
    echo "Options:"
    echo "  A. Your own server with HTTPS"
    echo "  B. DigitalOcean Spaces / AWS S3"
    echo "  C. Any web server with password protection"
    echo ""
    read -p "Enter the download URL (or press Enter to do this later): " fontawesome_url
    
    if [ -n "$fontawesome_url" ]; then
      echo ""
      echo "✅ URL saved: $fontawesome_url"
      echo ""
      echo "Step 3: Configure Coolify"
      echo "------------------------"
      echo ""
      echo "Add this environment variable in Coolify:"
      echo ""
      echo "  Name:  FONTAWESOME_URL"
      echo "  Value: $fontawesome_url"
      echo ""
      echo "Make sure it's available as a Build Argument!"
    else
      echo ""
      echo "⏭️  Skipping URL configuration"
      echo ""
      echo "Remember to:"
      echo "  1. Upload fontawesome-pro-v5-trimmed.tar.gz to your server"
      echo "  2. Add FONTAWESOME_URL to Coolify environment variables"
    fi
    
    echo ""
    echo "Step 4: Deploy"
    echo "-------------"
    echo ""
    echo "Run these commands to deploy:"
    echo ""
    echo "  git add ."
    echo "  git commit -m \"feat: add Font Awesome download during build\""
    echo "  git push origin main"
    echo ""
    echo "Coolify will automatically rebuild with Font Awesome!"
    ;;
    
  2)
    echo ""
    echo "📦 Setting up: Coolify Persistent Volume"
    echo "========================================"
    echo ""
    
    # Create tarball for upload
    VOLUME_PACKAGE="fontawesome-pro-volume-upload.tar.gz"
    echo "Creating package for volume upload..."
    tar -czf "$VOLUME_PACKAGE" -C packages/frontend/public fa-v5-pro
    
    SIZE=$(du -h "$VOLUME_PACKAGE" | cut -f1)
    echo "✅ Package created: $VOLUME_PACKAGE ($SIZE)"
    echo ""
    
    echo "Instructions:"
    echo ""
    echo "1. Create volume in Coolify:"
    echo "   - Go to your project in Coolify"
    echo "   - Navigate to Volumes section"
    echo "   - Create: 'fontawesome-pro-volume'"
    echo ""
    echo "2. Upload files to Coolify server:"
    echo ""
    read -p "   Enter your Coolify server address (e.g., user@server.com): " server_addr
    
    if [ -n "$server_addr" ]; then
      echo ""
      echo "   Run this on your LOCAL machine:"
      echo "   scp $VOLUME_PACKAGE $server_addr:/tmp/"
      echo ""
      echo "   Then SSH to server and extract:"
      echo "   ssh $server_addr"
      echo "   cd /var/lib/docker/volumes/fontawesome-pro-volume/_data"
      echo "   tar -xzf /tmp/$VOLUME_PACKAGE"
      echo "   rm /tmp/$VOLUME_PACKAGE"
      echo "   exit"
    fi
    echo ""
    echo "3. Mount volume in Coolify:"
    echo "   - Go to your project → Volumes"
    echo "   - Add volume mount:"
    echo "     Source: fontawesome-pro-volume"
    echo "     Target: /app/public/fa-v5-pro"
    echo "     Read-only: Yes"
    echo ""
    echo "4. Redeploy from Coolify dashboard"
    ;;
    
  3)
    echo ""
    echo "📦 Setting up: CDN / Object Storage"
    echo "===================================="
    echo ""
    
    echo "⚠️  Note: This requires changes to your frontend code."
    echo ""
    
    read -p "Enter your CDN base URL (e.g., https://cdn.yourdomain.com): " cdn_url
    
    if [ -n "$cdn_url" ]; then
      echo ""
      echo "1. Upload Font Awesome to your CDN:"
      echo "   Upload everything from: $FA_DIR"
      echo "   To: $cdn_url/fa-v5-pro/"
      echo ""
      echo "2. Update frontend files:"
      echo ""
      echo "   packages/frontend/index.html:"
      echo "   <link rel=\"stylesheet\" href=\"$cdn_url/fa-v5-pro/css/all.min.css\" />"
      echo ""
      echo "3. Update CSP headers in packages/backend/src/middleware/security.ts"
      echo "   to allow: $cdn_url"
      echo ""
      echo "4. Commit and push changes"
    else
      echo ""
      echo "See FONTAWESOME_SELFHOST_GUIDE.md for detailed CDN setup instructions."
    fi
    ;;
    
  *)
    echo ""
    echo "❌ Invalid choice. Please run again and choose 1-3."
    exit 1
    ;;
esac

echo ""
echo "======================================================"
echo "✅ Setup instructions complete!"
echo ""
echo "📚 For detailed documentation, see:"
echo "   FONTAWESOME_SELFHOST_GUIDE.md"
echo ""
echo "🆘 Need help? Check the troubleshooting section in the guide."
echo ""

