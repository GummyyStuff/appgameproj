# Maintenance Documentation

## Overview

This document provides comprehensive maintenance procedures, schedules, and best practices for the Tarkov Casino website. Regular maintenance ensures optimal performance, security, and reliability.

## Maintenance Schedule

### Daily Tasks (Automated)
- **Database Backups**: 2:00 AM UTC
- **Log Rotation**: 3:00 AM UTC  
- **Health Monitoring**: Every 5 minutes
- **Security Scanning**: 4:00 AM UTC
- **Performance Metrics Collection**: Continuous

### Weekly Tasks (Manual/Automated)
- **Dependency Updates Review**: Mondays 9:00 AM
- **Security Audit**: Tuesdays 10:00 AM
- **Performance Analysis**: Wednesdays 2:00 PM
- **Backup Verification**: Thursdays 11:00 AM
- **Documentation Review**: Fridays 3:00 PM

### Monthly Tasks
- **Full Security Assessment**: First Monday
- **Database Optimization**: Second Tuesday
- **Disaster Recovery Testing**: Third Wednesday
- **Capacity Planning Review**: Fourth Thursday
- **Incident Response Review**: Last Friday

### Quarterly Tasks
- **Infrastructure Review**: Q1, Q2, Q3, Q4
- **Security Penetration Testing**: External audit
- **Business Continuity Testing**: Full DR simulation
- **Performance Benchmarking**: Load testing
- **Documentation Overhaul**: Complete review

## Maintenance Procedures

### 1. Database Maintenance

#### Daily Database Health Check
```bash
#!/bin/bash
# scripts/daily-db-check.sh

# Check database connections
psql "$SUPABASE_DB_URL" -c "
SELECT 
    state,
    count(*) as connections,
    max(now() - state_change) as max_idle_time
FROM pg_stat_activity 
WHERE state IS NOT NULL
GROUP BY state;"

# Check table sizes
psql "$SUPABASE_DB_URL" -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY bytes DESC
LIMIT 10;"

# Check for long-running queries
psql "$SUPABASE_DB_URL" -c "
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state = 'active';"
```

#### Weekly Database Optimization
```sql
-- Weekly database maintenance queries
-- Run during low-traffic periods

-- Update table statistics
ANALYZE;

-- Check for unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;

-- Check for bloated tables
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::float / (n_live_tup + n_dead_tup) * 100, 2) as dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_percentage DESC;

-- Vacuum analyze if needed
VACUUM ANALYZE;
```

#### Monthly Database Deep Clean
```bash
#!/bin/bash
# scripts/monthly-db-maintenance.sh

set -e

echo "Starting monthly database maintenance..."

# Backup before maintenance
./scripts/backup-database.sh

# Clean old audit logs (older than 90 days)
psql "$SUPABASE_DB_URL" -c "
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '90 days';"

# Clean old game history (older than 1 year, keep summary stats)
psql "$SUPABASE_DB_URL" -c "
-- Archive old detailed game history
INSERT INTO game_history_archive 
SELECT * FROM game_history 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete archived records from main table
DELETE FROM game_history 
WHERE created_at < NOW() - INTERVAL '1 year';"

# Reindex tables if needed
psql "$SUPABASE_DB_URL" -c "REINDEX DATABASE tarkov_casino;"

# Update statistics
psql "$SUPABASE_DB_URL" -c "ANALYZE;"

echo "Monthly database maintenance completed"
```

### 2. Application Maintenance

#### Log Management
```bash
#!/bin/bash
# scripts/log-maintenance.sh

LOG_DIR="/var/log/tarkov-casino"
RETENTION_DAYS=30
ARCHIVE_DAYS=7

# Compress logs older than 7 days
find "$LOG_DIR" -name "*.log" -mtime +$ARCHIVE_DAYS -exec gzip {} \;

# Delete logs older than 30 days
find "$LOG_DIR" -name "*.log.gz" -mtime +$RETENTION_DAYS -delete

# Clean up empty log files
find "$LOG_DIR" -name "*.log" -size 0 -delete

# Rotate current logs if they're too large (>100MB)
find "$LOG_DIR" -name "*.log" -size +100M -exec logrotate -f /etc/logrotate.d/tarkov-casino {} \;

echo "Log maintenance completed"
```

#### Cache Maintenance
```bash
#!/bin/bash
# scripts/cache-maintenance.sh

# Clear expired Redis cache entries
if command -v redis-cli &> /dev/null; then
    # Remove expired keys
    redis-cli EVAL "
    local expired = 0
    local cursor = '0'
    repeat
        local result = redis.call('SCAN', cursor, 'MATCH', '*', 'COUNT', 1000)
        cursor = result[1]
        local keys = result[2]
        for i=1,#keys do
            local ttl = redis.call('TTL', keys[i])
            if ttl == -1 then
                redis.call('DEL', keys[i])
                expired = expired + 1
            end
        end
    until cursor == '0'
    return expired
    " 0
    
    echo "Cache maintenance completed"
fi

# Clear application-level caches
curl -X POST "$API_URL/admin/cache/clear" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json"
```

#### Dependency Updates
```bash
#!/bin/bash
# scripts/update-dependencies.sh

set -e

echo "Checking for dependency updates..."

# Backend dependencies (Bun)
cd packages/backend
echo "Checking backend dependencies..."
bun outdated
bun update --save

# Frontend dependencies (npm)
cd ../frontend
echo "Checking frontend dependencies..."
npm outdated
npm update --save

# Security audit
echo "Running security audit..."
cd ../backend && bun audit
cd ../frontend && npm audit

# Run tests after updates
echo "Running tests after updates..."
cd ../backend && bun test
cd ../frontend && npm test

echo "Dependency updates completed"
```

### 3. Security Maintenance

#### Daily Security Monitoring
```bash
#!/bin/bash
# scripts/security-monitor.sh

LOG_FILE="/var/log/tarkov-casino/security.log"
ALERT_EMAIL="security@example.com"

# Check for failed authentication attempts
FAILED_LOGINS=$(grep "authentication failed" /var/log/tarkov-casino/app.log | \
    grep "$(date '+%Y-%m-%d')" | wc -l)

if [ "$FAILED_LOGINS" -gt 50 ]; then
    echo "High number of failed logins detected: $FAILED_LOGINS" | \
        mail -s "Security Alert: Failed Logins" "$ALERT_EMAIL"
fi

# Check for suspicious IP addresses
SUSPICIOUS_IPS=$(grep -E "(injection|xss|csrf|../)" /var/log/tarkov-casino/app.log | \
    grep "$(date '+%Y-%m-%d')" | \
    awk '{print $1}' | sort | uniq -c | sort -nr | head -5)

if [ -n "$SUSPICIOUS_IPS" ]; then
    echo "Suspicious IP activity detected:
$SUSPICIOUS_IPS" | mail -s "Security Alert: Suspicious IPs" "$ALERT_EMAIL"
fi

# Check SSL certificate expiration
if [[ "$BASE_URL" == https://* ]]; then
    DOMAIN=$(echo "$BASE_URL" | sed 's|https://||' | sed 's|/.*||')
    CERT_DAYS=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | \
        openssl x509 -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%s)
    CURRENT_DAYS=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (CERT_DAYS - CURRENT_DAYS) / 86400 ))
    
    if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
        echo "SSL certificate expires in $DAYS_UNTIL_EXPIRY days" | \
            mail -s "Security Alert: SSL Certificate Expiring" "$ALERT_EMAIL"
    fi
fi

echo "Security monitoring completed"
```

#### Weekly Security Audit
```bash
#!/bin/bash
# scripts/weekly-security-audit.sh

REPORT_FILE="/tmp/security-audit-$(date +%Y%m%d).txt"

echo "Weekly Security Audit Report - $(date)" > "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"

# Check for security updates
echo "Security Updates Available:" >> "$REPORT_FILE"
apt list --upgradable 2>/dev/null | grep -i security >> "$REPORT_FILE"

# Check open ports
echo -e "\nOpen Ports:" >> "$REPORT_FILE"
netstat -tulpn | grep LISTEN >> "$REPORT_FILE"

# Check user accounts
echo -e "\nUser Accounts:" >> "$REPORT_FILE"
cut -d: -f1,3 /etc/passwd | grep -E ":[0-9]{4}:" >> "$REPORT_FILE"

# Check sudo access
echo -e "\nSudo Access:" >> "$REPORT_FILE"
grep -E "^%sudo|^%admin" /etc/group >> "$REPORT_FILE"

# Check file permissions on sensitive files
echo -e "\nSensitive File Permissions:" >> "$REPORT_FILE"
ls -la /etc/passwd /etc/shadow /etc/ssh/sshd_config >> "$REPORT_FILE"

# Check for world-writable files
echo -e "\nWorld-Writable Files:" >> "$REPORT_FILE"
find /var/www -type f -perm -002 2>/dev/null | head -10 >> "$REPORT_FILE"

echo "Security audit completed: $REPORT_FILE"
```

### 4. Performance Maintenance

#### Performance Monitoring
```bash
#!/bin/bash
# scripts/performance-monitor.sh

METRICS_FILE="/tmp/performance-metrics-$(date +%Y%m%d_%H%M%S).json"

# Collect system metrics
{
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"cpu_usage\": $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'),"
    echo "  \"memory_usage\": $(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}'),"
    echo "  \"disk_usage\": $(df -h / | awk 'NR==2 {print $5}' | sed 's/%//'),"
    echo "  \"load_average\": \"$(uptime | awk -F'load average:' '{print $2}' | xargs)\","
    echo "  \"database_connections\": $(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "0"),"
    echo "  \"response_times\": {"
    
    # Test response times
    HEALTH_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$API_URL/health" 2>/dev/null || echo "0")
    FRONTEND_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL" 2>/dev/null || echo "0")
    
    echo "    \"health_endpoint\": $HEALTH_TIME,"
    echo "    \"frontend\": $FRONTEND_TIME"
    echo "  }"
    echo "}"
} > "$METRICS_FILE"

# Store metrics in database or send to monitoring system
curl -X POST "$MONITORING_ENDPOINT/metrics" \
    -H "Content-Type: application/json" \
    -d @"$METRICS_FILE" 2>/dev/null || true

echo "Performance metrics collected: $METRICS_FILE"
```

#### Performance Optimization
```bash
#!/bin/bash
# scripts/performance-optimization.sh

echo "Starting performance optimization..."

# Optimize database
psql "$SUPABASE_DB_URL" -c "
-- Update query planner statistics
ANALYZE;

-- Check for missing indexes
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND idx_scan < seq_scan
ORDER BY seq_scan DESC;"

# Clear application caches
curl -X POST "$API_URL/admin/cache/clear" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || true

# Restart application if memory usage is high
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ "$MEMORY_USAGE" -gt 85 ]; then
    echo "High memory usage detected ($MEMORY_USAGE%), considering restart..."
    # Implement graceful restart logic here
fi

echo "Performance optimization completed"
```

### 5. Backup Maintenance

#### Backup Verification
```bash
#!/bin/bash
# scripts/verify-backups.sh

BACKUP_DIR="/backups/tarkov-casino"
TEST_DB="tarkov_casino_backup_test"

echo "Verifying backup integrity..."

# Find latest backup
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T@ %p\n' | \
    sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup files found"
    exit 1
fi

echo "Testing backup: $LATEST_BACKUP"

# Test backup file integrity
if ! gzip -t "$LATEST_BACKUP"; then
    echo "ERROR: Backup file is corrupted"
    exit 1
fi

# Create test database and restore
createdb "$TEST_DB" 2>/dev/null || dropdb "$TEST_DB" && createdb "$TEST_DB"

if gunzip -c "$LATEST_BACKUP" | psql "$TEST_DB" > /dev/null 2>&1; then
    echo "Backup restoration test: PASSED"
    
    # Verify data integrity
    TABLES=$(psql "$TEST_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    USERS=$(psql "$TEST_DB" -t -c "SELECT count(*) FROM user_profiles;" 2>/dev/null || echo "0")
    
    echo "Tables restored: $TABLES"
    echo "User profiles: $USERS"
    
    # Cleanup test database
    dropdb "$TEST_DB"
    
    echo "Backup verification: PASSED"
else
    echo "ERROR: Backup restoration failed"
    dropdb "$TEST_DB" 2>/dev/null
    exit 1
fi
```

#### Backup Cleanup
```bash
#!/bin/bash
# scripts/cleanup-backups.sh

BACKUP_DIR="/backups/tarkov-casino"
RETENTION_DAYS=30
ARCHIVE_DAYS=7

echo "Cleaning up old backups..."

# Move old backups to archive
ARCHIVE_DIR="$BACKUP_DIR/archive"
mkdir -p "$ARCHIVE_DIR"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$ARCHIVE_DAYS -maxdepth 1 \
    -exec mv {} "$ARCHIVE_DIR/" \;

# Delete very old backups
find "$ARCHIVE_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Report backup status
CURRENT_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -maxdepth 1 | wc -l)
ARCHIVED_BACKUPS=$(find "$ARCHIVE_DIR" -name "*.sql.gz" | wc -l)

echo "Current backups: $CURRENT_BACKUPS"
echo "Archived backups: $ARCHIVED_BACKUPS"
echo "Backup cleanup completed"
```

## Maintenance Automation

### Cron Job Configuration
```bash
# /etc/crontab entries for automated maintenance

# Daily tasks
0 2 * * * root /path/to/scripts/backup-database.sh >> /var/log/maintenance.log 2>&1
0 3 * * * root /path/to/scripts/log-maintenance.sh >> /var/log/maintenance.log 2>&1
0 4 * * * root /path/to/scripts/security-monitor.sh >> /var/log/maintenance.log 2>&1
*/5 * * * * root /path/to/scripts/health-check.sh >> /var/log/health.log 2>&1

# Weekly tasks
0 9 * * 1 root /path/to/scripts/update-dependencies.sh >> /var/log/maintenance.log 2>&1
0 10 * * 2 root /path/to/scripts/weekly-security-audit.sh >> /var/log/maintenance.log 2>&1
0 14 * * 3 root /path/to/scripts/performance-monitor.sh >> /var/log/maintenance.log 2>&1
0 11 * * 4 root /path/to/scripts/verify-backups.sh >> /var/log/maintenance.log 2>&1

# Monthly tasks
0 2 1 * * root /path/to/scripts/monthly-db-maintenance.sh >> /var/log/maintenance.log 2>&1
0 3 1 * * root /path/to/scripts/cleanup-backups.sh >> /var/log/maintenance.log 2>&1
```

### Systemd Service for Monitoring
```ini
# /etc/systemd/system/tarkov-casino-monitor.service
[Unit]
Description=Tarkov Casino Monitoring Service
After=network.target

[Service]
Type=simple
User=monitor
Group=monitor
ExecStart=/path/to/scripts/continuous-monitor.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

## Maintenance Checklists

### Pre-Maintenance Checklist
- [ ] Notify stakeholders of maintenance window
- [ ] Create database backup
- [ ] Verify backup integrity
- [ ] Check system resources
- [ ] Review recent error logs
- [ ] Prepare rollback plan
- [ ] Test maintenance procedures in staging

### Post-Maintenance Checklist
- [ ] Verify all services are running
- [ ] Run deployment verification script
- [ ] Check application logs for errors
- [ ] Monitor system performance
- [ ] Verify database connectivity
- [ ] Test critical user workflows
- [ ] Update maintenance documentation
- [ ] Notify stakeholders of completion

### Emergency Maintenance Checklist
- [ ] Assess severity and impact
- [ ] Notify emergency contacts
- [ ] Create emergency backup
- [ ] Document issue and steps taken
- [ ] Implement fix or rollback
- [ ] Verify system stability
- [ ] Conduct post-incident review
- [ ] Update procedures based on lessons learned

## Maintenance Tools

### Required Tools
- `curl` - API testing and health checks
- `jq` - JSON processing
- `psql` - Database operations
- `docker` - Container management
- `systemctl` - Service management
- `cron` - Task scheduling
- `logrotate` - Log management

### Monitoring Tools
- System monitoring: `htop`, `iotop`, `nethogs`
- Database monitoring: `pg_stat_statements`, `pg_stat_activity`
- Application monitoring: Custom health endpoints
- Log analysis: `grep`, `awk`, `sed`

### Backup Tools
- Database: `pg_dump`, `pg_restore`
- Files: `rsync`, `tar`
- Cloud storage: `aws cli`, `gsutil`
- Compression: `gzip`, `bzip2`

## Contact Information

### Maintenance Team
- **Primary**: maintenance@example.com
- **Database**: dba@example.com
- **Security**: security@example.com
- **Emergency**: +1-555-0123

### Escalation Procedures
1. **Level 1** (0-1 hour): On-call engineer
2. **Level 2** (1-4 hours): Senior team lead
3. **Level 3** (4+ hours): Management and external support

---

**Important**: This maintenance documentation should be reviewed and updated regularly. All maintenance procedures should be tested in a staging environment before production use.