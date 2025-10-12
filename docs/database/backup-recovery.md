# Appwrite Backup and Recovery Procedures

## Overview

This document outlines backup and recovery procedures for Appwrite-based applications. Appwrite provides automatic backups for Cloud users and manual backup options for self-hosted deployments.

---

## Appwrite Cloud Backups

### Automatic Backups

**Appwrite Cloud** provides automatic backups:

- **Frequency**: Continuous automatic backups
- **Retention**: 
  - Free tier: 7 days
  - Pro tier: 30 days
  - Scale tier: 90 days
- **Coverage**: Complete database, storage, and configuration
- **Point-in-Time Recovery**: Available on Pro tier and above

### Accessing Backups

1. **Via Appwrite Console:**
   - Navigate to your project dashboard
   - Go to Settings → Backups
   - View available backup points
   - Restore with one click

2. **Automated**: Appwrite handles all backup operations automatically

---

## Self-Hosted Appwrite Backups

### Docker Volume Backups

For self-hosted Appwrite, backup the Docker volumes:

```bash
#!/bin/bash
# scripts/backup-appwrite.sh

set -e

BACKUP_DIR="/backups/appwrite"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="appwrite_backup_${DATE}"

mkdir -p "$BACKUP_DIR"

echo "Starting Appwrite backup at $(date)"

# Stop Appwrite (optional, for consistency)
# docker-compose -f /path/to/appwrite/docker-compose.yml stop

# Backup volumes
docker run --rm \
  -v appwrite-mariadb:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  tar czf "/backup/${BACKUP_NAME}_mariadb.tar.gz" /data

docker run --rm \
  -v appwrite-redis:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  tar czf "/backup/${BACKUP_NAME}_redis.tar.gz" /data

docker run --rm \
  -v appwrite-storage:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  tar czf "/backup/${BACKUP_NAME}_storage.tar.gz" /data

# Restart Appwrite
# docker-compose -f /path/to/appwrite/docker-compose.yml start

echo "Backup completed: $BACKUP_DIR/${BACKUP_NAME}_*.tar.gz"

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -name "appwrite_backup_*.tar.gz" -mtime +30 -delete
```

### Database Export via API

```typescript
// Export data via Appwrite API
import { Databases, Query } from 'node-appwrite';

async function exportDatabase() {
  const databases = new Databases(client);
  
  // Export all tables
  const tables = ['user_profiles', 'game_history', 'transactions'];
  
  for (const tableId of tables) {
    const allRows = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await databases.listRows({
        databaseId: 'tarkov_casino',
        tableId,
        queries: [
          Query.limit(limit),
          Query.offset(offset)
        ]
      });
      
      allRows.push(...response.rows);
      
      if (response.rows.length < limit) break;
      offset += limit;
    }
    
    // Save to file
    await Bun.write(
      `backup_${tableId}_${Date.now()}.json`,
      JSON.stringify(allRows, null, 2)
    );
  }
  
  console.log('Database export completed');
}
```

---

## Application-Level Backups

### Game Data Export

```typescript
// packages/backend/src/scripts/export-game-data.ts
import { databases } from '@/config/appwrite';
import { Query } from 'node-appwrite';

async function exportGameHistory(userId?: string) {
  const queries = userId 
    ? [Query.equal('user_id', userId)]
    : [Query.limit(10000)];
  
  const history = await databases.listRows({
    databaseId: 'tarkov_casino',
    tableId: 'game_history',
    queries
  });
  
  // Save to JSON
  const filename = `game_history_${Date.now()}.json`;
  await Bun.write(filename, JSON.stringify(history.rows, null, 2));
  
  console.log(`Exported ${history.total} games to ${filename}`);
  return filename;
}
```

### User Data Export (GDPR Compliance)

```typescript
// Export all user data for GDPR compliance
async function exportUserData(userId: string) {
  const databases = new Databases(client);
  
  const userData = {
    // User profile
    profile: await databases.getRow({
      databaseId: 'tarkov_casino',
      tableId: 'user_profiles',
      rowId: userId
    }),
    
    // Game history
    gameHistory: await databases.listRows({
      databaseId: 'tarkov_casino',
      tableId: 'game_history',
      queries: [Query.equal('user_id', userId)]
    }),
    
    // Transactions
    transactions: await databases.listRows({
      databaseId: 'tarkov_casino',
      tableId: 'transactions',
      queries: [Query.equal('user_id', userId)]
    })
  };
  
  const filename = `user_data_${userId}_${Date.now()}.json`;
  await Bun.write(filename, JSON.stringify(userData, null, 2));
  
  return filename;
}
```

---

## Recovery Procedures

### Appwrite Cloud Recovery

1. **Via Console:**
   - Go to Settings → Backups
   - Select restore point
   - Click "Restore"
   - Confirm restoration

2. **Recovery Time:** Typically 5-15 minutes depending on data size

3. **Impact:** Service will be temporarily unavailable during restoration

### Self-Hosted Recovery

```bash
#!/bin/bash
# scripts/restore-appwrite.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_prefix>"
  echo "Example: $0 appwrite_backup_20251012_120000"
  exit 1
fi

BACKUP_PREFIX="$1"
BACKUP_DIR="/backups/appwrite"

echo "WARNING: This will replace current Appwrite data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Recovery cancelled"
  exit 1
fi

# Stop Appwrite
docker-compose -f /path/to/appwrite/docker-compose.yml stop

# Restore volumes
docker run --rm \
  -v appwrite-mariadb:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/${BACKUP_PREFIX}_mariadb.tar.gz -C /"

docker run --rm \
  -v appwrite-redis:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/${BACKUP_PREFIX}_redis.tar.gz -C /"

docker run --rm \
  -v appwrite-storage:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/${BACKUP_PREFIX}_storage.tar.gz -C /"

# Start Appwrite
docker-compose -f /path/to/appwrite/docker-compose.yml start

echo "Recovery completed. Please verify data integrity."
```

### Import Data from JSON Backup

```typescript
// Restore data from JSON export
async function importGameHistory(filename: string) {
  const data = await Bun.file(filename).json();
  const databases = new Databases(client);
  
  // Use bulk import (max 1000 per batch)
  const batches = [];
  for (let i = 0; i < data.length; i += 1000) {
    batches.push(data.slice(i, i + 1000));
  }
  
  for (const batch of batches) {
    await databases.createRows({
      databaseId: 'tarkov_casino',
      tableId: 'game_history',
      rows: batch.map(row => ({
        data: row,
        permissions: [Permission.read(Role.user(row.user_id))]
      }))
    });
  }
  
  console.log(`Imported ${data.length} game history records`);
}
```

---

## Disaster Recovery Plan

### Recovery Objectives

- **RTO (Recovery Time Objective):** 4 hours maximum
- **RPO (Recovery Point Objective):** 1 hour maximum (with Appwrite Cloud)

### Recovery Steps

1. **Assessment** (15 minutes)
   - Determine extent of data loss
   - Identify affected services
   - Notify stakeholders

2. **Restore from Backup** (1-2 hours)
   - Select appropriate backup point
   - Initiate restore via Appwrite Console
   - Monitor restoration progress

3. **Verification** (30 minutes)
   - Test database connectivity
   - Verify data integrity
   - Check user authentication
   - Test critical workflows

4. **Resume Operations** (30 minutes)
   - Bring services back online
   - Monitor for issues
   - Communicate with users

5. **Post-Incident** (1-2 hours)
   - Document incident
   - Review procedures
   - Implement improvements

---

## Data Retention Policies

### Game History
- **Active Games**: Keep indefinitely
- **Old Games**: Archive after 1 year to separate table
- **Deleted Games**: Soft delete for 30 days, then hard delete

### User Data
- **Active Users**: Keep indefinitely
- **Inactive Users**: Notify after 6 months of inactivity
- **Deleted Accounts**: Soft delete for 30 days (GDPR), then anonymize

### Chat Messages
- **Recent Messages**: Keep for 30 days
- **Archived Messages**: Delete after 30 days
- **Moderated Messages**: Keep deletion log for 90 days

---

## Monitoring and Validation

### Backup Health Monitoring

```typescript
// Check Appwrite backup status
async function checkBackupHealth() {
  // Appwrite Cloud: automatic backups
  // Check via Console or API
  
  // Self-hosted: check volume sizes
  const volumes = [
    'appwrite-mariadb',
    'appwrite-redis',
    'appwrite-storage'
  ];
  
  for (const volume of volumes) {
    // Check volume exists and size
    console.log(`Checking volume: ${volume}`);
    // Implementation depends on Docker setup
  }
}
```

### Data Integrity Checks

```typescript
// Verify database integrity
async function verifyDataIntegrity() {
  const databases = new Databases(client);
  
  // Check row counts
  const tables = ['user_profiles', 'game_history', 'transactions'];
  
  for (const tableId of tables) {
    const result = await databases.listRows({
      databaseId: 'tarkov_casino',
      tableId,
      queries: [Query.limit(1)]
    });
    
    console.log(`${tableId}: ${result.total} rows`);
  }
  
  // Check for orphaned data
  const games = await databases.listRows({
    databaseId: 'tarkov_casino',
    tableId: 'game_history',
    queries: [Query.limit(100)]
  });
  
  for (const game of games.rows) {
    try {
      await databases.getRow({
        databaseId: 'tarkov_casino',
        tableId: 'user_profiles',
        rowId: game.user_id
      });
    } catch (error) {
      console.warn(`Orphaned game record: ${game.$id}`);
    }
  }
}
```

---

## Best Practices

### ✅ Do's

1. **Regular Testing**: Test recovery procedures monthly
2. **Multiple Locations**: Store backups in multiple locations
3. **Encryption**: Encrypt sensitive backup data
4. **Documentation**: Keep recovery procedures updated
5. **Monitoring**: Monitor backup completion and size

### ❌ Don'ts

1. **Don't** rely solely on automatic backups
2. **Don't** skip backup verification
3. **Don't** ignore backup size anomalies
4. **Don't** store backups only in one location
5. **Don't** neglect disaster recovery testing

---

## Appwrite-Specific Features

### Automatic Backups (Cloud)

Appwrite Cloud includes:
- ✅ Automatic continuous backups
- ✅ Point-in-time recovery
- ✅ Geographic redundancy
- ✅ Encryption at rest
- ✅ One-click restoration

### Manual Exports

```bash
# Export database via Appwrite CLI
appwrite databases list --databaseId tarkov_casino

# Export specific table
appwrite databases listRows \
  --databaseId tarkov_casino \
  --tableId user_profiles \
  --limit 9999 \
  > user_profiles_export.json
```

---

## Emergency Contacts

### Disaster Recovery Team
- **Primary**: recovery@example.com
- **Database Admin**: dba@example.com
- **Appwrite Support**: support@appwrite.io (Cloud users)
- **Emergency**: +1-555-0123

### Escalation Procedures
1. **Level 1** (0-1 hour): On-call engineer
2. **Level 2** (1-4 hours): Senior team + Appwrite support
3. **Level 3** (4+ hours): Management + external consultants

---

## Resources

### Appwrite Documentation
- [Appwrite Backups (Cloud)](https://appwrite.io/docs/advanced/security/backups)
- [Appwrite Self-Hosting Backups](https://appwrite.io/docs/advanced/self-hosting/production/backups)
- [Database Best Practices](https://appwrite.io/docs/products/databases)

### Internal Documentation
- [Appwrite Integration Guide](../backend/appwrite-README.md)
- [Database Setup Guide](../backend/database-README.md)
- [Deployment Guide](../deployment/deployment.md)

---

**Last Updated:** 2025-10-12  
**Appwrite Version:** 18.0+  
**Status:** Production Ready ✅

> **Note**: Appwrite Cloud provides enterprise-grade automatic backups. For self-hosted deployments, implement the backup scripts provided above and test recovery procedures regularly.
