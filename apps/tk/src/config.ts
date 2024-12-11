import dotenv from "dotenv";

// Access the environment variables
dotenv.config();

// Get the environment variables
const {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_WEBHOOK_URL,
    DAILY_WEBHOOK_URL,
    DAILY_ROLE_ID,
    GOOGLE_API_KEY,
    GOOGLE_CALENDAR_ID,
    CALENDAR_WEBHOOK_URL,
    CALENDAR_ROLE_ID,
    DATABASE_URL,
    DATABASE_AUTH_TOKEN,
    ANIMAL_WEBHOOK_URL,
} = process.env;

// Check if the environment variables are set
if (
    !DISCORD_TOKEN ||
    !DISCORD_CLIENT_ID ||
    !DISCORD_WEBHOOK_URL ||
    !DAILY_WEBHOOK_URL ||
    !DAILY_ROLE_ID ||
    !GOOGLE_API_KEY ||
    !GOOGLE_CALENDAR_ID ||
    !CALENDAR_ROLE_ID ||
    !CALENDAR_WEBHOOK_URL ||
    !DATABASE_URL ||
    !DATABASE_AUTH_TOKEN ||
    !ANIMAL_WEBHOOK_URL
) {
    throw new Error("Missing environment variables");
}

// Export the config object
export const config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_WEBHOOK_URL,
    DAILY_WEBHOOK_URL,
    DAILY_ROLE_ID,
    GOOGLE_API_KEY,
    GOOGLE_CALENDAR_ID,
    CALENDAR_WEBHOOK_URL,
    CALENDAR_ROLE_ID,
    DATABASE_URL,
    DATABASE_AUTH_TOKEN,
    ANIMAL_WEBHOOK_URL,
};
