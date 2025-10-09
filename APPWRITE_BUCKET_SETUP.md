# 🔧 Fix Appwrite Bucket Permissions for Font Awesome

## ⚠️ Current Issue

The download URL returns **401 Unauthorized**:
```
https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas&mode=admin
```

This happens because the bucket requires authentication for downloads.

---

## ✅ Solution 1: Make Bucket Public for Downloads (Recommended)

This is the easiest solution for build-time downloads.

### Steps:

1. **Go to Appwrite Console:** https://db.juanis.cool

2. **Navigate to Storage:**
   - Click **Storage** in left sidebar
   - Click on bucket **`fa5`**

3. **Update Permissions:**
   - Click **Settings** tab
   - Scroll to **Permissions** section
   - Click **Add Permission** or **Update**

4. **Add Read Permission for Any:**
   - **Role:** Select "Any" or "Guests"
   - **Permission:** Check ✅ **Read**
   - **Save**

5. **Test the URL:**
   ```bash
   curl -I "https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas"
   ```
   
   Should now return: `HTTP/2 200`

6. **Update Coolify URL** (remove `&mode=admin`):
   ```
   FONTAWESOME_URL=https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas
   ```

### Why This Works:
- ✅ Bucket is public for downloads (read-only)
- ✅ No API key needed
- ✅ Works during Docker build
- ✅ File is still only accessible if you know the URL
- ✅ Cannot upload/delete without auth (safe)

---

## ✅ Solution 2: Use Appwrite API Key (If bucket must stay private)

If you need the bucket to remain private, use an API key.

### Steps:

1. **Create API Key in Appwrite:**
   - Go to Appwrite Console → Settings → **API Keys**
   - Click **Create API Key**
   - **Name:** "Coolify Font Awesome Download"
   - **Scopes:** Select only `files.read`
   - **Expiration:** Never (or set long expiration)
   - **Create**
   - **Copy the API key** (you won't see it again!)

2. **Use API Key in URL:**
   
   Update the URL to use the API key in the header. Since Docker build can't easily set headers, we need to modify the Dockerfile.

3. **Update Dockerfile to use API Key:**
   
   I'll provide an updated version below that uses API key authentication.

4. **Add to Coolify:**
   ```
   FONTAWESOME_URL=https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas
   APPWRITE_API_KEY=your-api-key-here
   ```

### Updated Dockerfile for API Key Auth:

```dockerfile
# Download Font Awesome Pro during build (not committed to repo)
ARG FONTAWESOME_URL
ARG APPWRITE_API_KEY
RUN if [ -n "$FONTAWESOME_URL" ]; then \
      echo "Downloading Font Awesome Pro from Appwrite..." && \
      apt-get update && apt-get install -y unzip && \
      if [ -n "$APPWRITE_API_KEY" ]; then \
        curl -fsSL -H "X-Appwrite-Project: tarkovcas" -H "X-Appwrite-Key: $APPWRITE_API_KEY" "$FONTAWESOME_URL" -o /tmp/fontawesome.zip; \
      else \
        curl -fsSL "$FONTAWESOME_URL" -o /tmp/fontawesome.zip; \
      fi && \
      mkdir -p public/fa-v5-pro && \
      unzip -q /tmp/fontawesome.zip -d /tmp/fa-extract && \
      mv /tmp/fa-extract/fontawesome-pro-*-web/* public/fa-v5-pro/ && \
      rm -rf /tmp/fontawesome.zip /tmp/fa-extract && \
      apt-get remove -y unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* && \
      echo "Font Awesome downloaded and extracted successfully"; \
    else \
      echo "Warning: FONTAWESOME_URL not set, Font Awesome will not be available"; \
    fi
```

---

## ✅ Solution 3: Generate Public File URL (Alternative)

Some Appwrite versions support public file URLs.

### Check if available:

In Appwrite Console → Storage → Bucket `fa5` → File:
- Look for **"Get Public URL"** or similar option
- If available, use that URL instead

---

## 📋 Recommended Solution Comparison

| Solution | Security | Complexity | Best For |
|----------|----------|------------|----------|
| **Public Bucket** ✅ | Medium (read-only public) | Low | Most use cases |
| **API Key** | High (private bucket) | Medium | Sensitive files |
| **Public URL** | Low (fully public) | Low | Public assets |

**Recommendation:** Use **Solution 1 (Public Bucket)** for Font Awesome.

Why?
- ✅ Font Awesome files are not sensitive
- ✅ Simplest to set up and maintain
- ✅ No API key management needed
- ✅ Works perfectly for build-time downloads

---

## 🚀 Quick Fix (Recommended)

**TL;DR - Do this:**

1. Open Appwrite Console: https://db.juanis.cool
2. Go to: Storage → Bucket `fa5` → Settings → Permissions
3. Add: Role "Any" → Permission "Read" ✅
4. Save
5. Test:
   ```bash
   curl -I "https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas"
   ```
   Should return: `HTTP/2 200` ✅

6. Use this URL in Coolify:
   ```
   FONTAWESOME_URL=https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas
   ```

7. Deploy! 🚀

---

## ✅ After Fixing Permissions

Once permissions are fixed, follow: **`DEPLOY_NOW.md`**

---

## 🐛 Troubleshooting

### Still getting 401 after making public

**Check:**
1. Permissions saved correctly
2. Using URL without `&mode=admin`
3. Bucket ID and File ID are correct
4. Appwrite project ID is `tarkovcas`

**Test with curl:**
```bash
curl -v "https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas" -o /tmp/test.zip

# Should download the file
ls -lh /tmp/test.zip
```

### Can't change bucket permissions

**Solution:** Use Solution 2 (API Key) instead

---

## 📝 Summary

**Problem:** Bucket requires authentication  
**Solution:** Make bucket public for reads (safe for Font Awesome)  
**Time:** 2 minutes  
**Next Step:** Follow `DEPLOY_NOW.md` to deploy

---

**Need help?** Check Appwrite docs: https://appwrite.io/docs/products/storage/buckets

