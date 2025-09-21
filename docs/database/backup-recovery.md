# Database Backup and Recovery Procedures

## Overview

This document outlines the backup and recovery procedures for the Tarkov Casino database. The system uses Supabase (PostgreSQL) for data storage, requiring specific procedures for data protection and disaster recovery.

## Backup Strategy

### Backup Types

#### 1. Automated Daily Backups (Supabase)
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 7 days for free tier, 30 days for paid plans
- **Location**: Supabase managed storage
- **Coverage**: Full database including schema and data
- **Automatic**: Managed by Supabase platform

#### 2. Manual Backups
- **Frequency**: Before major deployments or schema changes
- **Retention**: Stored locally and in cloud storage
- **Coverage**: Full database dump with schema
- **Control**: Manual execution via scripts

#### 3. Point-in-Time Recovery (PITR)
- **Availability**: Supabase Pro plans and above
- **Granularity**: Up to the second
- **Retention**: 7-30 days depending on plan
- **Use Case**: Recovery from specific point in time

### Backup Components

#### Core Data Tables
- `auth.users` - User authentication data
- `public.user_profiles` - User profile information
- `public.game_history` - Complete game transaction history
- `public.user_statistics` - Aggregated user statistics
- `public.audit_logs` - System audit trail

#### Configuration Data
- Database schema and structure
- Row Level Security (RLS) policies
- Database functions and triggers
- Indexes and constraints

## Backup Procedures

### 1. Automated Supabase Backups

Supabase automatically handles daily backups. To verify backup status:

```bash
# Check backup status via Supabase CLI
supabase db dump --db-url "$SUPABASE_DB_URL" --data-only --file backup-check.sql

# Verify backup file
ls -la backup-check.sql
```

### 2. Manual Database Backup

#### Full Database Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="/backups/tarkov-casino"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="tarkov_casino_backup_${DATE}.sql"
SUPABASE_DB_URL="${SUPABASE_DB_URL}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup at $(date)"

# Create full database dump
pg_dump "$SUPABASE_DB_URL" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  --file="$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "Backup completed: $BACKUP_DIR/${BACKUP_FILE}.gz"

# Upload to cloud storage (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gz" "s3://$AWS_S3_BUCKET/backups/"
  echo "Backup uploaded to S3"
fi

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "tarkov_casino_backup_*.sql.gz" -mtime +30 -delete

echo "Backup process completed at $(date)"
```

#### Schema-Only Backup

```bash
#!/bin/bash
# scripts/backup-schema.sh

set -e

BACKUP_DIR="/backups/tarkov-casino/schema"
DATE=$(date +%Y%m%d_%H%M%S)
SCHEMA_FILE="tarkov_casino_schema_${DATE}.sql"

mkdir -p "$BACKUP_DIR"

# Backup schema only
pg_dump "$SUPABASE_DB_URL" \
  --schema-only \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --file="$BACKUP_DIR/$SCHEMA_FILE"

gzip "$BACKUP_DIR/$SCHEMA_FILE"
echo "Schema backup completed: $BACKUP_DIR/${SCHEMA_FILE}.gz"
```

#### Data-Only Backup

```bash
#!/bin/bash
# scripts/backup-data.sh

set -e

BACKUP_DIR="/backups/tarkov-casino/data"
DATE=$(date +%Y%m%d_%H%M%S)
DATA_FILE="tarkov_casino_data_${DATE}.sql"

mkdir -p "$BACKUP_DIR"

# Backup data only
pg_dump "$SUPABASE_DB_URL" \
  --data-only \
  --verbose \
  --disable-triggers \
  --file="$BACKUP_DIR/$DATA_FILE"

gzip "$BACKUP_DIR/$DATA_FILE"
echo "Data backup completed: $BACKUP_DIR/${DATA_FILE}.gz"
```

### 3. Automated Backup Scheduling

#### Cron Job Setup

```bash
# Add to crontab (crontab -e)

# Daily full backup at 2:00 AM
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/tarkov-casino-backup.log 2>&1

# Weekly schema backup on Sundays at 1:00 AM
0 1 * * 0 /path/to/scripts/backup-schema.sh >> /var/log/tarkov-casino-backup.log 2>&1

# Hourly data backup during business hours (9 AM - 6 PM)
0 9-18 * * * /path/to/scripts/backup-data.sh >> /var/log/tarkov-casino-backup.log 2>&1
```

#### GitHub Actions Backup

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:     # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup PostgreSQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Create database backup
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          DATE=$(date +%Y%m%d_%H%M%S)
          BACKUP_FILE="tarkov_casino_backup_${DATE}.sql"
          
          pg_dump "$SUPABASE_DB_URL" \
            --verbose \
            --clean \
            --if-exists \
            --create \
            --file="$BACKUP_FILE"
          
          gzip "$BACKUP_FILE"

      - name: Upload to artifact storage
        uses: actions/upload-artifact@v3
        with:
          name: database-backup-${{ github.run_id }}
          path: "*.sql.gz"
          retention-days: 30
```

## Recovery Procedures

### 1. Full Database Recovery

#### From Supabase Backup

```bash
#!/bin/bash
# scripts/restore-from-supabase.sh

set -e

echo "WARNING: This will replace the current database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Recovery cancelled"
  exit 1
fi

# Use Supabase dashboard or CLI to restore from backup
# This is typically done through the Supabase web interface
echo "Please use the Supabase dashboard to restore from backup"
echo "1. Go to Settings > Database"
echo "2. Select 'Backups' tab"
echo "3. Choose backup date and click 'Restore'"
```

#### From Manual Backup

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
TEMP_FILE="/tmp/restore_$(date +%s).sql"

echo "WARNING: This will replace the current database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Recovery cancelled"
  exit 1
fi

# Extract backup file
echo "Extracting backup file..."
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

# Restore database
echo "Restoring database from $BACKUP_FILE..."
psql "$SUPABASE_DB_URL" < "$TEMP_FILE"

# Clean up
rm "$TEMP_FILE"

echo "Database restoration completed"
```

### 2. Point-in-Time Recovery

```bash
#!/bin/bash
# scripts/pitr-recovery.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <timestamp> (format: YYYY-MM-DD HH:MM:SS)"
  exit 1
fi

RECOVERY_TIME="$1"

echo "WARNING: This will restore database to $RECOVERY_TIME"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Recovery cancelled"
  exit 1
fi

# Point-in-time recovery via Supabase CLI (if available)
# This feature requires Supabase Pro plan
echo "Initiating point-in-time recovery to $RECOVERY_TIME"
echo "This must be done through Supabase dashboard:"
echo "1. Go to Settings > Database"
echo "2. Select 'Point in Time Recovery'"
echo "3. Enter timestamp: $RECOVERY_TIME"
echo "4. Confirm recovery"
```

### 3. Partial Data Recovery

#### Recover Specific Tables

```bash
#!/bin/bash
# scripts/restore-table.sh

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <backup_file.sql.gz> <table_name>"
  exit 1
fi

BACKUP_FILE="$1"
TABLE_NAME="$2"
TEMP_FILE="/tmp/table_restore_$(date +%s).sql"

# Extract and filter for specific table
echo "Extracting $TABLE_NAME from backup..."
gunzip -c "$BACKUP_FILE" | grep -A 10000 "CREATE TABLE.*$TABLE_NAME" | grep -B 10000 "^--$" > "$TEMP_FILE"

# Restore specific table
echo "Restoring table $TABLE_NAME..."
psql "$SUPABASE_DB_URL" < "$TEMP_FILE"

rm "$TEMP_FILE"
echo "Table $TABLE_NAME restored successfully"
```

#### Recover User Data

```sql
-- scripts/recover-user-data.sql
-- Recover specific user's data from backup

BEGIN;

-- Create temporary table from backup data
CREATE TEMP TABLE temp_user_profiles AS 
SELECT * FROM user_profiles WHERE user_id = 'USER_ID_HERE';

CREATE TEMP TABLE temp_game_history AS 
SELECT * FROM game_history WHERE user_id = 'USER_ID_HERE';

-- Restore user profile
INSERT INTO user_profiles 
SELECT * FROM temp_user_profiles
ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  balance = EXCLUDED.balance,
  updated_at = EXCLUDED.updated_at;

-- Restore game history
INSERT INTO game_history 
SELECT * FROM temp_game_history
ON CONFLICT (id) DO NOTHING;

COMMIT;
```

## Disaster Recovery Plan

### 1. Complete System Failure

#### Recovery Steps
1. **Assess Damage**: Determine extent of data loss
2. **Notify Stakeholders**: Inform team and users of outage
3. **Provision New Infrastructure**: Set up new Supabase project if needed
4. **Restore from Latest Backup**: Use most recent full backup
5. **Verify Data Integrity**: Run data validation checks
6. **Resume Operations**: Bring system back online
7. **Post-Incident Review**: Document lessons learned

#### Recovery Time Objectives (RTO)
- **Critical Systems**: 4 hours maximum downtime
- **Full Functionality**: 8 hours maximum downtime
- **Complete Recovery**: 24 hours maximum

#### Recovery Point Objectives (RPO)
- **Maximum Data Loss**: 1 hour (with PITR)
- **Standard Data Loss**: 24 hours (daily backups)

### 2. Partial Data Loss

#### User Data Recovery
```bash
# Recover specific user's data
./scripts/restore-table.sh backup_file.sql.gz user_profiles
./scripts/restore-table.sh backup_file.sql.gz game_history
```

#### Game History Recovery
```sql
-- Recover game history for specific date range
COPY game_history FROM '/path/to/backup/game_history.csv' 
WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';
```

## Monitoring and Validation

### 1. Backup Monitoring

#### Health Check Script
```bash
#!/bin/bash
# scripts/check-backup-health.sh

BACKUP_DIR="/backups/tarkov-casino"
ALERT_EMAIL="admin@example.com"

# Check if daily backup exists
TODAY=$(date +%Y%m%d)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*${TODAY}*.sql.gz" | wc -l)

if [ "$BACKUP_COUNT" -eq 0 ]; then
  echo "ERROR: No backup found for today ($TODAY)" | mail -s "Backup Alert" "$ALERT_EMAIL"
  exit 1
fi

# Check backup file size (should be > 1MB)
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
BACKUP_SIZE=$(stat -c%s "$LATEST_BACKUP")

if [ "$BACKUP_SIZE" -lt 1048576 ]; then
  echo "WARNING: Backup file seems too small ($BACKUP_SIZE bytes)" | mail -s "Backup Size Alert" "$ALERT_EMAIL"
fi

echo "Backup health check passed"
```

### 2. Recovery Testing

#### Monthly Recovery Test
```bash
#!/bin/bash
# scripts/test-recovery.sh

set -e

TEST_DB_URL="postgresql://test_user:test_pass@localhost:5432/test_recovery_db"
LATEST_BACKUP=$(find /backups/tarkov-casino -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

echo "Testing recovery with backup: $LATEST_BACKUP"

# Create test database
createdb -h localhost -U test_user test_recovery_db

# Restore backup to test database
gunzip -c "$LATEST_BACKUP" | psql "$TEST_DB_URL"

# Run validation queries
psql "$TEST_DB_URL" -c "SELECT COUNT(*) FROM user_profiles;"
psql "$TEST_DB_URL" -c "SELECT COUNT(*) FROM game_history;"
psql "$TEST_DB_URL" -c "SELECT MAX(created_at) FROM game_history;"

# Clean up test database
dropdb -h localhost -U test_user test_recovery_db

echo "Recovery test completed successfully"
```

## Security Considerations

### 1. Backup Encryption

```bash
# Encrypt backup files
gpg --symmetric --cipher-algo AES256 backup_file.sql.gz

# Decrypt backup files
gpg --decrypt backup_file.sql.gz.gpg > backup_file.sql.gz
```

### 2. Access Control

- Backup files stored with restricted permissions (600)
- Cloud storage with proper IAM policies
- Encrypted transmission for remote backups
- Audit logging for backup access

### 3. Data Privacy

- Personal data anonymization in development backups
- Compliance with data retention policies
- Secure deletion of old backups
- GDPR compliance for EU user data

## Troubleshooting

### Common Issues

#### 1. Backup File Corruption
```bash
# Test backup file integrity
gunzip -t backup_file.sql.gz

# If corrupted, try previous backup
find /backups -name "*.sql.gz" -mtime -7 | sort -r
```

#### 2. Insufficient Disk Space
```bash
# Check disk space
df -h /backups

# Clean old backups
find /backups -name "*.sql.gz" -mtime +30 -delete
```

#### 3. Connection Issues
```bash
# Test database connection
pg_isready -d "$SUPABASE_DB_URL"

# Test with timeout
timeout 30 psql "$SUPABASE_DB_URL" -c "SELECT 1;"
```

## Contact Information

### Emergency Contacts
- **Database Administrator**: dba@example.com
- **System Administrator**: sysadmin@example.com
- **On-Call Engineer**: +1-555-0123

### Escalation Procedures
1. **Level 1**: Development team (0-2 hours)
2. **Level 2**: Senior engineers (2-4 hours)
3. **Level 3**: External consultants (4+ hours)

---

**Important**: Regularly test backup and recovery procedures to ensure they work when needed. Update this documentation as procedures change.