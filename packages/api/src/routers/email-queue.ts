import type { TRPCRouterRecord } from "@trpc/server";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@forge/db/client";
import {
  EmailQueue,
  EmailDailyCount,
  EmailConfig,
} from "@forge/db/schemas/knight-hacks";
import {
  emailQueueInputSchema,
  batchEmailInputSchema,
  emailConfigInputSchema,
  updateEmailInputSchema,
  queueStatusSchema,
  paginatedEmailsSchema,
} from "@forge/validators";

import { publicProcedure } from "../trpc";

export const emailQueueRouter = {
  // Queue a single email
  queueEmail: publicProcedure
    .input(emailQueueInputSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(EmailQueue).values({
        to: input.to,
        from: input.from,
        subject: input.subject,
        html: input.html,
        priority: input.priority,
        scheduled_for: input.scheduledFor,
        blacklist_rules: input.blacklistRules,
        editable_until: input.editableUntil,
        max_attempts: input.maxAttempts,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning({ id: EmailQueue.id });

      return { success: true, emailId: result[0]?.id };
    }),

  // Queue a batch of emails
  queueBatchEmail: publicProcedure
    .input(batchEmailInputSchema)
    .mutation(async ({ input }) => {
      const batchId = crypto.randomUUID();
      const emails = input.recipients.map((to, index) => ({
        batch_id: batchId,
        batch_position: index + 1,
        to,
        from: input.from,
        subject: input.subject,
        html: input.html,
        priority: input.priority,
        scheduled_for: input.scheduledFor,
        blacklist_rules: input.blacklistRules,
        editable_until: input.editableUntil,
        max_attempts: input.maxAttempts,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const result = await db.insert(EmailQueue).values(emails).returning({ id: EmailQueue.id });
      
      return { 
        success: true, 
        batchId, 
        emailIds: result.map(r => r.id),
        count: result.length 
      };
    }),

  // Update a queued email
  updateQueuedEmail: publicProcedure
    .input(updateEmailInputSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      
      // Check if email is editable
      const email = await db
        .select()
        .from(EmailQueue)
        .where(eq(EmailQueue.id, id))
        .limit(1);

      if (email.length === 0) {
        throw new Error("Email not found");
      }

      const emailData = email[0];
      if (!emailData) {
        throw new Error("Email not found");
      }
      
      // Check if email can still be edited
      if (emailData.status !== 'pending' && emailData.status !== 'scheduled') {
        throw new Error("Email cannot be edited - already processed");
      }

      if (emailData.editable_until && new Date() > emailData.editable_until) {
        throw new Error("Email editing deadline has passed");
      }

      await db
        .update(EmailQueue)
        .set({
          ...updateData,
          updated_at: new Date(),
        })
        .where(eq(EmailQueue.id, id));

      return { success: true };
    }),

  // Delete a queued email
  deleteQueuedEmail: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const email = await db
        .select()
        .from(EmailQueue)
        .where(eq(EmailQueue.id, input.id))
        .limit(1);

      if (email.length === 0) {
        throw new Error("Email not found");
      }

      const emailData = email[0];
      if (!emailData) {
        throw new Error("Email not found");
      }
      
      // Only allow deletion of pending/scheduled emails
      if (emailData.status !== 'pending' && emailData.status !== 'scheduled') {
        throw new Error("Email cannot be deleted - already processed");
      }

      await db
        .delete(EmailQueue)
        .where(eq(EmailQueue.id, input.id));

      return { success: true };
    }),

  // Get queue status
  getQueueStatus: publicProcedure
    .output(queueStatusSchema)
    .query(async () => {
      // Get queue length
      const queueResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(EmailQueue)
        .where(sql`status IN ('pending', 'scheduled')`);

      const queueLength = Number(queueResult[0]?.count ?? 0);

      // Get daily count and limit
      const todayParts = new Date().toISOString().split('T');
      const today = todayParts[0];
      if (!today) {
        throw new Error("Failed to get today's date");
      }
      const dailyCountResult = await db
        .select()
        .from(EmailDailyCount)
        .where(eq(EmailDailyCount.date, today))
        .limit(1);

      const dailyCount = dailyCountResult[0]?.count ?? 0;
      const dailyLimit = dailyCountResult[0]?.limit ?? 100;
      const remainingCapacity = Math.max(0, dailyLimit - dailyCount);

      // Get next scheduled email time
      const nextEmailResult = await db
        .select({ scheduled_for: EmailQueue.scheduled_for })
        .from(EmailQueue)
        .where(sql`status = 'scheduled' AND scheduled_for IS NOT NULL`)
        .orderBy(asc(EmailQueue.scheduled_for))
        .limit(1);

      const nextSendTime = nextEmailResult[0]?.scheduled_for;

      // Get config
      const configResult = await db
        .select()
        .from(EmailConfig)
        .limit(1);

      const isEnabled = configResult[0]?.enabled ?? true;

      return {
        queueLength,
        dailyCount,
        dailyLimit,
        remainingCapacity,
        nextSendTime: nextSendTime?.toISOString(),
        isEnabled,
      };
    }),

  // Get queued emails with pagination
  getQueuedEmails: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      status: z.enum(["pending", "processing", "completed", "failed", "scheduled"]).optional(),
      priority: z.enum(["now", "high", "standard", "low"]).optional(),
    }))
    .output(paginatedEmailsSchema)
    .query(async ({ input }) => {
      const { page, pageSize, status, priority } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [];
      if (status) {
        conditions.push(eq(EmailQueue.status, status));
      }
      if (priority) {
        conditions.push(eq(EmailQueue.priority, priority));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get emails
      const emails = await db
        .select()
        .from(EmailQueue)
        .where(whereClause)
        .orderBy(desc(EmailQueue.created_at))
        .limit(pageSize)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(EmailQueue)
        .where(whereClause);

      const total = Number(totalResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / pageSize);

      return {
        emails: emails.map(email => ({
          ...email,
          batchId: email.batch_id ?? undefined,
          batchPosition: email.batch_position ?? undefined,
          from: email.from ?? undefined,
          scheduledFor: email.scheduled_for?.toISOString(),
          processedAt: email.processed_at?.toISOString(),
          lastError: email.last_error ?? undefined,
          maxAttempts: email.max_attempts,
          createdAt: email.created_at.toISOString(),
          updatedAt: email.updated_at.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages,
      };
    }),

  // Update email configuration
  updateEmailConfig: publicProcedure
    .input(emailConfigInputSchema)
    .mutation(async ({ input }) => {
      const configResult = await db
        .select()
        .from(EmailConfig)
        .limit(1);

      if (configResult.length === 0) {
        // Create new config
        await db.insert(EmailConfig).values({
          daily_limit: input.dailyLimit,
          cron_schedule: input.cronSchedule,
          enabled: input.enabled,
          updated_at: new Date(),
        });
      } else {
        // Update existing config
        const existingConfig = configResult[0];
        if (!existingConfig) {
          throw new Error("Config not found");
        }
        await db
          .update(EmailConfig)
          .set({
            daily_limit: input.dailyLimit,
            cron_schedule: input.cronSchedule,
            enabled: input.enabled,
            updated_at: new Date(),
          })
          .where(eq(EmailConfig.id, existingConfig.id));
      }

      return { success: true };
    }),

  // Get email configuration
  getEmailConfig: publicProcedure
    .query(async () => {
      try {
        const configResult = await db
          .select()
          .from(EmailConfig)
          .limit(1);

        if (configResult.length === 0) {
          // Return default config
          return {
            dailyLimit: 100,
            cronSchedule: "*/5 * * * * *",
            enabled: true,
          };
        }

        const config = configResult[0];
        if (!config) {
          return {
            dailyLimit: 100,
            cronSchedule: "*/5 * * * * *",
            enabled: true,
          };
        }

        return {
          dailyLimit: config.daily_limit,
          cronSchedule: config.cron_schedule,
          enabled: config.enabled,
        };
      } catch (error) {
        // If table doesn't exist or has wrong structure, return default config
        console.warn("EmailConfig table not found or has wrong structure, using defaults:", error);
        return {
          dailyLimit: 100,
          cronSchedule: "*/5 * * * *",
          enabled: true,
        };
      }
    }),
} satisfies TRPCRouterRecord;
