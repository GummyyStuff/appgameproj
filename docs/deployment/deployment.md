# Tarkov Casino Deployment Guide

This document provides instructions for deploying the Tarkov Casino Website to production using Coolify v4 and the project's local Supabase instance.

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

2. **Local Supabase Instance**: Your project's Supabase running at `http://192.168.0.69:8001`
   - Database configured with project schema
   - Authentication and API services running
   - All migrations applied from `packages/backend/src/database/migrations/`
   - API keys accessible via Supabase dashboard

3. **Domain**: A domain name pointing to your Coolify instance
4. **SSL Certificate**: Automatic via Coolify/Let's Encrypt (recommended but not mandatory for local testing)

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

### 1. Supabase Local Instance Setup

Ensure your local Supabase instance is properly configured and running:

1. **Verify Supabase Status**: Confirm your Supabase is accessible at `http://192.168.0.69:8001`
   ```bash
   curl -f http://192.168.0.69:8001/health
   ```

2. **Apply Database Migrations**: Apply all migrations through the Supabase SQL Editor
   ```bash
   # Open your browser and navigate to: http://192.168.0.69:8001
   # Go to SQL Editor in the left sidebar
   ```

   **Apply migrations in order** (check filenames for numbering):
   - Open each `.sql` file from `packages/backend/src/database/migrations/`
   - Copy the SQL content
   - Paste into Supabase SQL Editor
   - Click "Run" for each migration

   **Recommended migration order**:
   1. `001_initial_schema_v2.sql` (core tables)
   2. `002_rpc_functions_v2.sql` (stored procedures)
   3. `003_fix_leaderboard.sql` through `027_fix_game_history_constraints.sql` (fixes and features)

   **Alternative using Supabase CLI** (if properly configured):
   ```bash
   # Link to local Supabase instance
   supabase link --project-ref local

   # Apply all migrations
   supabase migration up
   ```

3. **Security Configuration**:
   - Ensure Row Level Security (RLS) is enabled on all tables
   - Verify security policies are properly applied
   - Confirm API keys are accessible via dashboard

4. **Test Connectivity**: Use the project's setup script to verify connection
   ```bash
   ./scripts/setup-supabase.sh
   ```

### 2. Environment Variables

Configure the following environment variables in Coolify. Get the Supabase keys from `http://192.168.0.69:8001` → Settings → API:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000

# Supabase Configuration (Local Instance)
SUPABASE_URL=http://192.168.0.69:8001
SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard

# Security Configuration
JWT_SECRET=your_secure_random_jwt_secret_32_chars_minimum

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
VITE_SUPABASE_URL=http://192.168.0.69:8001
VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard
# Note: VITE_API_URL is optional and only used for debugging in error boundaries
```

### 3. Security Considerations

**For Local Supabase Setup**:
- **API Keys**: Use keys from your local Supabase dashboard
- **Network Security**: Ensure your Supabase server (192.168.0.69) is on a secure network
- **CORS**: Configure origins appropriately for your domain
- **Rate Limiting**: Implement rate limits suitable for your expected user load
- **JWT_SECRET**: Generate a secure random secret for session management

**Note**: This project uses local Supabase hosting, so cloud-specific security features like SSL enforcement and network restrictions are not applicable. The application is designed to work with HTTP connections to the local Supabase instance.

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
- **Supabase auth status**: Check if auth service is running at `http://192.168.0.69:8001`
- **JWT secrets**: Verify JWT secret matches between Supabase and application
- **Session handling**: Check session cookie settings for production
- **Auth redirects**: Update redirect URLs to match your domain
- **API keys**: Ensure correct anon key is used for authentication

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

# Test API endpoints
curl https://your-domain.com/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Supabase connectivity
curl https://your-project-ref.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"
```

#### Database Debugging
```bash
# Test local Supabase connection
curl -f http://192.168.0.69:8001/health

# Check Supabase dashboard
# Open browser to: http://192.168.0.69:8001

# Test database connectivity from application
curl -X POST http://your-domain.com/api/health \
  -H "Content-Type: application/json"

# Check migration status
# Open Supabase dashboard: http://192.168.0.69:8001
# Go to SQL Editor and run:
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
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

**Local Supabase Tasks**:
- Monitor Supabase service logs on the host server (192.168.0.69)
- Ensure Supabase containers are running and healthy
- Check database disk usage on the Supabase server
- Apply new migrations through SQL Editor when deploying updates
- Monitor database performance through Supabase dashboard

**Application Data Management**:
- Implement data retention policies for game history
- Archive old logs and analytics data
- Monitor database growth trends
- Optimize indexes based on query patterns

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
- [Supabase Production Docs](https://supabase.com/docs/guides/platform/going-into-prod)
- [Bun Runtime Documentation](https://bun.sh/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Supabase Performance Advisor](https://supabase.com/docs/guides/database/database-advisors)

### Community Resources

- [Coolify Discord Community](https://coolify.io/discord)
- [Supabase Discord Community](https://supabase.com/docs/guides/platform/discord)
- [GitHub Issues](https://github.com/coollabsio/coolify/issues) for Coolify
- [Supabase GitHub Discussions](https://github.com/supabase/supabase/discussions)

### Monitoring and Observability

**Recommended Tool Stack**:
- **Uptime Kuma**: Open-source uptime monitoring
- **Grafana + Prometheus**: Metrics collection and visualization
- **Loki**: Log aggregation
- **Sentry**: Error tracking and alerting
- **Supabase Performance Advisor**: Database optimization

**Built-in Monitoring**:
- Coolify dashboard logs and metrics
- Application health endpoints (`/api/health`, `/api/metrics`)
- Supabase dashboard monitoring
- Docker container metrics

### Security Resources

- [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Docker Security Best Practices](https://docs.docker.com/develop/dev-best-practices/security/)
- [SSL/TLS Deployment Best Practices](https://ssl-config.mozilla.org/)

### Performance Optimization

- [Supabase Performance Guide](https://supabase.com/docs/guides/database/query-optimization)
- [Bun Performance Tips](https://bun.sh/docs/runtime/performance)
- [Docker Performance Tuning](https://docs.docker.com/config/containers/resource_constraints/)
- [Web Vitals](https://web.dev/vitals/) for frontend performance

## Tarkov Casino Specific Deployment Notes

### Local Supabase Configuration
- **Supabase URL**: `http://192.168.0.69:8001` (local instance)
- **Dashboard Access**: Available at the Supabase URL for key management
- **Migration Scripts**: Located in `packages/backend/src/database/migrations/`
- **Setup Scripts**: Use `scripts/setup-supabase.sh` for initial configuration

### Project-Specific Scripts
```bash
# Setup Supabase connection
./scripts/setup-supabase.sh

# Apply database migrations
cd packages/backend
bun run src/scripts/apply-security-migration.ts
bun run src/scripts/apply-realtime-migration.ts

# Update Supabase keys
./scripts/update-keys.sh
```

### SSL Enforcement Note
SSL enforcement is **not mandatory** for local Supabase instances but is recommended for production HTTPS deployments. The application will work without SSL for local development and testing.

### Environment Setup
1. Get API keys from `http://192.168.0.69:8001` → Settings → API
2. Configure environment variables in Coolify
3. Ensure network connectivity between Coolify server and Supabase server (192.168.0.69)