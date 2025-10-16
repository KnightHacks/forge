import { z } from "zod";

// Email priority enum
export const emailPrioritySchema = z.enum(["now", "high", "standard", "low"]);

// Blacklist rules schema
export const blacklistRulesSchema = z.object({
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
  timeRanges: z
    .array(
      z.object({
        start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
        end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
      }),
    )
    .optional(),
  dateRanges: z
    .array(
      z.object({
        startDate: z.string().datetime(), // ISO string
        endDate: z.string().datetime(), // ISO string
        reason: z.string().optional(),
      }),
    )
    .optional(),
});

// Email queue input schema
export const emailQueueInputSchema = z.object({
  to: z.string().email(),
  from: z.string().email().optional(),
  subject: z.string().min(1).max(500),
  html: z.string().min(1),
  priority: emailPrioritySchema.default("standard"),
  scheduledFor: z.date().optional(),
  blacklistRules: blacklistRulesSchema.optional(),
  editableUntil: z.date().optional(),
  maxAttempts: z.number().min(1).max(10).default(3),
});

// Batch email input schema
export const batchEmailInputSchema = z.object({
  recipients: z.array(z.string().email()).min(1),
  from: z.string().email().optional(),
  subject: z.string().min(1).max(500),
  html: z.string().min(1),
  priority: emailPrioritySchema.default("standard"),
  scheduledFor: z.date().optional(),
  blacklistRules: blacklistRulesSchema.optional(),
  editableUntil: z.date().optional(),
  maxAttempts: z.number().min(1).max(10).default(3),
});

// Email config input schema
export const emailConfigInputSchema = z.object({
  dailyLimit: z.number().min(1).max(10000).default(100),
  cronSchedule: z.string().min(1).max(50).default("*/5 * * * *"),
  enabled: z.boolean().default(true),
});

// Update email input schema (for editing queued emails)
export const updateEmailInputSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().min(1).max(500).optional(),
  html: z.string().min(1).optional(),
  priority: emailPrioritySchema.optional(),
  scheduledFor: z.date().optional(),
  blacklistRules: blacklistRulesSchema.optional(),
  editableUntil: z.date().optional(),
});

// Queue status response schema
export const queueStatusSchema = z.object({
  queueLength: z.number(),
  dailyCount: z.number(),
  dailyLimit: z.number(),
  remainingCapacity: z.number(),
  nextSendTime: z.string().datetime().optional(),
  isEnabled: z.boolean(),
});

// Queued email response schema
export const queuedEmailSchema = z.object({
  id: z.string().uuid(),
  batchId: z.string().uuid().optional(),
  batchPosition: z.number().optional(),
  priority: emailPrioritySchema,
  status: z.enum(["pending", "processing", "completed", "failed", "scheduled"]),
  to: z.string().email(),
  from: z.string().email().optional(),
  subject: z.string(),
  scheduledFor: z.string().datetime().optional(),
  attempts: z.number(),
  maxAttempts: z.number(),
  lastError: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
});

// Paginated emails response schema
export const paginatedEmailsSchema = z.object({
  emails: z.array(queuedEmailSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Export types
export type EmailPriority = z.infer<typeof emailPrioritySchema>;
export type BlacklistRules = z.infer<typeof blacklistRulesSchema>;
export type EmailQueueInput = z.infer<typeof emailQueueInputSchema>;
export type BatchEmailInput = z.infer<typeof batchEmailInputSchema>;
export type EmailConfigInput = z.infer<typeof emailConfigInputSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailInputSchema>;
export type QueueStatus = z.infer<typeof queueStatusSchema>;
export type QueuedEmail = z.infer<typeof queuedEmailSchema>;
export type PaginatedEmails = z.infer<typeof paginatedEmailsSchema>;
