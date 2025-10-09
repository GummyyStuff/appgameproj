# 🎨 Font Awesome v5 Pro Self-Hosting Guide for Coolify

## Overview

This guide explains how to self-host Font Awesome v5 Pro files in Coolify **without committing them to GitHub** (respecting Font Awesome Pro licensing).

---

## 🎯 Solutions Available

### Solution 1: Download During Docker Build ⭐ (Recommended)

**How it works:**
- Font Awesome is packaged as a `.tar.gz` file
- Uploaded to a private server or storage bucket
- Downloaded automatically during Docker build in Coolify
- No files committed to Git

**Pros:**
- ✅ Fully automated - works with every deployment
- ✅ No manual intervention needed
- ✅ Works with Coolify's auto-deploy
- ✅ Easy to update (just upload new archive)

**Cons:**
- ⚠️ Requires a private file server or S3 bucket

---

### Solution 2: Coolify Persistent Storage Volume

**How it works:**
- Upload Font Awesome files once to a Coolify persistent volume
- Mount the volume in your container
- Files persist across deployments

**Pros:**
- ✅ One-time upload
- ✅ No external dependencies
- ✅ Fast builds (no download needed)

**Cons:**
- ⚠️ Requires manual upload to Coolify server
- ⚠️ Volume must be configured in Coolify

---

### Solution 3: CDN / Object Storage

**How it works:**
- Upload Font Awesome to a CDN or S3
- Update `index.html` to reference CDN URL
- Serve directly from CDN

**Pros:**
- ✅ Fast delivery via CDN
- ✅ Offloads bandwidth from your server
- ✅ Easy to update

**Cons:**
- ⚠️ Requires CDN or S3 setup
- ⚠️ Changes needed in frontend code

---

## 📋 Solution 1: Download During Docker Build (Step-by-Step)

### Step 1: Package Font Awesome

Run the packaging script:

```bash
cd /home/juan/appgameproj
./scripts/package-fontawesome.sh
```

This creates `fontawesome-pro-v5-trimmed.tar.gz` (approximately 18MB).

### Step 2: Upload to Private Server

Choose one of these options:

#### Option A: Your Own Server

Upload to your server (e.g., via SCP):

```bash
# Upload to your server
scp fontawesome-pro-v5-trimmed.tar.gz user@yourserver.com:/var/www/private/

# Make it accessible via HTTPS (with password protection recommended)
# URL example: https://yourserver.com/private/fontawesome-pro-v5-trimmed.tar.gz
```

#### Option B: DigitalOcean Spaces (or S3)

1. Create a private Space/bucket
2. Upload the file
3. Generate a signed URL or make it accessible with authentication

```bash
# Example with DigitalOcean Spaces CLI
s3cmd put fontawesome-pro-v5-trimmed.tar.gz s3://your-space/fontawesome-pro-v5-trimmed.tar.gz

# Get URL (can be private with auth)
# Example: https://your-space.nyc3.digitaloceanspaces.com/fontawesome-pro-v5-trimmed.tar.gz
```

#### Option C: Password-Protected URL

If your server supports it, add HTTP basic auth:

```nginx
# nginx configuration example
location /private/ {
    auth_basic "Private Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    alias /var/www/private/;
}
```

Then use URL with credentials:
```
https://username:password@yourserver.com/private/fontawesome-pro-v5-trimmed.tar.gz
```

### Step 3: Configure Coolify

1. **Go to your Coolify dashboard**
2. **Navigate to your project** (tarkov-casino)
3. **Go to Environment Variables**
4. **Add new variable:**

   ```
   Name: FONTAWESOME_URL
   Value: https://yourserver.com/path/to/fontawesome-pro-v5-trimmed.tar.gz
   ```

   If using password-protected URL:
   ```
   Value: https://username:password@yourserver.com/private/fontawesome-pro-v5-trimmed.tar.gz
   ```

5. **Important:** Make sure this variable is available as a **Build Argument**

### Step 4: Deploy

1. Commit the changes (Dockerfile, coolify.json, .gitignore):

   ```bash
   git add Dockerfile coolify.json .gitignore scripts/package-fontawesome.sh
   git commit -m "feat: add Font Awesome download during Docker build"
   git push origin main
   ```

2. Coolify will automatically detect the push and rebuild
3. During build, Font Awesome will be downloaded from your URL
4. The build logs should show: "Downloading Font Awesome Pro..."

### Step 5: Verify

1. After deployment completes, visit: https://tarkov.juanis.cool
2. Open DevTools (F12) → Console
3. Check for Font Awesome errors (there should be none)
4. Icons should display correctly

---

## 📋 Solution 2: Coolify Persistent Storage Volume

### Step 1: Create Volume in Coolify

1. Go to Coolify dashboard
2. Navigate to your project
3. Go to **Volumes** or **Storage** section
4. Create a new volume: `fontawesome-pro-volume`

### Step 2: Upload Font Awesome to Volume

SSH into your Coolify server and upload files:

```bash
# SSH to Coolify server
ssh user@your-coolify-server.com

# Navigate to volumes directory (location varies by setup)
cd /var/lib/docker/volumes/fontawesome-pro-volume/_data

# Upload Font Awesome from your local machine
# On your local machine:
cd /home/juan/appgameproj
tar -czf /tmp/fa-v5-pro.tar.gz -C packages/frontend/public fa-v5-pro
scp /tmp/fa-v5-pro.tar.gz user@your-coolify-server.com:/tmp/

# Back on Coolify server, extract:
cd /var/lib/docker/volumes/fontawesome-pro-volume/_data
tar -xzf /tmp/fa-v5-pro.tar.gz
rm /tmp/fa-v5-pro.tar.gz
```

### Step 3: Update Dockerfile to Mount Volume

Add volume mount configuration in `coolify.json`:

```json
{
  "volumes": [
    {
      "source": "fontawesome-pro-volume",
      "target": "/app/public/fa-v5-pro",
      "read_only": true
    }
  ]
}
```

Or in Coolify UI:
- **Volume**: `fontawesome-pro-volume`
- **Mount Path**: `/app/public/fa-v5-pro`
- **Read-only**: Yes

### Step 4: Update Dockerfile (Remove Download Step)

If using volumes, you can remove the download step from Dockerfile since files will be mounted at runtime.

### Step 5: Deploy

Redeploy from Coolify dashboard. Font Awesome files will be available from the mounted volume.

---

## 📋 Solution 3: CDN / Object Storage

### Step 1: Upload to CDN

1. Create a DigitalOcean Space, AWS S3 bucket, or use another CDN
2. Upload Font Awesome files:

   ```bash
   cd /home/juan/appgameproj/packages/frontend/public
   
   # Upload to S3/Spaces (example with s3cmd)
   s3cmd sync fa-v5-pro/ s3://your-bucket/fa-v5-pro/ --acl-public
   ```

3. Get the public URL:
   - Example: `https://cdn.yourdomain.com/fa-v5-pro/`

### Step 2: Update Frontend to Use CDN

Update `packages/frontend/index.html`:

```html
<!-- Change this -->
<link rel="stylesheet" href="/fa-v5-pro/css/all.min.css" />

<!-- To this -->
<link rel="stylesheet" href="https://cdn.yourdomain.com/fa-v5-pro/css/all.min.css" />
```

Update `packages/frontend/src/components/FontAwesomeSVG.tsx`:

```typescript
// Change the base path for SVG loading
const SVG_BASE_URL = 'https://cdn.yourdomain.com/fa-v5-pro/svgs';
```

### Step 3: Update CSP Headers

Update `packages/backend/src/middleware/security.ts` to allow CDN:

```typescript
const cspDirectives = {
  // ... existing directives
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    "https://cdn.yourdomain.com"
  ],
  fontSrc: [
    "'self'",
    "https://cdn.yourdomain.com"
  ],
  imgSrc: [
    "'self'",
    "data:",
    "https://cdn.yourdomain.com"
  ],
};
```

### Step 4: Deploy

Commit and push changes. Coolify will rebuild and serve Font Awesome from CDN.

---

## 🔒 Security Considerations

### Option 1: Private URL with Authentication
- Use HTTP Basic Auth for the download URL
- Credentials are embedded in build args (not exposed in final image)
- Only accessible during build time

### Option 2: Persistent Volume
- Files stored on Coolify server (not public)
- Only accessible to your container

### Option 3: CDN
- If using CDN, consider:
  - Private bucket with signed URLs
  - IP whitelisting
  - Hotlink protection

---

## 📊 Comparison

| Solution | Setup Complexity | Automation | External Dependencies | Best For |
|----------|-----------------|------------|----------------------|----------|
| **Download during build** | Medium | ⭐⭐⭐⭐⭐ Full | File server/S3 | **Most projects** |
| **Persistent volume** | Medium | ⭐⭐⭐ Manual upload | None | Local/on-prem Coolify |
| **CDN** | Low | ⭐⭐⭐⭐ Full | CDN/S3 | High-traffic sites |

---

## ✅ Recommended Setup

For your use case, **Solution 1 (Download during build)** is recommended because:

1. ✅ Fully automated - works with Coolify auto-deploy
2. ✅ No manual intervention after initial setup
3. ✅ Easy to update (just upload new archive)
4. ✅ Works with your existing Dockerfile
5. ✅ No code changes needed

---

## 🐛 Troubleshooting

### Build fails with "Font Awesome download failed"

**Check:**
- Is `FONTAWESOME_URL` set in Coolify?
- Is the URL accessible from Coolify server?
- If using auth, are credentials correct in URL?

**Test URL manually:**
```bash
curl -fsSL "$FONTAWESOME_URL" -o /tmp/test.tar.gz
```

### Icons not displaying after deployment

**Check:**
1. Build logs show "Font Awesome downloaded successfully"
2. Files exist in container: `docker exec <container> ls /app/public/fa-v5-pro`
3. Browser console for 404 errors
4. CSP headers allow local file serving

### Permission denied errors

**Fix:**
Ensure files have correct ownership in Dockerfile:

```dockerfile
RUN chown -R bunjs:nodejs /app/public/fa-v5-pro
```

---

## 📝 Next Steps

1. Choose your preferred solution (recommended: Solution 1)
2. Follow the step-by-step guide
3. Test deployment
4. Update this file with your specific setup notes

---

## 📚 Files Modified

- `Dockerfile` - Added Font Awesome download step
- `coolify.json` - Added `FONTAWESOME_URL` build arg
- `.gitignore` - Added Font Awesome exclusion
- `scripts/package-fontawesome.sh` - Script to package Font Awesome

---

## 🆘 Need Help?

If issues persist:
1. Check Coolify build logs for Font Awesome download
2. Verify URL is accessible: `curl -I $FONTAWESOME_URL`
3. Check Docker container: `docker exec <container> ls -lah /app/public/fa-v5-pro`
4. Review CSP headers in browser DevTools → Network tab

---

**Last Updated:** 2025-10-09  
**Status:** Solution 1 implemented and ready for deployment  

