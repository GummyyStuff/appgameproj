# Deployment Guide

This document provides comprehensive instructions for deploying the Tarkov Casino Website to production using Coolify.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Coolify Deployment](#coolify-deployment)
4. [Monitoring and Health Checks](#monitoring-and-health-checks)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

## Prerequisites

### Required Services

1. **Coolify Instance**: A running Coolify instance with Docker support
2. **Supabase Project**: A production Supabase project with:
   - Database configured
   - Authentication enabled
   - Row Level Security (RLS) policies applied
   - API keys generated
3. **Domain**: A domain name pointing to your Coolify instance
4. **SSL Certificate**: Automatic via Coolify/Let's Encrypt

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 2GB+ recommended
- **Storage**: 10GB+ available space
- **Network**: Stable internet connection

## Environment Configuration

### 1. Supabase Setup

First, set up your production Supabase project:

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database migrations from `packages/backend/src/database/migrations/`
3. Configure authentication settings
4. Set up Row Level Security policies
5. Note down your project URL and API keys

### 2. Environment Variables

Create a `.env.production` file or configure the following environment variables in Coolify:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000

# Supabase Configuration (Production)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key_here

# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_characters_long

# Game Configuration
STARTING_BALANCE=10000
DAILY_BONUS=1000

# Logging Configuration
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_GAME_LOGGING=true
ENABLE_SECURITY_LOGGING=true

# Performance Configuration
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Monitoring Configuration
HEALTH_CHECK_TIMEOUT=5000
METRICS_ENABLED=true

# Frontend Environment Variables (for build time)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key_here
VITE_API_URL=https://your-domain.com/api
```

### 3. Security Considerations

- **JWT_SECRET**: Generate a strong, random secret (32+ characters)
- **API Keys**: Use production Supabase keys, not development keys
- **CORS**: Update CORS origins in `packages/backend/src/index.ts` to match your domain
- **Rate Limiting**: Adjust rate limits based on expected traffic

## Coolify Deployment

### 1. Create New Service

1. Log into your Coolify dashboard
2. Click "New Service" → "Docker"
3. Configure the service:
   - **Name**: `tarkov-casino`
   - **Description**: `Tarkov-themed casino gaming website`
   - **Repository**: Your Git repository URL
   - **Branch**: `main` (or your production branch)

### 2. Configure Build Settings

In the Coolify service configuration:

- **Build Pack**: Docker
- **Dockerfile**: `Dockerfile` (in root directory)
- **Build Context**: `.` (root directory)
- **Port**: `3000`

### 3. Environment Variables

Add all the environment variables from the `.env.production` template above.

### 4. Health Check Configuration

Coolify will automatically use the health check defined in the Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### 5. Domain Configuration

1. Add your domain in Coolify
2. Enable SSL (Let's Encrypt)
3. Configure DNS to point to your Coolify instance

### 6. Deploy

1. Click "Deploy" in Coolify
2. Monitor the build logs
3. Verify deployment success via health checks

## Monitoring and Health Checks

### Available Endpoints

The application provides several monitoring endpoints:

#### Basic Health Check
```
GET /api/health
```
Returns basic health status and dependency checks.

#### Detailed Health Check
```
GET /api/health/detailed
```
Returns comprehensive system information including memory usage and performance metrics.

#### Readiness Check
```
GET /api/ready
```
Kubernetes-style readiness probe for deployment orchestration.

#### Liveness Check
```
GET /api/live
```
Simple liveness probe to verify the application is responsive.

#### Metrics Endpoint
```
GET /api/metrics
```
Prometheus-compatible metrics for monitoring systems.

### Monitoring Setup

1. **Coolify Monitoring**: Automatic via health checks
2. **External Monitoring**: Use tools like:
   - Uptime Robot
   - Pingdom
   - New Relic
   - DataDog

### Log Monitoring

Logs are structured in production and include:

- Request logs with performance metrics
- Game action logs for analytics
- Security event logs for audit trails
- System event logs for debugging

Access logs via:
```bash
# Coolify logs
coolify logs tarkov-casino

# Docker logs
docker logs <container-id>
```

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Symptoms**: Build fails during Docker build process

**Solutions**:
- Check Dockerfile syntax
- Verify all dependencies are available
- Ensure sufficient disk space
- Check build logs for specific errors

#### 2. Health Check Failures

**Symptoms**: Container starts but health checks fail

**Solutions**:
- Verify Supabase connection
- Check environment variables
- Ensure port 3000 is accessible
- Review application logs

#### 3. Database Connection Issues

**Symptoms**: 503 errors, database-related error messages

**Solutions**:
- Verify Supabase URL and keys
- Check Supabase project status
- Ensure database migrations are applied
- Verify network connectivity

#### 4. Performance Issues

**Symptoms**: Slow response times, timeouts

**Solutions**:
- Check system resources (CPU, RAM)
- Review slow query logs
- Optimize database queries
- Increase timeout values if needed

### Debug Commands

```bash
# Check container status
docker ps

# View container logs
docker logs <container-id>

# Execute commands in container
docker exec -it <container-id> /bin/bash

# Test health endpoint
curl -f http://localhost:3000/api/health

# Check detailed health
curl http://localhost:3000/api/health/detailed
```

## Maintenance

### Regular Tasks

#### 1. Database Maintenance

- Monitor database performance
- Review and optimize slow queries
- Clean up old game history records if needed
- Update statistics and analytics

#### 2. Security Updates

- Keep dependencies updated
- Monitor security advisories
- Review access logs for suspicious activity
- Rotate JWT secrets periodically

#### 3. Performance Monitoring

- Monitor response times
- Check memory usage trends
- Review error rates
- Optimize based on usage patterns

### Backup Strategy

#### 1. Database Backups

Supabase provides automatic backups, but consider:
- Regular manual backups for critical data
- Export user profiles and game history
- Test backup restoration procedures

#### 2. Configuration Backups

- Backup environment variables
- Document configuration changes
- Version control deployment scripts

### Scaling Considerations

#### Horizontal Scaling

- Use load balancers for multiple instances
- Implement session affinity if needed
- Consider database connection pooling

#### Vertical Scaling

- Monitor resource usage
- Upgrade server specifications as needed
- Optimize application performance

### Update Procedures

1. **Staging Deployment**:
   - Deploy to staging environment first
   - Run comprehensive tests
   - Verify all functionality

2. **Production Deployment**:
   - Schedule maintenance window
   - Deploy during low-traffic periods
   - Monitor closely after deployment
   - Have rollback plan ready

3. **Rollback Procedures**:
   - Keep previous Docker images
   - Document rollback steps
   - Test rollback procedures regularly

## Support and Resources

### Documentation

- [Coolify Documentation](https://coolify.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Bun Documentation](https://bun.sh/docs)

### Monitoring Tools

- Application logs via Coolify
- Health check endpoints
- Metrics endpoint for monitoring systems
- Supabase dashboard for database monitoring

### Emergency Contacts

- Document emergency contact procedures
- Maintain on-call schedules
- Establish escalation procedures

---

For additional support or questions about deployment, please refer to the project documentation or contact the development team.