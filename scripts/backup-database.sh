#!/bin/bash
# Database backup script for Tarkov Casino

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/tarkov-casino}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="tarkov_casino_backup_${DATE}.sql"
SUPABASE_DB_URL="${SUPABASE_DB_URL}"
LOG_FILE="${LOG_FILE:-/var/log/tarkov-casino-backup.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error_exit "pg_dump is not installed or not in PATH"
    fi
    
    # Check if database URL is set
    if [ -z "$SUPABASE_DB_URL" ]; then
        error_exit "SUPABASE_DB_URL environment variable is not set"
    fi
    
    # Test database connection
    if ! pg_isready -d "$SUPABASE_DB_URL" -t 10; then
        error_exit "Cannot connect to database"
    fi
    
    log "${GREEN}Prerequisites check passed${NC}"
}

# Create backup directory
create_backup_dir() {
    log "${YELLOW}Creating backup directory...${NC}"
    
    if ! mkdir -p "$BACKUP_DIR"; then
        error_exit "Failed to create backup directory: $BACKUP_DIR"
    fi
    
    # Check disk space (require at least 1GB free)
    AVAILABLE_SPACE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=1048576  # 1GB in KB
    
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        error_exit "Insufficient disk space. Available: ${AVAILABLE_SPACE}KB, Required: ${REQUIRED_SPACE}KB"
    fi
    
    log "${GREEN}Backup directory ready: $BACKUP_DIR${NC}"
}

# Perform database backup
perform_backup() {
    log "${YELLOW}Starting database backup...${NC}"
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    local start_time=$(date +%s)
    
    # Create database dump with verbose output
    if pg_dump "$SUPABASE_DB_URL" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --no-password \
        --file="$backup_path" 2>> "$LOG_FILE"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local file_size=$(stat -c%s "$backup_path" 2>/dev/null || echo "0")
        local file_size_mb=$((file_size / 1024 / 1024))
        
        log "${GREEN}Database backup completed successfully${NC}"
        log "Backup file: $backup_path"
        log "File size: ${file_size_mb}MB"
        log "Duration: ${duration}s"
        
        # Verify backup file is not empty
        if [ "$file_size" -lt 1024 ]; then
            error_exit "Backup file is too small (${file_size} bytes), backup may have failed"
        fi
        
    else
        error_exit "Database backup failed"
    fi
}

# Compress backup file
compress_backup() {
    log "${YELLOW}Compressing backup file...${NC}"
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    local compressed_path="${backup_path}.gz"
    
    if gzip "$backup_path"; then
        local compressed_size=$(stat -c%s "$compressed_path" 2>/dev/null || echo "0")
        local compressed_size_mb=$((compressed_size / 1024 / 1024))
        
        log "${GREEN}Backup compressed successfully${NC}"
        log "Compressed file: $compressed_path"
        log "Compressed size: ${compressed_size_mb}MB"
        
        # Update backup file variable to compressed version
        BACKUP_FILE="${BACKUP_FILE}.gz"
    else
        error_exit "Failed to compress backup file"
    fi
}

# Upload to cloud storage (optional)
upload_to_cloud() {
    if [ -n "$AWS_S3_BUCKET" ] && command -v aws &> /dev/null; then
        log "${YELLOW}Uploading backup to S3...${NC}"
        
        local backup_path="$BACKUP_DIR/$BACKUP_FILE"
        local s3_path="s3://$AWS_S3_BUCKET/backups/$(basename "$BACKUP_FILE")"
        
        if aws s3 cp "$backup_path" "$s3_path" --storage-class STANDARD_IA; then
            log "${GREEN}Backup uploaded to S3: $s3_path${NC}"
        else
            log "${RED}WARNING: Failed to upload backup to S3${NC}"
        fi
    elif [ -n "$GCS_BUCKET" ] && command -v gsutil &> /dev/null; then
        log "${YELLOW}Uploading backup to Google Cloud Storage...${NC}"
        
        local backup_path="$BACKUP_DIR/$BACKUP_FILE"
        local gcs_path="gs://$GCS_BUCKET/backups/$(basename "$BACKUP_FILE")"
        
        if gsutil cp "$backup_path" "$gcs_path"; then
            log "${GREEN}Backup uploaded to GCS: $gcs_path${NC}"
        else
            log "${RED}WARNING: Failed to upload backup to GCS${NC}"
        fi
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "${YELLOW}Cleaning up old backups...${NC}"
    
    local retention_days="${BACKUP_RETENTION_DAYS:-30}"
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm "$file"
        deleted_count=$((deleted_count + 1))
        log "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "tarkov_casino_backup_*.sql.gz" -mtime +$retention_days -print0 2>/dev/null)
    
    if [ "$deleted_count" -gt 0 ]; then
        log "${GREEN}Cleaned up $deleted_count old backup files${NC}"
    else
        log "No old backup files to clean up"
    fi
}

# Verify backup integrity
verify_backup() {
    log "${YELLOW}Verifying backup integrity...${NC}"
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    
    # Test gzip file integrity
    if gzip -t "$backup_path"; then
        log "${GREEN}Backup file integrity verified${NC}"
    else
        error_exit "Backup file is corrupted"
    fi
    
    # Test SQL content (basic check)
    if gunzip -c "$backup_path" | head -n 20 | grep -q "PostgreSQL database dump"; then
        log "${GREEN}Backup content verification passed${NC}"
    else
        log "${RED}WARNING: Backup content verification failed${NC}"
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
        local subject="Tarkov Casino Backup $status"
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
        log "Notification sent to $NOTIFICATION_EMAIL"
    fi
    
    if [ -n "$SLACK_WEBHOOK_URL" ] && command -v curl &> /dev/null; then
        local payload="{\"text\":\"Tarkov Casino Backup $status: $message\"}"
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" &>/dev/null
        log "Slack notification sent"
    fi
}

# Main execution
main() {
    log "${GREEN}=== Tarkov Casino Database Backup Started ===${NC}"
    
    # Trap errors and cleanup
    trap 'error_exit "Backup script interrupted"' INT TERM
    
    check_prerequisites
    create_backup_dir
    perform_backup
    compress_backup
    verify_backup
    upload_to_cloud
    cleanup_old_backups
    
    local final_backup_path="$BACKUP_DIR/$BACKUP_FILE"
    local final_size=$(stat -c%s "$final_backup_path" 2>/dev/null || echo "0")
    local final_size_mb=$((final_size / 1024 / 1024))
    
    local success_message="Backup completed successfully
File: $final_backup_path
Size: ${final_size_mb}MB
Time: $(date)"
    
    log "${GREEN}=== Backup Process Completed Successfully ===${NC}"
    log "$success_message"
    
    send_notification "SUCCESS" "$success_message"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_DB_URL          Database connection URL (required)"
    echo "  BACKUP_DIR               Backup directory (default: /backups/tarkov-casino)"
    echo "  BACKUP_RETENTION_DAYS    Days to keep backups (default: 30)"
    echo "  AWS_S3_BUCKET           S3 bucket for cloud backup (optional)"
    echo "  GCS_BUCKET              GCS bucket for cloud backup (optional)"
    echo "  NOTIFICATION_EMAIL      Email for notifications (optional)"
    echo "  SLACK_WEBHOOK_URL       Slack webhook for notifications (optional)"
    echo "  LOG_FILE                Log file path (default: /var/log/tarkov-casino-backup.log)"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -v, --verbose           Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0                      Run backup with default settings"
    echo "  BACKUP_DIR=/tmp/backup $0  Run backup to custom directory"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"