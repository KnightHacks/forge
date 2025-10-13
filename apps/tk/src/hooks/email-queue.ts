import type { Client } from "discord.js";
import cron from "node-cron";

import { EmailQueueService } from "../services/email-queue";
import { env } from "../env";

export function execute(client: Client) {
  const emailService = new EmailQueueService();

  try {
    // Get cron schedule from config or environment
    void emailService.getEmailConfig().then((config) => {
      const cronSchedule = config.cronSchedule;
      
      console.log(`Starting email queue processor with schedule: ${cronSchedule}`);
      
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      cron.schedule(cronSchedule, async () => {
        try {
          console.log(`[CRON] Email queue job triggered at ${new Date().toISOString()}`);
          await processEmailQueue(emailService, client);
        } catch (error) {
          console.error("Error in email queue processing:", error);
        }
      });
    }).catch((err) => {
      console.error("Failed to get email config:", err);
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Failed to start email queue processor:", err.message);
    } else {
      console.error("An unknown error occurred starting email queue processor:", err);
    }
  }
}

async function processEmailQueue(emailService: EmailQueueService, client: Client) {
  console.log("Processing email queue...");

  // Check if email sending is enabled
  const config = await emailService.getEmailConfig();
  if (!config.enabled) {
    console.log("Email sending is disabled");
    return;
  }

  // Get daily limit and current count
  const { count, limit, remaining } = await emailService.checkDailyLimit();
  console.log(`Daily limit: ${limit}, Current count: ${count}, Remaining: ${remaining}`);

  if (remaining <= 0) {
    console.log("Daily email limit reached");
    await sendDiscordUpdate(client, "📧 Email Queue Update", 
      `Daily email limit reached (${count}/${limit}). No emails processed.`);
    return;
  }

  // Fetch next emails to send
  const emailsToSend = await emailService.getNextEmailsToSend(remaining);
  console.log(`Found ${emailsToSend.length} emails ready to send`);
  
  // Debug: Log details of emails found
  if (emailsToSend.length > 0) {
    console.log("Emails found:", emailsToSend.map(e => ({
      id: e.id,
      to: e.to,
      priority: e.priority,
      status: e.status,
      scheduled_for: e.scheduled_for,
      created_at: e.created_at
    })));
  }

  if (emailsToSend.length === 0) {
    console.log("No emails ready to send");
    return;
  }

  // Process emails
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const processedBatches = new Set<string>();

  for (const email of emailsToSend) {
    // Check blacklist rules
    if (!emailService.canSendEmail(email)) {
      console.log(`Email ${email.id} skipped due to blacklist rules`);
      skippedCount++;
      continue;
    }

    // Handle batch emails
    if (email.batchId) {
      if (processedBatches.has(email.batchId)) {
        continue; // Skip if we already processed this batch
      }
      
      processedBatches.add(email.batchId);
      const batchResult = await emailService.processBatch(email.batchId, remaining - sentCount);
      sentCount += batchResult.sent;
      
      console.log(`Batch ${email.batchId}: sent ${batchResult.sent}, scheduled ${batchResult.scheduled}`);
    } else {
      // Send individual email
      const success = await emailService.sendEmailFromQueue(email.id);
      if (success) {
        sentCount++;
        console.log(`Email ${email.id} sent successfully`);
      } else {
        failedCount++;
        console.log(`Email ${email.id} failed to send`);
      }
    }

    // Stop if we've reached the remaining limit
    if (sentCount >= remaining) {
      console.log("Reached daily limit, stopping processing");
      break;
    }
  }

  // Update daily count
  if (sentCount > 0) {
    await emailService.incrementDailyCount(sentCount);
  }

  console.log(`Email queue processing complete: ${sentCount} sent, ${skippedCount} skipped, ${failedCount} failed`);

  // Send Discord update if there was activity
  if (sentCount > 0 || failedCount > 0 || skippedCount > 0) {
    await sendDiscordUpdate(client, "📧 Email Queue Processing Complete", 
      `**Results:**\n` +
      `✅ Sent: ${sentCount}\n` +
      `⏭️ Skipped: ${skippedCount}\n` +
      `❌ Failed: ${failedCount}\n` +
      `📊 Daily Count: ${count + sentCount}/${limit}\n` +
      `⏰ Processed at: ${new Date().toLocaleString()}`);
  }
}

async function sendDiscordUpdate(client: Client, title: string, message: string) {
  try {
    // You can configure this channel ID in environment variables
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channelId = env.DISCORD_EMAIL_QUEUE_CHANNEL_ID;
    
    if (!channelId) {
      console.log("No Discord channel configured for email queue updates");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased() && 'send' in channel) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      await (channel as any).send({
        embeds: [{
          title,
          description: message,
          color: 0x00ff00,
          timestamp: new Date().toISOString(),
        }]
      });
    }
  } catch (error) {
    console.error("Failed to send Discord update:", error);
  }
}
