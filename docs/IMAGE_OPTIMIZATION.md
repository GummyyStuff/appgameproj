# Image Optimization Guide

## Overview

The case opening game uses WebP images with optimized loading for best performance.

## Image Format: WebP

All item images are stored as **WebP format** with the following benefits:

### Advantages of WebP:
- ✅ **Transparent backgrounds** - Seamless UI integration
- ✅ **Better compression** - 30% smaller file sizes than PNG
- ✅ **Modern browser support** - All modern browsers support WebP natively
- ✅ **High quality** - 8x resolution (HD quality) from tarkov.dev API

### Image Sizes

**Average image sizes:**
- Small: 62KB - 100KB (LEDX, Bandage, etc.)
- Medium: 100KB - 200KB (Most items)
- Large: 200KB - 400KB (GPU, Medical kits)
- Extra Large: 800KB+ (Grizzly Med Kit - special case)

**Most images: 62KB - 289KB** - Excellent for web performance

## Image Loading Strategy

### Lazy Loading

Images in the carousel use **lazy loading** to improve initial page load:

```tsx
<img
  src={item.image_url}
  alt={itemName}
  className="w-full h-full object-cover"
  loading="lazy"      // ← Lazy load images not immediately visible
  decoding="async"    // ← Asynchronous decoding for performance
/>
```

### Eager Loading

The winning item image uses **eager loading** since it's immediately visible:

```tsx
<img
  src={result.item_won.image_url}
  alt={result.item_won.name}
  className="w-full h-full object-cover"
  loading="eager"      // ← Load immediately (in viewport)
  decoding="async"    // ← Still async decode
/>
```

## Image Locations

Images are organized by category:

```
packages/frontend/public/assets/items/
├── consumables/ (4 items) - 99KB - 235KB each
├── electronics/ (4 items) - 141KB - 289KB each
├── keycards/ (4 items) - 71KB - 107KB each
├── medical/ (5 items) - 62KB - 861KB each
└── valuables/ (3 items) - 101KB - 200KB each
```

## Fetching Images

### Automated Script

Run the image fetching script to update all item images:

```bash
bun run packages/backend/src/scripts/fetch-item-images.ts
```

**What it does:**
1. ✅ Fetches HD images from tarkov.dev API
2. ✅ Downloads -8x.webp format (highest quality)
3. ✅ Saves to appropriate category folder
4. ✅ Updates database with local image URLs
5. ✅ Overwrites existing files (no stale cache)

### Manual Updates

To update images after adding new items:

1. Add item to database in Appwrite
2. Run the fetch script
3. Images are automatically downloaded and URLs updated

## Browser Compatibility

### WebP Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 23+ | ✅ Yes |
| Firefox | 65+ | ✅ Yes |
| Safari | 14+ | ✅ Yes |
| Edge | 18+ | ✅ Yes |
| Opera | 12.1+ | ✅ Yes |

**No fallback needed** - All modern browsers support WebP natively.

## Performance Considerations

### Network Optimization

For slow connections, consider:

1. **Preloading critical images**:
   ```tsx
   <link rel="preload" as="image" href="/assets/items/common/bandage.webp" />
   ```

2. **Lazy loading carousel images** (Already implemented):
   ```tsx
   <img loading="lazy" ... />
   ```

3. **Caching**: WebP images are cached by browser automatically

### Image Optimization

If you need to optimize specific images:

```bash
# Use imagemin-webp (if needed)
npm install -g imagemin-cli imagemin-webp
imagemin images/*.png --out-dir=optimized --plugin=webp --quality=85
```

## Current Image Status

**Total Images**: 20 items
**Format**: All WebP with transparent backgrounds
**Total Size**: ~4.5MB (avg 225KB per image)
**Database URLs**: All updated and pointing to WebP files

## Responsive Image Sizes

Currently, all images use a single WebP file. For future optimization:

### Option 1: Use srcset (Recommended for different display sizes)
```tsx
<img
  srcSet="image-400.webp 400w, image-800.webp 800w, image-1600.webp 1600w"
  src="image-800.webp"
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
/>
```

### Option 2: Use <picture> element (For different formats)
```tsx
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.png" alt="fallback" />
</picture>
```

**Note**: Not necessary currently - WebP is universal and file sizes are optimal.

## Troubleshooting

### Images not loading?

1. Check database URL field is set correctly
2. Verify file exists in `/public/assets/items/`
3. Check browser console for 404 errors
4. Clear browser cache

### Large file sizes?

The Grizzly Med Kit (861KB) is the largest. To reduce:
1. Re-fetch from tarkov.dev API (may get updated version)
2. Use image compression tool
3. Consider if file is too large for your use case

### Want PNG instead of WebP?

All PNG files were removed (as requested). To add them back:
1. Download from tarkov.dev as PNG
2. Update script to save as .png
3. Update database URLs

**Recommendation**: Stick with WebP - it's better in every way.

## Summary

✅ **WebP support**: Native in all modern browsers
✅ **Lazy loading**: Implemented in carousel components  
✅ **File sizes**: Optimal (62KB - 289KB for most items)
✅ **Transparency**: All images have transparent backgrounds
✅ **Database**: All URLs updated automatically
✅ **Performance**: Optimized for fast page loads

**No further optimization needed** - Current setup is production-ready!
