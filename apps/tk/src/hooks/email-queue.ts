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

  // Clean up any stuck emails first
  await emailService.cleanupStuckEmails();

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
  
  // Debug: Log details of emails found with priority order
  if (emailsToSend.length > 0) {
    console.log(`Found ${emailsToSend.length} emails ready to send:`);
    emailsToSend.forEach((e, index) => {
      const scheduledInfo = e.scheduled_for ? `(was scheduled for ${e.scheduled_for.toISOString()})` : '(immediate)';
      console.log(`  ${index + 1}. [${e.priority.toUpperCase()}] ${e.subject} (${e.to}) - ${scheduledInfo}`);
    });
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
      console.log(`Email ${email.id} [${email.priority.toUpperCase()}] "${email.subject}" skipped due to blacklist rules`);
      skippedCount++;
      continue;
    }

    // Handle batch emails
    if (email.batch_id) {
      if (processedBatches.has(email.batch_id)) {
        continue; // Skip if we already processed this batch
      }
      
      processedBatches.add(email.batch_id);
      const batchResult = await emailService.processBatch(email.batch_id, remaining - sentCount);
      sentCount += batchResult.sent;
      
      console.log(`Batch ${email.batch_id}: sent ${batchResult.sent}, scheduled ${batchResult.scheduled}`);
    } else {
      // Send individual email
      console.log(`Sending email ${email.id} [${email.priority.toUpperCase()}] "${email.subject}" to ${email.to}`);
      const success = await emailService.sendEmailFromQueue(email.id);
      if (success) {
        console.log(`✅ Successfully sent email ${email.id}`);
        sentCount++;
      } else {
        console.log(`❌ Failed to send email ${email.id}`);
        failedCount++;
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
    const channelId = env.DISCORD_EMAIL_QUEUE_CHANNEL_ID;
    
    if (!channelId) {
      console.log("No Discord channel configured for email queue updates");
      return;
    }

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
