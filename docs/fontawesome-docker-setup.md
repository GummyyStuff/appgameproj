# FontAwesome Pro Docker Setup

## Overview

This document explains how FontAwesome Pro is handled in our Docker builds to avoid committing licensed content to the repository while still making it available in production.

## Problem

FontAwesome Pro is a licensed product that should not be redistributed via git repositories. However, we need it available in our production Docker containers.

## Solution

We download FontAwesome Pro from a private bucket during the Docker build process.

### Docker Build Process

1. **Download**: FontAwesome Pro zip file is downloaded from our private Appwrite bucket
2. **Extract**: The zip is extracted to a temporary location
3. **Move**: The extracted folder is moved to `packages/frontend/public/fa-v5-pro/`
4. **Cleanup**: Temporary files and unnecessary packages are removed

### Files Configuration

#### Dockerfile (lines 20-33)

```dockerfile
# Download and extract FontAwesome Pro from bucket
USER root
RUN apt-get update && apt-get install -y curl unzip && \
    echo "📦 Downloading FontAwesome Pro from bucket..." && \
    curl -L -o /tmp/fontawesome.zip "https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas" && \
    echo "📂 Extracting FontAwesome Pro..." && \
    unzip -q /tmp/fontawesome.zip -d /tmp/ && \
    mv /tmp/fontawesome-pro-5.15.4-web ./public/fa-v5-pro && \
    echo "✅ FontAwesome Pro installed successfully" && \
    rm /tmp/fontawesome.zip && \
    apt-get remove -y unzip && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*
USER bun
```

#### .gitignore

```
packages/frontend/public/fa-v5-pro/
```

Ensures FontAwesome Pro files are never committed to git.

#### .dockerignore

```
packages/frontend/public/fa-v5-pro
```

Prevents local FontAwesome files from being copied during `COPY packages/frontend/` command, ensuring we always download fresh from bucket.

## Local Development

For local development, you need to have FontAwesome Pro files in `packages/frontend/public/fa-v5-pro/`. You can:

1. **Download manually** from the bucket:
   ```bash
   cd packages/frontend/public
   curl -L -o fontawesome.zip "https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas"
   unzip fontawesome.zip
   mv fontawesome-pro-5.15.4-web fa-v5-pro
   rm fontawesome.zip
   ```

2. **Or copy from an existing installation** if you have the licensed files

## Production Deployment

When deploying to Coolify or any Docker-based platform:

1. The Dockerfile automatically handles the download during build
2. No environment variables needed for FontAwesome download
3. The files are embedded in the Docker image
4. The bucket must remain accessible during build time

## Security Considerations

- The download URL is public but points to a private bucket endpoint
- Consider adding authentication if the bucket becomes publicly exposed
- The bucket is hosted on our Appwrite instance at `db.juanis.cool`
- Project ID: `tarkovcas`

## Troubleshooting

### Build fails at FontAwesome download

**Error**: `curl: (22) The requested URL returned error: 404`

**Solutions**:
- Verify the bucket is accessible
- Check if the file ID has changed in Appwrite
- Ensure the Appwrite instance is running

### FontAwesome icons not displaying

**Solutions**:
- Check browser console for 404 errors on `/fa-v5-pro/svgs/...`
- Verify the build completed the download step (check Docker build logs)
- Ensure the folder structure is correct: `public/fa-v5-pro/svgs/solid/*.svg`

## File Structure in Container

After successful build, the structure should be:

```
/app/packages/frontend/public/fa-v5-pro/
├── css/
├── js/
├── svgs/
│   ├── solid/
│   ├── regular/
│   ├── light/
│   ├── duotone/
│   └── brands/
├── webfonts/
└── LICENSE.txt
```

## Updating FontAwesome

To update to a newer version:

1. Upload the new FontAwesome Pro zip to the Appwrite bucket
2. Get the new file ID from Appwrite
3. Update the download URL in the Dockerfile
4. Update the folder name in the `mv` command if version changed
5. Rebuild the Docker image

## Related Files

- `Dockerfile` - Main Docker build configuration
- `.gitignore` - Git exclusions
- `.dockerignore` - Docker build exclusions
- `packages/frontend/src/components/ui/FontAwesomeSVG.tsx` - Component that uses the icons
- `trim-fontawesome.sh` - Script to reduce FontAwesome size for local development

