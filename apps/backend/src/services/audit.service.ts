import { db } from '../db/index.js';
import { auditLogs } from '@allinbox/db';
import { Request } from 'express';

export interface AuditLogEntry {
    tenantId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditService {
    /**
     * Log an admin action for audit trail
     */
    static async log(entry: AuditLogEntry): Promise<void> {
        await db.insert(auditLogs).values({
            tenantId: entry.tenantId || null,
            action: entry.action,
            entityType: entry.entityType || null,
            entityId: entry.entityId || null,
            details: entry.details || null,
            ipAddress: entry.ipAddress || null,
            userAgent: entry.userAgent || null,
        });
    }

    /**
     * Extract request metadata for audit logging
     */
    static getRequestMeta(req: Request): { ipAddress: string; userAgent: string } {
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        return { ipAddress, userAgent };
    }

    /**
     * Log a tenant status change action
     */
    static async logTenantStatusChange(
        adminId: string,
        targetTenantId: string,
        newStatus: string,
        req: Request
    ): Promise<void> {
        const meta = this.getRequestMeta(req);
        await this.log({
            tenantId: adminId,
            action: 'TENANT_STATUS_CHANGE',
            entityType: 'tenant',
            entityId: targetTenantId,
            details: { newStatus },
            ...meta,
        });
    }

    /**
     * Log a tenant promotion action
     */
    static async logTenantPromotion(
        adminId: string,
        targetTenantId: string,
        req: Request
    ): Promise<void> {
        const meta = this.getRequestMeta(req);
        await this.log({
            tenantId: adminId,
            action: 'TENANT_PROMOTION',
            entityType: 'tenant',
            entityId: targetTenantId,
            details: { newPlan: 'PAID' },
            ...meta,
        });
    }

    /**
     * Log a trial extension action
     */
    static async logTrialExtension(
        adminId: string,
        targetTenantId: string,
        days: number,
        req: Request
    ): Promise<void> {
        const meta = this.getRequestMeta(req);
        await this.log({
            tenantId: adminId,
            action: 'TRIAL_EXTENSION',
            entityType: 'tenant',
            entityId: targetTenantId,
            details: { daysExtended: days },
            ...meta,
        });
    }

    /**
     * Log a system setting change
     */
    static async logSettingChange(
        adminId: string,
        settingKey: string,
        req: Request
    ): Promise<void> {
        const meta = this.getRequestMeta(req);
        await this.log({
            tenantId: adminId,
            action: 'SYSTEM_SETTING_CHANGE',
            entityType: 'system_setting',
            entityId: settingKey,
            details: { key: settingKey },  // Don't log actual value for security
            ...meta,
        });
    }

    /**
     * Log a backend error for debugging
     */
    static async logBackendError(
        action: string,
        error: any,
        req?: Request
    ): Promise<void> {
        const meta = req ? this.getRequestMeta(req) : {};
        await this.log({
            action: `ERROR_${action}`,
            details: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            ...meta,
        });
    }
}
