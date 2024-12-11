import { WebhookClient } from "discord.js";
import { config } from "../config";

// Test webhook command
export async function execute() {
    // Create a new Webhook client instance
    const webhook = new WebhookClient({
        url: config.DISCORD_WEBHOOK_URL,
    });

    // Send a hello world message every 10 seconds
    webhook.send("Beep Boopm T.K has joined the server!");
}
