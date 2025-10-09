/**
 * Audit Service
 * Handles audit logging for security and compliance
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, AuditLog } from '../config/collections';
import { ID } from 'node-appwrite';

export class AuditService {
  /**
   * Log a general audit event
   */
  static async logEvent(
    action: string,
    resourceType: string,
    options: {
      userId?: string;
      resourceId?: string;
      oldValues?: any;
      newValues?: any;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      errorMessage?: string;
      metadata?: any;
    } = {}
  ): Promise<{ success: boolean; logId?: string; error?: string }> {
    // Combine all extra fields into a single details JSON field
    const details: any = {};
    if (options.resourceId) details.resourceId = options.resourceId;
    if (options.oldValues) details.oldValues = options.oldValues;
    if (options.newValues) details.newValues = options.newValues;
    if (options.ipAddress) details.ipAddress = options.ipAddress;
    if (options.userAgent) details.userAgent = options.userAgent;
    if (options.errorMessage) details.errorMessage = options.errorMessage;
    if (options.metadata) details.metadata = options.metadata;

    const logData: Omit<AuditLog, '$id'> = {
      userId: options.userId,
      action,
      resourceType,
      timestamp: new Date().toISOString(),
      success: options.success !== undefined ? options.success : true,
      details: Object.keys(details).length > 0 ? JSON.stringify(details) : undefined,
    };

    const { data, error } = await appwriteDb.createDocument<AuditLog>(
      COLLECTION_IDS.AUDIT_LOGS,
      logData,
      ID.unique()
      // No permissions - server-side only, accessed via API key
    );

    if (error) {
      console.error('Failed to create audit log:', error);
      return { success: false, error };
    }

    return { success: true, logId: data!.$id };
  }

  /**
   * Log game play event
   */
  static async logGamePlay(
    userId: string,
    gameType: string,
    betAmount: number,
    winAmount: number,
    ipAddress?: string
  ) {
    return await this.logEvent('game_play', 'game', {
      userId,
      metadata: {
        gameType,
        betAmount,
        winAmount,
        netResult: winAmount - betAmount,
      },
      ipAddress,
      success: true,
    });
  }

  /**
   * Log game start event
   */
  static async gamePlayStarted(
    userId: string,
    gameType: string,
    betAmount: number,
    ipAddress?: string
  ) {
    return await this.logEvent('game_start', 'game', {
      userId,
      metadata: { gameType, betAmount },
      ipAddress,
    });
  }

  /**
   * Log game completion event
   */
  static async gameCompleted(
    userId: string,
    gameType: string,
    betAmount: number,
    winAmount: number,
    ipAddress?: string
  ) {
    return await this.logEvent('game_complete', 'game', {
      userId,
      metadata: {
        gameType,
        betAmount,
        winAmount,
        netResult: winAmount - betAmount,
      },
      ipAddress,
    });
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    action: string,
    userId?: string,
    metadata?: any,
    ipAddress?: string,
    success: boolean = true
  ) {
    return await this.logEvent(action, 'security', {
      userId,
      metadata,
      ipAddress,
      success,
    });
  }

  /**
   * Log authentication event
   */
  static async logAuthEvent(
    action: 'login' | 'logout' | 'register' | 'failed_login',
    userId?: string,
    ipAddress?: string,
    success: boolean = true,
    errorMessage?: string
  ) {
    return await this.logEvent(action, 'auth', {
      userId,
      ipAddress,
      success,
      errorMessage,
    });
  }

  /**
   * Log resource change
   */
  static async logResourceChange(
    userId: string,
    resourceType: string,
    resourceId: string,
    oldValues: any,
    newValues: any,
    action: 'create' | 'update' | 'delete' = 'update'
  ) {
    return await this.logEvent(action, resourceType, {
      userId,
      resourceId,
      oldValues,
      newValues,
    });
  }

  /**
   * Get audit logs for a user
   */
  static async getUserLogs(
    userId: string,
    options: { limit?: number; offset?: number; resourceType?: string } = {}
  ) {
    const queries = [appwriteDb.equal('userId', userId), appwriteDb.orderDesc('timestamp')];

    if (options.resourceType) {
      queries.push(appwriteDb.equal('resourceType', options.resourceType));
    }

    if (options.limit) {
      queries.push(appwriteDb.limit(options.limit));
    }

    if (options.offset) {
      queries.push(appwriteDb.offset(options.offset));
    }

    const { data, total, error } = await appwriteDb.listDocuments<AuditLog>(
      COLLECTION_IDS.AUDIT_LOGS,
      queries
    );

    if (error) {
      return { success: false, logs: [], total: 0, error };
    }

    // Parse details JSON
    const logs = data.map(log => {
      const details = log.details ? JSON.parse(log.details) : {};
      return {
        ...log,
        ...details, // Spread details back to root level
      };
    });

    return { success: true, logs, total };
  }

  /**
   * Get recent audit logs (admin)
   */
  static async getRecentLogs(limit: number = 100) {
    const { data, error } = await appwriteDb.listDocuments<AuditLog>(
      COLLECTION_IDS.AUDIT_LOGS,
      [appwriteDb.orderDesc('timestamp'), appwriteDb.limit(limit)]
    );

    if (error) {
      return { success: false, logs: [], error };
    }

    const logs = data.map(log => {
      const details = log.details ? JSON.parse(log.details) : {};
      return {
        ...log,
        ...details, // Spread details back to root level
      };
    });

    return { success: true, logs };
  }
}

