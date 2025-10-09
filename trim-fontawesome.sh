#!/bin/bash

# Script to trim Font Awesome Pro to only used icons
# This reduces the size from 92MB to just what's needed

echo "🔍 Trimming Font Awesome Pro to only used icons..."

FA_DIR="packages/frontend/public/fa-v5-pro"
BACKUP_DIR="/tmp/fa-v5-pro-backup"

# Create backup
if [ ! -d "$BACKUP_DIR" ]; then
  echo "📦 Creating backup at $BACKUP_DIR..."
  cp -r "$FA_DIR" "$BACKUP_DIR"
  echo "✅ Backup created"
fi

# List of icons to keep (from codebase analysis)
KEEP_ICONS=(
  "alarm-clock"
  "arrow-down"
  "arrow-left"
  "arrow-right"
  "arrow-up"
  "axe"
  "bars"
  "bell"
  "bolt"
  "bullseye"
  "calendar"
  "calendar-alt"
  "caret-down"
  "caret-left"
  "caret-right"
  "caret-up"
  "chart-bar"
  "chart-line"
  "check"
  "chevron-down"
  "chevron-left"
  "chevron-right"
  "chevron-up"
  "circle"
  "clock"
  "club"
  "cog"
  "cogs"
  "coin"
  "coins"
  "comment"
  "comments"
  "copy"
  "crown"
  "desktop"
  "diamond"
  "dice"
  "dice-d20"
  "dice-d6"
  "discord"
  "dollar-sign"
  "download"
  "edit"
  "envelope"
  "euro-sign"
  "exclamation"
  "eye"
  "eye-slash"
  "facebook"
  "file"
  "file-alt"
  "filter"
  "folder"
  "folder-open"
  "gamepad"
  "gem"
  "gift"
  "github"
  "heart"
  "heart-o"
  "history"
  "home"
  "info"
  "instagram"
  "key"
  "link"
  "lock"
  "medal"
  "minus"
  "mobile"
  "mobile-alt"
  "money-bill"
  "pause"
  "play"
  "plus"
  "question"
  "reddit"
  "ruble-sign"
  "save"
  "search"
  "share"
  "share-alt"
  "shield"
  "shield-alt"
  "signal"
  "skull"
  "sort"
  "sort-down"
  "sort-up"
  "spade"
  "square"
  "star"
  "star-half"
  "star-o"
  "steam"
  "stop"
  "sword"
  "sync"
  "tablet"
  "thumbs-down"
  "thumbs-up"
  "times"
  "trash"
  "trophy"
  "twitch"
  "twitter"
  "unlock"
  "upload"
  "user"
  "users"
  "volume-mute"
  "volume-up"
  "wallet"
  "wifi"
  "youtube"
)

# Create temp directory for kept files
TEMP_DIR="/tmp/fa-v5-pro-trimmed"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR/svgs"

# Copy only needed SVG files for each variant
for variant in solid regular light duotone brands; do
  VARIANT_DIR="$FA_DIR/svgs/$variant"
  if [ -d "$VARIANT_DIR" ]; then
    echo "📁 Processing $variant icons..."
    mkdir -p "$TEMP_DIR/svgs/$variant"
    
    count=0
    for icon in "${KEEP_ICONS[@]}"; do
      if [ -f "$VARIANT_DIR/${icon}.svg" ]; then
        cp "$VARIANT_DIR/${icon}.svg" "$TEMP_DIR/svgs/$variant/"
        ((count++))
      fi
    done
    
    echo "   ✓ Kept $count/$((${#KEEP_ICONS[@]})) icons"
  fi
done

# Replace the svgs directory with trimmed version
echo "🔄 Replacing SVG directory..."
rm -rf "$FA_DIR/svgs"
cp -r "$TEMP_DIR/svgs" "$FA_DIR/"

# Keep these directories (needed for CSS/webfonts):
# - css (all files)
# - webfonts (all files)
# - less, scss (for customization if needed)
# - metadata, sprites (small, keep for completeness)
# - attribution.js, LICENSE.txt (legal)

echo ""
echo "📊 Size comparison:"
du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print "   Before: " $1}'
du -sh "$FA_DIR" | awk '{print "   After:  " $1}'

echo ""
echo "✅ Font Awesome trimmed successfully!"
echo "💾 Backup saved at: $BACKUP_DIR"
echo "🔧 To restore: cp -r $BACKUP_DIR $FA_DIR"

