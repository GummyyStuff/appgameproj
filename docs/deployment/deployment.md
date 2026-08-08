---
title: "Deployment Guide"
audience: developer | devops
type: deployment
status: stable
tags: [deployment, docker, coolify, production, setup]
last_updated: 08/07/2026
---

# Deployment Guide

## Purpose and Scope
This document provides detailed instructions for deploying the Tarkov Casino application in production environments using Docker and Coolify.

## Prerequisites
- Docker installed and running
- Coolify instance configured
- Appwrite project with proper credentials
- Dragonfly (Redis) service available
- Domain name configured for SSL

## Step-by-Step Instructions
1. Build the Docker image:
   ```bash
   docker build -t tarkov-casino .
   ```

2. Configure environment variables in Coolify:
   ```
   NODE_ENV=production
   APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   REDIS_ENABLED=true
   REDIS_URL=redis://default:PASSWORD@dragonfly-service:6379/0
   ```

3. Deploy to Coolify service:
   - Set repository URL to your Git repository
   - Build pack: Docker
   - Dockerfile: `Dockerfile`
   - Port: `3000`

4. Link Dragonfly service in Coolify:
   - Add new service: Dragonfly
   - Link it to your application
   - Note the connection URL provided by Coolify

## Configuration Requirements
Environment variables required for deployment:
- `NODE_ENV=production`
- `APPWRITE_ENDPOINT` - Appwrite API endpoint
- `APPWRITE_PROJECT_ID` - Your project ID
- `APPWRITE_API_KEY` - Your API key
- `REDIS_ENABLED` - Enable caching (true/false)
- `REDIS_URL` - Dragonfly connection URL

## Usage Examples
```bash
# Deploy with Coolify
bun run deploy:prepare
bun run deploy:validate
```

## Best Practices
- Always use production environment variables
- Test deployment in staging before production
- Monitor application health after deployment
- Configure proper logging and error tracking
- Set up automated backups for Appwrite

## Troubleshooting
Common issues:
- Connection errors to Appwrite: Verify credentials and endpoint
- Cache connection failures: Check Dragonfly service status
- Port binding issues: Ensure port 3000 is available

## Verification Steps
After deployment, verify:
- Application responds on port 3000
- Health endpoints return success (GET `/api/health`)
- Real-time features work correctly
- Database connections are established
- Cache is functioning properly

## Related Processes
- [Appwrite Integration Guide](./backend/appwrite-README.md)
- [Dragonfly Setup](./backend/redis-README.md)
- [Health Check Documentation](../frontend/README.md#health-checks)