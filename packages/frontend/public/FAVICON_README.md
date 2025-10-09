# 🎨 Tarkov Casino Favicon

## Design
A tactical skull with military-style green accents, perfect for the Tarkov theme.

### Features:
- **Dark background** with gradient (#2D3748 → #1A202C)
- **Tactical skull** with green glowing eyes (#48BB78)
- **Military crosshair accents** for that tactical feel
- **Corner brackets** for HUD-style aesthetics

## Files Generated

| File | Size | Purpose |
|------|------|---------|
| `favicon.svg` | 2.3 KB | Vector source (best quality) |
| `favicon.ico` | 5.4 KB | Browser icon (16x16 + 32x32) |
| `favicon-16x16.png` | 561 B | Small icon |
| `favicon-32x32.png` | 1.3 KB | Standard icon |
| `apple-touch-icon.png` | 12 KB | iOS home screen (180x180) |
| `android-chrome-192x192.png` | 12 KB | Android icon |
| `android-chrome-512x512.png` | 39 KB | Android high-res icon |
| `site.webmanifest` | 789 B | PWA manifest |

## Colors Used
- **Background**: Dark slate (#1A202C, #2D3748)
- **Skull**: Medium gray (#4A5568)
- **Eyes/Accents**: Green (#48BB78) - Tarkov's signature color
- **Theme**: Dark military tactical

## Browser Support
✅ All modern browsers  
✅ iOS Safari (Apple touch icon)  
✅ Android Chrome (PWA icons)  
✅ Desktop browsers (ICO + SVG)  

## Customization
To change the design, edit `favicon.svg` and regenerate:

```bash
cd packages/frontend/public

# Regenerate PNGs from SVG
rsvg-convert -w 16 -h 16 favicon.svg -o favicon-16x16.png
rsvg-convert -w 32 -h 32 favicon.svg -o favicon-32x32.png
rsvg-convert -w 180 -h 180 favicon.svg -o apple-touch-icon.png
rsvg-convert -w 192 -h 192 favicon.svg -o android-chrome-192x192.png
rsvg-convert -w 512 -h 512 favicon.svg -o android-chrome-512x512.png

# Regenerate ICO from PNGs
convert favicon-32x32.png favicon-16x16.png favicon.ico
```

## Already Referenced in HTML
All these favicons are already referenced in `packages/frontend/index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">
```

✅ Ready to use - just commit and deploy!

