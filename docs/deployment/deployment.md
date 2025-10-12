# Tarkov Casino Deployment Guide

This document provides instructions for deploying the Tarkov Casino Website to production using Coolify v4 and Appwrite for backend services.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Coolify Deployment](#coolify-deployment)
4. [Monitoring and Health Checks](#monitoring-and-health-checks)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

## Prerequisites

### Required Services

1. **Coolify Instance**: A running Coolify v4 instance with Docker support
   - Note: Coolify v3 is deprecated as of 2024
   - Use Coolify Cloud or self-hosted v4 installation

2. **Appwrite Instance**: Appwrite Cloud or self-hosted
   - **Option A (Recommended)**: Appwrite Cloud at https://cloud.appwrite.io
   - **Option B**: Self-hosted Appwrite instance
   - Database configured with project schema
   - Authentication service enabled
   - API key created with proper scopes

3. **Dragonfly Instance** (Optional but recommended): Redis-compatible cache
   - Can be added as a Coolify service
   - Improves performance with caching layer

4. **Domain**: A domain name pointing to your Coolify instance
5. **SSL Certificate**: Automatic via Coolify/Let's Encrypt

### System Requirements

For Coolify v4:
- **CPU**: 2+ cores recommended (AMD64 or ARM64)
- **RAM**: 2GB+ recommended
- **Storage**: 30GB+ available space for Docker images
- **Network**: Stable internet connection

Supported operating systems:
- Debian-based Linux distributions (Debian, Ubuntu 20.04+, etc.)
- Red Hat-based Linux distributions (CentOS, Fedora, AlmaLinux, Rocky, etc.)
- SUSE-based Linux distributions (SLES, SUSE, openSUSE)
- Arch Linux
- Raspberry Pi OS (64-bit recommended)

## Environment Configuration

### 1. Appwrite Setup

#### Option A: Appwrite Cloud (Recommended)

1. **Create Appwrite Project:**
   - Visit https://cloud.appwrite.io
   - Sign up or log in
   - Create a new project
   - Note your Project ID

2. **Create Database:**
   - Navigate to Databases in Appwrite Console
   - Create a database named `tarkov_casino`
   - Create tables for: `user_profiles`, `game_history`, `transactions`, `case_types`, `tarkov_items`, etc.
   - Configure permissions on each table

3. **Generate API Key:**
   - Go to Project Settings → API Keys
   - Create a new API key with scopes:
     - `databases.read`
     - `databases.write`
     - `users.read`
     - `users.write`
     - `sessions.write`
   - Save the API key securely

4. **Configure Storage Buckets:**
   - Navigate to Storage in Appwrite Console
   - Create buckets: `avatars`, `game_assets`
   - Set appropriate permissions

#### Option B: Self-Hosted Appwrite

1. **Install Appwrite:**
   ```bash
   docker run -d \
     --name appwrite \
     -p 80:80 -p 443:443 \
     -v appwrite-data:/storage \
     appwrite/appwrite:latest
   ```

2. **Complete Setup:**
   - Access http://localhost
   - Complete setup wizard
   - Create project and generate API key

3. **Configure Databases:**
   - Follow same steps as Appwrite Cloud
   - Create database, tables, and configure permissions

### 2. Environment Variables

Configure the following environment variables in Coolify. Get credentials from your Appwrite project dashboard:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000

# Appwrite Configuration
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key_with_proper_scopes

# Appwrite Database IDs (from your Appwrite Console)
APPWRITE_DATABASE_ID=tarkov_casino
APPWRITE_USERS_TABLE_ID=user_profiles
APPWRITE_GAMES_TABLE_ID=game_history
APPWRITE_TRANSACTIONS_TABLE_ID=transactions
APPWRITE_CASES_TABLE_ID=case_types
APPWRITE_ITEMS_TABLE_ID=tarkov_items

# Dragonfly/Redis Configuration (Optional)
REDIS_ENABLED=true
REDIS_URL=redis://default:PASSWORD@dragonfly-service:6379/0

# Cache TTLs (seconds)
CACHE_USER_PROFILE_TTL=300
CACHE_BALANCE_TTL=60
CACHE_LEADERBOARD_TTL=30
CACHE_STATS_TTL=120

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

# Monitoring Configuration
HEALTH_CHECK_TIMEOUT=5000
METRICS_ENABLED=true

# Frontend Environment Variables (for build time)
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_API_URL=http://localhost:3000
```

### 3. Security Considerations

**For Appwrite Setup**:
- **API Keys**: Secure your Appwrite API key - never expose in frontend code
- **API Key Scopes**: Only grant necessary scopes (databases.read, databases.write, users.read, users.write)
- **Permissions**: Configure row-level permissions on all tables
- **CORS**: Appwrite handles CORS - add your domain to allowed origins in Appwrite Console
- **Rate Limiting**: Appwrite has built-in rate limiting + additional backend rate limiting via Dragonfly
- **HTTPS**: Appwrite Cloud uses HTTPS by default; self-hosted requires SSL certificate

**Appwrite Cloud Security:**
- ✅ Automatic HTTPS/TLS encryption
- ✅ DDoS protection
- ✅ Geographic distribution
- ✅ Automatic backups
- ✅ SOC 2 Type II compliance

## Coolify Deployment

### 1. Install Coolify v4

Choose one of the installation methods:

#### Option A: Coolify Cloud (Recommended)
1. Visit [Coolify Cloud](https://app.coolify.io/register)
2. Create an account and set up your project
3. No server setup required

#### Option B: Self-hosted Installation
```bash
# Quick installation (recommended for Ubuntu LTS)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash

# Or for manual installation, see: https://coolify.io/docs/get-started/installation
```

### 2. Create New Service

1. Log into your Coolify dashboard
2. Click "New Service" → "Docker"
3. Configure the service:
   - **Name**: `tarkov-casino`
   - **Description**: `Tarkov-themed casino gaming website`
   - **Repository**: Your Git repository URL
   - **Branch**: `main` (or your production branch)

### 3. Configure Build Settings

In the Coolify service configuration:

- **Build Pack**: Docker
- **Dockerfile**: `Dockerfile` (in root directory)
- **Build Context**: `.` (root directory)
- **Port**: `3000`
- **Architecture**: `amd64` or `arm64` (based on your server)

### 4. Environment Variables

Add all the environment variables from the production template above. Ensure all required variables are set before deployment.

### 5. Health Check Configuration

Coolify will automatically use the health check defined in the Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### 6. Domain and SSL Configuration

1. Add your domain in Coolify under "Domains"
2. Enable "Force HTTPS" and "Generate SSL Certificate" (Let's Encrypt)
3. Configure DNS to point to your Coolify instance
4. Add any additional security headers if needed

### 7. Deploy

1. Click "Deploy" in Coolify
2. Monitor the build logs in real-time
3. Verify deployment success via health checks
4. Check that all endpoints are responding correctly

## Monitoring and Health Checks

### Production Monitoring Best Practices

#### 1. Application Monitoring
- **Response Times**: Monitor API response times and identify slow endpoints
- **Error Rates**: Track 4xx and 5xx error rates
- **Resource Usage**: Monitor CPU, memory, and disk usage
- **Database Performance**: Track query performance and connection pools

#### 2. Business Metrics
- **User Activity**: Monitor active users, game sessions, and engagement
- **Revenue Metrics**: Track deposits, withdrawals, and game outcomes
- **Security Events**: Monitor failed login attempts and suspicious activity

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

#### 1. Coolify Monitoring
- Automatic health checks via Docker HEALTHCHECK
- Real-time log streaming
- Resource usage monitoring
- Deployment status tracking

#### 2. External Monitoring Tools
Choose from modern monitoring solutions:
- **Uptime Kuma**: Open-source uptime monitoring
- **Grafana + Prometheus**: Comprehensive metrics and visualization
- **DataDog**: Enterprise-grade monitoring and alerting
- **New Relic**: Application performance monitoring
- **Sentry**: Error tracking and alerting

#### 3. Recommended Monitoring Stack
```yaml
# Example docker-compose monitoring stack
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password

  uptime-kuma:
    image: louislam/uptime-kuma
    ports:
      - "3002:3001"
```

### Log Monitoring

#### Structured Logging
Logs are structured in production and include:

- Request logs with performance metrics
- Game action logs for analytics
- Security event logs for audit trails
- System event logs for debugging
- Database query logs for performance analysis

#### Log Access
```bash
# Coolify logs (via dashboard)
# Access through Coolify web interface

# Docker logs (if self-hosted)
docker logs <container-id>

# Structured log queries
# Use log aggregation tools like Loki or ELK stack
```

#### Log Retention
- **Application Logs**: 30 days rolling retention
- **Security Logs**: 90 days minimum retention
- **Audit Logs**: 1 year minimum retention
- **Backup**: Regular log backups to secure storage

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Failures

**Symptoms**: Build fails during Docker build process

**Solutions**:
- **Check Coolify v4 compatibility**: Ensure using Coolify v4, not deprecated v3
- **Verify Dockerfile syntax**: Test locally with `docker build .`
- **Check architecture**: Ensure matching amd64/arm64 for your server
- **Disk space**: Ensure 30GB+ free space for Docker images
- **Network issues**: Check if external dependencies are accessible
- **Build logs**: Review Coolify build logs for specific error messages

#### 2. Health Check Failures

**Symptoms**: Container starts but health checks fail

**Solutions**:
- **Supabase connectivity**: Verify your local Supabase at `http://192.168.0.69:8001` is running
- **Environment variables**: Check all required variables are set correctly
- **Port binding**: Ensure port 3000 is properly exposed
- **Database migrations**: Confirm all migrations applied successfully
- **Network connectivity**: Ensure Coolify server can reach 192.168.0.69:8001

#### 3. Database Connection Issues

**Symptoms**: 503 errors, database-related error messages

**Solutions**:
- **Supabase status**: Check if Supabase is running: `curl http://192.168.0.69:8001`
- **Network connectivity**: Ensure Coolify server can communicate with Supabase server
- **API keys**: Verify keys from Supabase dashboard are correct
- **Migration status**: Check if all database migrations were applied
- **RLS policies**: Ensure Row Level Security policies are correctly applied

#### 4. Performance Issues

**Symptoms**: Slow response times, timeouts

**Solutions**:
- **Resource allocation**: Check CPU/memory allocation in Coolify
- **Database optimization**: Use Supabase Performance Advisor
- **Query optimization**: Review slow query logs
- **Caching**: Implement proper caching strategies
- **Rate limiting**: Adjust rate limits based on actual usage

#### 5. SSL/HTTPS Issues (Optional)

**Symptoms**: Mixed content warnings, insecure connection errors

**Solutions**:
- **Coolify SSL**: Ensure SSL certificate is properly generated via Let's Encrypt
- **Force HTTPS**: Enable "Force HTTPS" in Coolify domain settings
- **CORS configuration**: Update allowed origins for your production domain
- **Mixed content**: Ensure all assets are served over HTTPS

**Note**: SSL is recommended for production but not mandatory for local testing.

#### 6. Authentication Issues

**Symptoms**: Login failures, session errors

**Solutions**:
- **Appwrite auth status**: Check Appwrite Console → Auth section is enabled
- **Session management**: Appwrite handles sessions automatically via SDK
- **CORS configuration**: Add your domain to Appwrite Console → Settings → Platforms
- **Auth redirects**: Configure success/failure URLs in Appwrite Console
- **Project ID**: Verify VITE_APPWRITE_PROJECT_ID matches in frontend env

### Debug Commands

#### Coolify-specific Commands
```bash
# Check service status in Coolify dashboard
# Monitor real-time logs through Coolify interface

# Redeploy with fresh build
# Use Coolify dashboard redeploy button
```

#### Container Debugging
```bash
# Check container status
docker ps

# View container logs
docker logs <container-id>

# Execute commands in running container
docker exec -it <container-id> /bin/bash

# Check container resource usage
docker stats <container-id>
```

#### Application Testing
```bash
# Test basic health endpoint
curl -f https://your-domain.com/api/health

# Test detailed health check
curl https://your-domain.com/api/health/detailed

# Test Appwrite connectivity
curl https://<REGION>.cloud.appwrite.io/v1/health

# Test database access (requires backend to be running)
curl https://your-domain.com/api/user/balance

# Test Appwrite API directly
curl https://<REGION>.cloud.appwrite.io/v1/databases/<DB_ID> \
  -H "X-Appwrite-Project: <PROJECT_ID>" \
  -H "X-Appwrite-Key: <API_KEY>"
```

#### Database Debugging
```bash
# Test Appwrite connection
curl https://<REGION>.cloud.appwrite.io/v1/health

# Check Appwrite Console
# Open browser to: https://cloud.appwrite.io/console

# List databases (requires API key)
curl https://<REGION>.cloud.appwrite.io/v1/databases \
  -H "X-Appwrite-Project: <PROJECT_ID>" \
  -H "X-Appwrite-Key: <API_KEY>"

# Check table exists
curl https://<REGION>.cloud.appwrite.io/v1/databases/<DB_ID>/tables/<TABLE_ID> \
  -H "X-Appwrite-Project: <PROJECT_ID>" \
  -H "X-Appwrite-Key: <API_KEY>"

# Test from backend
cd packages/backend
bun run db:test-connection
```

## Maintenance

### Production Maintenance Best Practices

#### 1. Regular Monitoring Tasks

**Daily Checks**:
- Monitor application health endpoints
- Review error logs and alerts
- Check database performance metrics
- Verify backup completion status

**Weekly Tasks**:
- Review security logs for suspicious activity
- Analyze performance trends
- Check disk space and resource usage
- Update dependencies if security patches available

**Monthly Tasks**:
- Comprehensive security audit
- Database performance optimization
- Log retention and cleanup
- Backup integrity verification

#### 2. Database Maintenance

**Appwrite Cloud Tasks**:
- Monitor Appwrite Console for service status
- Check database usage and limits in Appwrite Console
- Review query performance in Appwrite Analytics
- Monitor API usage and rate limits
- Keep track of storage usage

**Appwrite Self-Hosted Tasks**:
- Monitor Appwrite container health
- Check disk usage for database and storage
- Apply Appwrite version updates via Docker
- Monitor logs: `docker logs appwrite`
- Backup Appwrite data volumes

**Application Data Management**:
- Implement data retention policies for game history
- Archive old logs and analytics data
- Monitor database row counts and storage
- Optimize indexes based on query patterns
- Use bulk operations for data cleanup

#### 3. Security Maintenance

**Dependency Management**:
- Keep all dependencies updated
- Monitor security advisories (GitHub Security Advisories)
- Regular vulnerability scans
- Update base Docker images

**Network Security**:
- Review firewall rules and network restrictions
- Monitor SSL certificate expiration
- Update CORS policies as needed

#### 4. Performance Optimization

**Application Performance**:
- Monitor API response times and throughput
- Optimize database queries and indexes
- Implement caching strategies where appropriate
- Profile memory usage and optimize garbage collection

**Infrastructure Performance**:
- Monitor server resource utilization
- Optimize Docker container resource limits
- Implement horizontal scaling if needed
- Load testing during off-peak hours

### Scaling and Capacity Planning

#### 1. Monitoring for Scale

**Resource Monitoring**:
- CPU utilization trends (>70% sustained = scale up)
- Memory usage patterns (>80% = scale up)
- Disk I/O performance (>50ms latency = optimize)
- Network throughput (>80% capacity = scale up)

**Application Metrics**:
- Request rate and response times
- Error rates and user experience
- Database connection pool utilization
- Cache hit rates and performance

#### 2. Scaling Strategies

**Vertical Scaling**:
- Increase CPU cores and memory
- Optimize application performance
- Database server upgrades
- Storage capacity expansion

**Horizontal Scaling**:
- Load balancer implementation
- Multiple application instances
- Database read replicas
- CDN for static assets

**Auto-scaling**:
- Coolify automatic scaling (if supported)
- Kubernetes HPA (Horizontal Pod Autoscaler)
- Database connection pooling
- Application-level load distribution

## Support and Resources

### Documentation Links

- [Coolify v4 Documentation](https://coolify.io/docs)
- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Self-Hosting Guide](https://appwrite.io/docs/advanced/self-hosting)
- [Appwrite Coolify Deployment](https://appwrite.io/docs/advanced/self-hosting/platforms/coolify)
- [Bun Runtime Documentation](https://bun.sh/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Community Resources

- [Coolify Discord Community](https://coolify.io/discord)
- [Appwrite Discord Community](https://appwrite.io/discord)
- [Appwrite GitHub](https://github.com/appwrite/appwrite)
- [Coolify GitHub Issues](https://github.com/coollabsio/coolify/issues)

### Monitoring and Observability

**Recommended Tool Stack**:
- **Uptime Kuma**: Open-source uptime monitoring
- **Grafana + Prometheus**: Metrics collection and visualization
- **Loki**: Log aggregation
- **Sentry**: Error tracking and alerting
- **Supabase Performance Advisor**: Database optimization

**Built-in Monitoring**:
- Coolify dashboard logs and metrics
- Application health endpoints (`/api/health`, `/api/health/detailed`, `/api/metrics`)
- Appwrite Console analytics and monitoring
- Dragonfly cache statistics
- Docker container metrics

### Security Resources

- [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Appwrite Security Documentation](https://appwrite.io/docs/advanced/security)
- [Appwrite Permissions Guide](https://appwrite.io/docs/advanced/platform/permissions)
- [Docker Security Best Practices](https://docs.docker.com/develop/dev-best-practices/security/)
- [SSL/TLS Deployment Best Practices](https://ssl-config.mozilla.org/)

### Performance Optimization

- [Appwrite Performance Best Practices](https://appwrite.io/docs/advanced/platform)
- [Appwrite Database Queries](https://appwrite.io/docs/products/databases/queries)
- [Bun Performance Tips](https://bun.sh/docs/runtime/performance)
- [Docker Performance Tuning](https://docs.docker.com/config/containers/resource_constraints/)
- [Web Vitals](https://web.dev/vitals/) for frontend performance

## Tarkov Casino Specific Deployment Notes

### Appwrite Configuration
- **Appwrite Cloud**: Recommended for production (https://cloud.appwrite.io)
- **Self-Hosted**: Alternative for on-premise deployments
- **Database**: Create `tarkov_casino` database in Appwrite Console
- **Tables**: Set up tables via Appwrite Console or automation scripts
- **API Keys**: Generate with proper scopes for backend access

### Project-Specific Scripts
```bash
# Test Appwrite connection
cd packages/backend
bun run db:test-connection

# Populate case opening items
bun run db:populate-items

# Test database setup
bun run db:verify
```

### Required Appwrite Setup

1. **Create Database:**
   - Name: `tarkov_casino`
   - Create tables: `user_profiles`, `game_history`, `transactions`, `case_types`, `tarkov_items`

2. **Configure Permissions:**
   - Set appropriate read/write permissions on each table
   - User profiles: Users can read/update own profile
   - Game history: Users can read own history
   - Public data: Anyone can read active cases and items

3. **Create Storage Buckets:**
   - `avatars`: For user profile pictures
   - `game_assets`: For game-related files

4. **Add Platform:**
   - Add your frontend domain in Appwrite Console → Settings → Platforms
   - This enables CORS for your domain

### Environment Setup
1. Get credentials from Appwrite Console → Settings
2. Generate API key with required scopes
3. Configure environment variables in Coolify
4. Deploy and verify health endpoints