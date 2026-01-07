/**
 * Email Service (STUB - Backlog)
 * 
 * TODO: Implement when SMTP server details are available
 * For now, logs email notifications to console
 */

export interface EmailNotification {
    to: string[];
    subject: string;
    body: string;
    auditLogId?: string;
}

export class EmailService {
    /**
     * TODO: Send deletion notification email
     * Currently logs to console only
     */
    async sendDeletionNotification(params: {
        deletedBy: string;
        deletedByEmail: string;
        resourceType: string;
        resourceName: string;
        resourceId: string;
        reason: string;
        count?: number;
        auditLogId: string;
    }): Promise<void> {
        // TODO: Implement actual email sending when SMTP configured
        const emailBody = `
Deletion Notification
=====================

Action: ${params.count ? 'Bulk Delete' : 'Delete'}
Resource: ${params.resourceType} - ${params.resourceName}
ID: ${params.resourceId}
${params.count ? `Count: ${params.count} items` : ''}
Deleted By: ${params.deletedByEmail}
Reason: ${params.reason}
Audit Log ID: ${params.auditLogId}
Timestamp: ${new Date().toISOString()}

---
This is an automated notification for audit compliance.
    `.trim();

        console.log('[Email] (STUB) Would send email:', {
            to: params.deletedByEmail,
            subject: params.count
                ? `${params.count} ${params.resourceType}s deleted`
                : `${params.resourceType} "${params.resourceName}" deleted`,
            body: emailBody
        });

        // When SMTP is configured, replace above with:
        // await this.sendEmail({ to: [...], subject: ..., html: emailBody });
    }

    /**
     * TODO: Actual email sending implementation
     * Requires SMTP server configuration
     */
    // private async sendEmail(_email: EmailNotification): Promise<void> {
    //     // TODO: Implement with SendGrid, SES, or SMTP
    //     throw new Error('Email service not configured. Add SMTP settings to enable.');
    // }
}

export const emailService = new EmailService();
