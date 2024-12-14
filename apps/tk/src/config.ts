/* eslint-disable no-restricted-properties */
/* eslint-disable turbo/no-undeclared-env-vars */
// Get the environment variables
const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_WEBHOOK_URL,
  DAILY_WEBHOOK_URL,
  DAILY_ROLE_ID,
  DATABASE_URL,
  ANIMAL_WEBHOOK_URL,
} = process.env;

console.log({
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_WEBHOOK_URL,
  DAILY_WEBHOOK_URL,
  DAILY_ROLE_ID,
  DATABASE_URL,
  ANIMAL_WEBHOOK_URL,
});
// Check if the environment variables are set
if (
  !DISCORD_TOKEN ||
  !DISCORD_CLIENT_ID ||
  !DISCORD_WEBHOOK_URL ||
  !DAILY_WEBHOOK_URL ||
  !DAILY_ROLE_ID ||
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
  DATABASE_URL,
  ANIMAL_WEBHOOK_URL,
};
