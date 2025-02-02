import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

// HELP COMMAND
// Command to help users with the bot

// Create the command
export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Replies with a list of commands!");

// Logic for the help command
export async function execute(interaction: CommandInteraction) {
  // Create the embedding
  const embed = {
    title: "Commands",
    description: "Here is a list of commands you can use with the bot!",
    color: 0x33e0ff,
    fields: [
      {
        name: "/beep",
        value: "Boop!",
      },
      {
        name: "/bubblewrap",
        value: "Gives you some bubble wrap!",
      },
      {
        name: "/capybara",
        value: "Capybara noises!",
      },
      {
        name: "/cat",
        value: "Meow!",
      },
      {
        name: "/chat",
        value: "Chat with T.K!",
      },
      {
        name: "/check_points",
        value: "Checks your Knight Hacks points!",
      },
      {
        name: "/dog",
        value: "Bark!",
      },
      {
        name: "/duck",
        value: "Quack!",
      },
      {
        name: "/eightball",
        value: "Ask, and you shall receive.",
      },
      {
        name: "/fact",
        value: "Get a random fact!",
      },
      {
        name: "/flex",
        value: "Flexes your points on someone!",
      },
      {
        name: "/flowchart",
        value: "Sends the flowchart for CS, IT, CpE, and DS!",
      },
      {
        name: "/fox",
        value: "What does the fox say?",
      },
      {
        name: "/goat",
        value: "G.O.A.T.!",
      },
      {
        name: "/help",
        value: "Shows this list of helpful commands!",
      },
      {
        name: "/joke",
        value: "Tells a random joke!",
      },
      {
        name: "/leaderboard",
        value: "Shows the leaderboard privately",
      },
      {
        name: "/links",
        value: "Shows our most important links, with lots of information!",
      },
      {
        name: "/weather",
        value: "Shows the current weather for a specified city!",
      },
    ],
  };

  // Send the embedding
  await interaction.reply({ embeds: [embed] });
}
