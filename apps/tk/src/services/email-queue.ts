import { and, asc, eq, sql } from "drizzle-orm";
import { Resend } from "resend";

import { DEFAULT_EMAIL_QUEUE_CRON_SCHEDULE } from "@forge/consts/knight-hacks";
import type {
  InsertEmailQueue,
  SelectEmailQueue,
} from "@forge/db/schemas/knight-hacks";
import {
  EmailConfig,
  EmailDailyCount,
  EmailQueue,
} from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { db } from "../lib/db";

// Initialize Resend
const resend = new Resend(env.RESEND_API_KEY);

// Priority mapping for ordering
const _PRIORITY_ORDER = {
  now: 1,
  high: 2,
  standard: 3,
  low: 4,
} as const;

type _Priority = keyof typeof _PRIORITY_ORDER;

// Email status constants
const EMAIL_STATUS = {
  PENDING: "pending",
  SCHEDULED: "scheduled",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

interface BlacklistRules {
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  timeRanges?: {
    start: string; // "HH:MM" format
    end: string; // "HH:MM" format
  }[];
  dateRanges?: {
    startDate: string; // ISO datetime string
    endDate: string; // ISO datetime string
    reason?: string;
  }[];
}

export class EmailQueueService {
  /**
   * Get emails ready to be sent, ordered by priority and timestamp
   */
  async getNextEmailsToSend(limit: number): Promise<SelectEmailQueue[]> {
    const now = new Date();

    // First, update scheduled emails that are ready to be sent
    await db
      .update(EmailQueue)
      .set({
        status: EMAIL_STATUS.PENDING,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(EmailQueue.status, EMAIL_STATUS.SCHEDULED),
          sql`scheduled_for IS NOT NULL AND scheduled_for <= ${sql.raw(`'${now.toISOString()}'`)}`,
        ),
      );

    // Then get all pending emails
    return await db
      .select()
      .from(EmailQueue)
      .where(eq(EmailQueue.status, EMAIL_STATUS.PENDING))
      .orderBy(
        sql`CASE priority 
          WHEN 'now' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'standard' THEN 3 
          WHEN 'low' THEN 4 
        END`,
        asc(EmailQueue.created_at),
        asc(EmailQueue.batch_id),
        asc(EmailQueue.batch_position),
      )
      .limit(limit);
  }

  /**
   * Clean up stuck emails (emails stuck in processing status for too long)
   */
  async cleanupStuckEmails(): Promise<void> {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    await db
      .update(EmailQueue)
      .set({
        status: EMAIL_STATUS.PENDING,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(EmailQueue.status, EMAIL_STATUS.PROCESSING),
          sql`updated_at < ${sql.raw(`'${fiveMinutesAgo.toISOString()}'`)}`,
        ),
      );
  }

  /**
   * Check daily email limit and return remaining capacity
   */
  async checkDailyLimit(): Promise<{
    count: number;
    limit: number;
    remaining: number;
  }> {
    const todayParts = new Date().toISOString().split("T");
    const today = todayParts[0];
    if (!today) {
      throw new Error("Failed to get today's date");
    }

    // Get or create today's count record
    let dailyCount = await db
      .select()
      .from(EmailDailyCount)
      .where(eq(EmailDailyCount.date, today))
      .limit(1);

    if (dailyCount.length === 0) {
      // Get default limit from config
      const config = await this.getEmailConfig();
      await db.insert(EmailDailyCount).values({
        date: today,
        count: 0,
        limit: config.dailyLimit,
      });
      dailyCount = await db
        .select()
        .from(EmailDailyCount)
        .where(eq(EmailDailyCount.date, today))
        .limit(1);
    }

    const count = dailyCount[0]?.count ?? 0;
    const limit = dailyCount[0]?.limit ?? 100;
    const remaining = Math.max(0, limit - count);

    return { count, limit, remaining };
  }

  /**
   * Increment daily email count
   */
  async incrementDailyCount(count: number): Promise<void> {
    const todayParts = new Date().toISOString().split("T");
    const today = todayParts[0];
    if (!today) {
      throw new Error("Failed to get today's date");
    }

    await db
      .update(EmailDailyCount)
      .set({
        count: sql`count + ${count}`,
        updated_at: new Date(),
      })
      .where(eq(EmailDailyCount.date, today));
  }

  /**
   * Check if email can be sent based on blacklist rules
   */
  canSendEmail(email: SelectEmailQueue): boolean {
    if (!email.blacklist_rules) return true;

    const rules = email.blacklist_rules as BlacklistRules;
    const now = new Date();

    // Check date range restrictions
    if (rules.dateRanges) {
      for (const range of rules.dateRanges) {
        const startDate = new Date(range.startDate);
        const endDate = new Date(range.endDate);

        if (now >= startDate && now <= endDate) {
          console.log(
            `Email ${email.id} blocked by date range: ${range.startDate} to ${range.endDate} (reason: ${range.reason ?? "No reason provided"})`,
          );
          return false;
        }
      }
    }

    const dayOfWeek = now.getDay();
    const timeString = now.toTimeString().slice(0, 5); // "HH:MM"

    // Check day of week restrictions
    if (rules.daysOfWeek?.includes(dayOfWeek)) {
      return false;
    }

    // Check time range restrictions
    if (rules.timeRanges) {
      for (const range of rules.timeRanges) {
        if (this.isTimeInRange(timeString, range.start, range.end)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if current time falls within a restricted range
   */
  private isTimeInRange(
    currentTime: string,
    startTime: string,
    endTime: string,
  ): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    // Handle ranges that cross midnight
    if (start > end) {
      return current >= start || current <= end;
    }

    return current >= start && current <= end;
  }

  /**
   * Convert time string "HH:MM" to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const parts = time.split(":");
    const hours = parts[0];
    const minutes = parts[1];
    if (!hours || !minutes) {
      throw new Error(`Invalid time format: ${time}`);
    }
    return Number(hours) * 60 + Number(minutes);
  }

  /**
   * Process a batch of emails
   */
  async processBatch(
    batchId: string,
    remainingLimit: number,
  ): Promise<{
    sent: number;
    scheduled: number;
  }> {
    const batchEmails = await db
      .select()
      .from(EmailQueue)
      .where(
        and(
          eq(EmailQueue.batch_id, batchId),
          sql`status IN ('${EMAIL_STATUS.PENDING}', '${EMAIL_STATUS.SCHEDULED}')`,
        ),
      )
      .orderBy(asc(EmailQueue.batch_position));

    let sent = 0;
    let scheduled = 0;

    for (const email of batchEmails) {
      if (sent >= remainingLimit) {
        // Schedule remaining emails for next available time
        const nextAvailableTime = this.getNextAvailableTime();
        await db
          .update(EmailQueue)
          .set({
            scheduled_for: nextAvailableTime,
            status: EMAIL_STATUS.SCHEDULED,
            updated_at: new Date(),
          })
          .where(eq(EmailQueue.id, email.id));
        scheduled++;
      } else {
        // Send this email
        const success = await this.sendEmailFromQueue(email.id);
        if (success) {
          sent++;
        }
      }
    }

    return { sent, scheduled };
  }

  /**
   * Send email from queue
   */
  async sendEmailFromQueue(emailId: string): Promise<boolean> {
    const email = await db
      .select()
      .from(EmailQueue)
      .where(eq(EmailQueue.id, emailId))
      .limit(1);

    if (email.length === 0) return false;

    const emailData = email[0];
    if (!emailData) {
      return false;
    }

    try {
      // Mark as processing
      await db
        .update(EmailQueue)
        .set({
          status: EMAIL_STATUS.PROCESSING,
          attempts: sql`attempts + 1`,
          updated_at: new Date(),
        })
        .where(eq(EmailQueue.id, emailId));

      // Send email via Resend
      const { error } = await resend.emails.send({
        from: emailData.from ?? env.RESEND_FROM_EMAIL,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      // Mark as completed
      await db
        .update(EmailQueue)
        .set({
          status: EMAIL_STATUS.COMPLETED,
          processed_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(EmailQueue.id, emailId));

      return true;
    } catch (error) {
      console.error(`Failed to send email ${emailId}:`, error);

      // Mark as failed if max attempts reached
      const updatedEmail = await db
        .select()
        .from(EmailQueue)
        .where(eq(EmailQueue.id, emailId))
        .limit(1);

      const attempts = updatedEmail[0]?.attempts ?? 0;
      const maxAttempts = updatedEmail[0]?.max_attempts ?? 3;

      if (attempts >= maxAttempts) {
        await db
          .update(EmailQueue)
          .set({
            status: EMAIL_STATUS.FAILED,
            last_error:
              error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date(),
          })
          .where(eq(EmailQueue.id, emailId));
      } else {
        // Reset to pending for retry
        await db
          .update(EmailQueue)
          .set({
            status: EMAIL_STATUS.PENDING,
            last_error:
              error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date(),
          })
          .where(eq(EmailQueue.id, emailId));
      }

      return false;
    }
  }

  /**
   * Get next available time when emails can be sent
   */
  private getNextAvailableTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM tomorrow

    return tomorrow;
  }

  /**
   * Get email configuration
   */
  async getEmailConfig(): Promise<{
    dailyLimit: number;
    cronSchedule: string;
    enabled: boolean;
  }> {
    try {
      const config = await db.select().from(EmailConfig).limit(1);

      if (config.length === 0) {
        // Create default config
        await db.insert(EmailConfig).values({
          daily_limit: parseInt(env.EMAIL_DAILY_LIMIT ?? "100"),
          cron_schedule:
            env.EMAIL_QUEUE_CRON ?? DEFAULT_EMAIL_QUEUE_CRON_SCHEDULE,
          enabled: true,
        });

        return {
          dailyLimit: parseInt(env.EMAIL_DAILY_LIMIT ?? "100"),
          cronSchedule:
            env.EMAIL_QUEUE_CRON ?? DEFAULT_EMAIL_QUEUE_CRON_SCHEDULE,
          enabled: true,
        };
      }

      const configData = config[0];
      if (!configData) {
        return {
          dailyLimit: parseInt(env.EMAIL_DAILY_LIMIT ?? "100"),
          cronSchedule:
            env.EMAIL_QUEUE_CRON ?? DEFAULT_EMAIL_QUEUE_CRON_SCHEDULE,
          enabled: true,
        };
      }

      return {
        dailyLimit: configData.daily_limit,
        cronSchedule: configData.cron_schedule,
        enabled: configData.enabled,
      };
    } catch (error) {
      console.warn("Failed to get email config, using defaults:", error);
      return {
        dailyLimit: parseInt(env.EMAIL_DAILY_LIMIT ?? "100"),
        cronSchedule:
          env.EMAIL_QUEUE_CRON ?? DEFAULT_EMAIL_QUEUE_CRON_SCHEDULE,
        enabled: true,
      };
    }
  }

  /**
   * Add email to queue
   */
  async queueEmail(
    emailData: Omit<InsertEmailQueue, "id" | "created_at" | "updated_at">,
  ): Promise<string> {
    const result = await db
      .insert(EmailQueue)
      .values({
        ...emailData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: EmailQueue.id });

    const firstResult = result[0];
    if (!firstResult) {
      throw new Error("Failed to create email queue entry");
    }

    return firstResult.id;
  }

  /**
   * Add batch emails to queue
   */
  async queueBatchEmail(
    batchId: string,
    recipients: string[],
    emailData: Omit<
      InsertEmailQueue,
      "id" | "to" | "batch_id" | "batch_position" | "created_at" | "updated_at"
    >,
  ): Promise<string[]> {
    const emails = recipients.map((to, index) => ({
      ...emailData,
      to,
      batch_id: batchId,
      batch_position: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const result = await db
      .insert(EmailQueue)
      .values(emails)
      .returning({ id: EmailQueue.id });
    return result.map((r) => r.id);
  }
}
