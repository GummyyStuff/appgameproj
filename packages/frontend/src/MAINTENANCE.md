# Case Opening Game Maintenance Procedures

## Overview

This document provides comprehensive maintenance procedures, troubleshooting guides, and operational procedures for the Case Opening Game system. It covers routine maintenance, issue resolution, performance optimization, and system monitoring.

## Table of Contents

1. [Routine Maintenance](#routine-maintenance)
2. [Performance Monitoring](#performance-monitoring)
3. [Error Handling and Recovery](#error-handling-and-recovery)
4. [Security Maintenance](#security-maintenance)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Deployment Procedures](#deployment-procedures)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring and Alerting](#monitoring-and-alerting)

## Routine Maintenance

### Daily Maintenance Tasks

#### Performance Monitoring
```bash
# Check animation frame rates
bun test --grep "performance" packages/frontend/src/components/games/__tests__/

# Monitor memory usage
node -e "
const { performanceMonitoring } = require('./packages/frontend/src/utils/performanceMonitoring');
console.log('Memory usage:', performanceMonitoring.getMetrics());
"

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://api.example.com/cases/open"
```

#### Error Rate Monitoring
```bash
# Check error logs
tail -f logs/error.log | grep "case-opening"

# Monitor error rates
grep "ERROR" logs/application.log | grep "case-opening" | wc -l

# Check recovery success rates
grep "RECOVERY_SUCCESS" logs/application.log | wc -l
```

#### Cache Health Check
```bash
# Check cache hit rates
redis-cli info stats | grep "keyspace_hits\|keyspace_misses"

# Monitor cache size
redis-cli info memory | grep "used_memory_human"

# Check TTL expiration
redis-cli --scan --pattern "case:*" | head -10
```

### Weekly Maintenance Tasks

#### Performance Analysis
```bash
# Generate performance report
bun run scripts/generate-performance-report.js

# Analyze animation performance
bun test packages/frontend/src/components/games/__tests__/performance.test.ts

# Check bundle size
bun run build && du -sh dist/
```

#### Security Review
```bash
# Check for security vulnerabilities
npm audit

# Review access logs
grep "401\|403" logs/access.log | tail -100

# Validate authentication tokens
redis-cli keys "auth:*" | wc -l
```

#### Database Maintenance
```sql
-- Check case opening statistics
SELECT 
  DATE(created_at) as date,
  COUNT(*) as openings,
  AVG(currency_awarded) as avg_award
FROM case_openings 
WHERE created_at >= NOW() - INTERVAL 7 DAY
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check for orphaned transactions
SELECT COUNT(*) FROM transactions 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL 1 HOUR;
```

### Monthly Maintenance Tasks

#### Performance Optimization Review
```bash
# Analyze performance trends
bun run scripts/analyze-performance-trends.js

# Review animation performance
bun test packages/frontend/src/components/games/__tests__/animation-performance.test.ts

# Check memory usage trends
bun run scripts/memory-analysis.js
```

#### Code Quality Review
```bash
# Run comprehensive tests
bun test

# Check code coverage
bun test --coverage

# Run linting
bun run lint

# Check TypeScript compilation
bun run type-check
```

## Performance Monitoring

### Key Performance Indicators (KPIs)

#### Animation Performance
- **Target**: 60 FPS consistently
- **Monitoring**: Real-time frame rate tracking
- **Alert Threshold**: < 50 FPS for > 5 seconds

```typescript
// Performance monitoring implementation
const performanceMonitor = {
  frameRate: 0,
  memoryUsage: 0,
  apiResponseTime: 0,
  
  startMonitoring() {
    this.frameRateMonitor = setInterval(() => {
      this.checkFrameRate();
    }, 1000);
  },
  
  checkFrameRate() {
    const frames = this.frameCount;
    this.frameRate = frames;
    
    if (frames < 50) {
      this.alert('Low frame rate detected', { frameRate: frames });
    }
  }
};
```

#### Memory Usage
- **Target**: < 100MB for case opening process
- **Monitoring**: Heap size tracking
- **Alert Threshold**: > 150MB

#### API Response Time
- **Target**: < 1 second for case opening
- **Monitoring**: Request timing
- **Alert Threshold**: > 2 seconds

### Performance Monitoring Commands

```bash
# Start performance monitoring
bun run scripts/start-performance-monitoring.js

# Generate performance report
bun run scripts/generate-performance-report.js

# Check animation performance
bun test packages/frontend/src/components/games/__tests__/performance.test.ts

# Monitor memory usage
node -e "
const { performanceMonitoring } = require('./packages/frontend/src/utils/performanceMonitoring');
setInterval(() => {
  console.log('Memory:', performanceMonitoring.getMemoryUsage());
}, 5000);
"
```

## Error Handling and Recovery

### Error Classification

#### Network Errors
- **Symptoms**: API timeouts, connection failures
- **Recovery**: Automatic retry with exponential backoff
- **Monitoring**: Error rate tracking

#### Animation Errors
- **Symptoms**: Frame drops, animation stuttering
- **Recovery**: Fallback to reveal animation
- **Monitoring**: Performance metrics

#### Authentication Errors
- **Symptoms**: 401/403 responses
- **Recovery**: Token refresh, redirect to login
- **Monitoring**: Auth failure tracking

### Error Recovery Procedures

#### Automatic Recovery
```typescript
// Error recovery implementation
const errorRecovery = {
  async handleError(error, context) {
    const strategy = this.getErrorStrategy(error, context);
    
    if (strategy.retry) {
      return this.retryOperation(error, context);
    }
    
    if (strategy.fallback) {
      return this.executeFallback(strategy.fallback);
    }
    
    this.logError(error, context);
    this.notifyUser(strategy.userMessage);
  }
};
```

#### Manual Recovery Procedures

1. **Network Issues**
   ```bash
   # Check API health
   curl -f https://api.example.com/health
   
   # Restart API service
   sudo systemctl restart case-opening-api
   
   # Check database connectivity
   psql -h db.example.com -U user -d database -c "SELECT 1"
   ```

2. **Animation Issues**
   ```bash
   # Check browser compatibility
   bun test packages/frontend/src/components/games/__tests__/browser-compatibility.test.ts
   
   # Validate hardware acceleration
   bun test packages/frontend/src/components/games/__tests__/hardware-acceleration.test.ts
   
   # Test fallback mechanisms
   bun test packages/frontend/src/components/games/__tests__/fallback-animation.test.ts
   ```

3. **State Management Issues**
   ```bash
   # Check state transitions
   bun test packages/frontend/src/hooks/__tests__/useCaseOpeningGame.test.ts
   
   # Validate error recovery
   bun test packages/frontend/src/hooks/__tests__/useErrorHandling.test.ts
   
   # Test state reset
   bun test packages/frontend/src/components/games/__tests__/state-reset.test.ts
   ```

## Security Maintenance

### Security Monitoring

#### Authentication Monitoring
```bash
# Check failed login attempts
grep "AUTH_FAILED" logs/security.log | tail -50

# Monitor token usage
redis-cli keys "auth:*" | wc -l

# Check for suspicious activity
grep "SUSPICIOUS" logs/security.log | tail -20
```

#### Authorization Checks
```bash
# Check unauthorized access attempts
grep "403" logs/access.log | tail -100

# Monitor case opening permissions
grep "CASE_ACCESS_DENIED" logs/security.log | tail -20

# Check balance manipulation attempts
grep "BALANCE_MANIPULATION" logs/security.log | tail -10
```

### Security Procedures

#### Incident Response
1. **Detection**: Automated monitoring alerts
2. **Assessment**: Determine severity and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve

#### Security Updates
```bash
# Update dependencies
bun update

# Check for vulnerabilities
npm audit

# Update security patches
sudo apt update && sudo apt upgrade

# Restart services
sudo systemctl restart case-opening-api
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Low Animation Frame Rate

**Symptoms**:
- Choppy animations
- Frame drops below 50 FPS
- Poor user experience

**Diagnosis**:
```bash
# Check browser performance
bun test packages/frontend/src/components/games/__tests__/performance.test.ts

# Monitor memory usage
node -e "
const { performanceMonitoring } = require('./packages/frontend/src/utils/performanceMonitoring');
console.log('Memory:', performanceMonitoring.getMemoryUsage());
"

# Check hardware acceleration
bun test packages/frontend/src/components/games/__tests__/hardware-acceleration.test.ts
```

**Solutions**:
1. Enable hardware acceleration
2. Reduce animation complexity
3. Implement virtualization
4. Use fallback animation

#### Issue: API Timeout Errors

**Symptoms**:
- Case opening requests timing out
- 504 Gateway Timeout errors
- User complaints about slow responses

**Diagnosis**:
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://api.example.com/cases/open"

# Monitor database performance
psql -h db.example.com -U user -d database -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"

# Check server resources
top -p $(pgrep -f "case-opening-api")
```

**Solutions**:
1. Optimize database queries
2. Implement caching
3. Scale API servers
4. Add request timeout handling

#### Issue: Memory Leaks

**Symptoms**:
- Increasing memory usage over time
- Browser crashes
- Performance degradation

**Diagnosis**:
```bash
# Monitor memory usage
node -e "
const { performanceMonitoring } = require('./packages/frontend/src/utils/performanceMonitoring');
setInterval(() => {
  console.log('Memory:', performanceMonitoring.getMemoryUsage());
}, 5000);
"

# Check for memory leaks
bun test packages/frontend/src/components/games/__tests__/memory-leak.test.ts

# Analyze heap dumps
node --inspect packages/frontend/src/utils/memory-analysis.js
```

**Solutions**:
1. Fix memory leaks in components
2. Implement proper cleanup
3. Use virtualization
4. Optimize data structures

#### Issue: State Management Problems

**Symptoms**:
- Inconsistent game state
- UI not updating correctly
- Error recovery failures

**Diagnosis**:
```bash
# Check state transitions
bun test packages/frontend/src/hooks/__tests__/useCaseOpeningGame.test.ts

# Validate error handling
bun test packages/frontend/src/hooks/__tests__/useErrorHandling.test.ts

# Test state reset
bun test packages/frontend/src/components/games/__tests__/state-reset.test.ts
```

**Solutions**:
1. Review state machine logic
2. Fix state transition bugs
3. Improve error handling
4. Add state validation

### Debugging Tools

#### Development Tools
```bash
# Enable debug logging
export DEBUG=case-opening:*

# Start development server with debugging
bun run dev --debug

# Run tests with verbose output
bun test --verbose

# Check TypeScript compilation
bun run type-check --verbose
```

#### Production Debugging
```bash
# Check application logs
tail -f logs/application.log | grep "case-opening"

# Monitor error rates
watch -n 1 'grep "ERROR" logs/application.log | grep "case-opening" | wc -l'

# Check performance metrics
bun run scripts/check-performance-metrics.js
```

## Deployment Procedures

### Pre-Deployment Checklist

#### Code Quality
- [ ] All tests passing
- [ ] Code coverage > 90%
- [ ] Linting passed
- [ ] TypeScript compilation successful
- [ ] Performance tests passing

#### Security
- [ ] Security audit completed
- [ ] Dependencies updated
- [ ] Vulnerabilities patched
- [ ] Access controls validated

#### Performance
- [ ] Animation performance validated
- [ ] Memory usage within limits
- [ ] API response times acceptable
- [ ] Bundle size optimized

### Deployment Steps

#### Staging Deployment
```bash
# Build application
bun run build

# Run tests
bun test

# Deploy to staging
bun run deploy:staging

# Run integration tests
bun test packages/frontend/src/components/games/__tests__/integration.test.ts

# Performance validation
bun test packages/frontend/src/components/games/__tests__/performance.test.ts
```

#### Production Deployment
```bash
# Final build
bun run build:production

# Run production tests
bun test:production

# Deploy with feature flag
bun run deploy:production --feature-flag=case-opening-v2

# Monitor deployment
bun run scripts/monitor-deployment.js

# Gradual rollout
bun run scripts/gradual-rollout.js --percentage=10
```

### Post-Deployment Validation

#### Health Checks
```bash
# Check application health
curl -f https://app.example.com/health

# Validate API endpoints
curl -f https://api.example.com/cases/health

# Check database connectivity
psql -h db.example.com -U user -d database -c "SELECT 1"

# Monitor error rates
watch -n 5 'grep "ERROR" logs/application.log | grep "case-opening" | wc -l'
```

#### Performance Validation
```bash
# Check animation performance
bun test packages/frontend/src/components/games/__tests__/performance.test.ts

# Monitor memory usage
bun run scripts/monitor-memory.js

# Check API response times
bun run scripts/check-api-performance.js
```

## Rollback Procedures

### Emergency Rollback

#### Quick Rollback
```bash
# Rollback to previous version
bun run rollback:quick

# Disable feature flag
bun run scripts/disable-feature-flag.js --feature=case-opening-v2

# Restart services
sudo systemctl restart case-opening-api
sudo systemctl restart case-opening-frontend
```

#### Full Rollback
```bash
# Rollback database
bun run scripts/rollback-database.js

# Rollback application
bun run rollback:full

# Restore from backup
bun run scripts/restore-backup.js --backup=pre-deployment

# Validate rollback
bun run scripts/validate-rollback.js
```

### Rollback Validation

#### Functionality Check
```bash
# Test core functionality
bun test packages/frontend/src/components/games/__tests__/core-functionality.test.ts

# Check user flows
bun test packages/frontend/src/components/games/__tests__/user-flows.test.ts

# Validate performance
bun test packages/frontend/src/components/games/__tests__/performance.test.ts
```

#### Data Integrity
```bash
# Check database integrity
psql -h db.example.com -U user -d database -c "
SELECT COUNT(*) FROM case_openings 
WHERE created_at >= NOW() - INTERVAL 1 HOUR;
"

# Validate transactions
psql -h db.example.com -U user -d database -c "
SELECT COUNT(*) FROM transactions 
WHERE status = 'completed' 
AND created_at >= NOW() - INTERVAL 1 HOUR;
"
```

## Monitoring and Alerting

### Alert Configuration

#### Performance Alerts
```yaml
# Performance monitoring configuration
performance_alerts:
  frame_rate:
    threshold: 50
    duration: 5s
    action: "fallback_animation"
  
  memory_usage:
    threshold: 150MB
    duration: 10s
    action: "restart_service"
  
  api_response_time:
    threshold: 2s
    duration: 5s
    action: "scale_servers"
```

#### Error Alerts
```yaml
# Error monitoring configuration
error_alerts:
  error_rate:
    threshold: 5%
    duration: 1m
    action: "investigate_errors"
  
  critical_errors:
    threshold: 1
    duration: 0s
    action: "immediate_response"
  
  recovery_failures:
    threshold: 3
    duration: 5m
    action: "manual_intervention"
```

### Monitoring Dashboard

#### Key Metrics
- Animation frame rate (target: 60 FPS)
- Memory usage (target: < 100MB)
- API response time (target: < 1s)
- Error rate (target: < 0.1%)
- User satisfaction score (target: > 4.5/5)

#### Alert Channels
- Email notifications for critical issues
- Slack alerts for performance degradation
- PagerDuty for emergency situations
- Dashboard updates for real-time monitoring

### Maintenance Schedule

#### Daily
- Performance monitoring review
- Error rate analysis
- Cache health check
- Security log review

#### Weekly
- Performance trend analysis
- Security vulnerability scan
- Database maintenance
- Code quality review

#### Monthly
- Performance optimization review
- Security audit
- Capacity planning
- Documentation updates

#### Quarterly
- Architecture review
- Technology stack updates
- Disaster recovery testing
- Performance benchmarking
