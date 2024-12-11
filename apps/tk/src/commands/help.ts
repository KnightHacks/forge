import { CommandInteraction, SlashCommandBuilder } from "discord.js";

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
                name: "/check_in",
                value: "Check into the hackathon!"
            },
            {
                name: "/badge",
                value: "View your group badge!"
            },
            {
                name: "/links",
                value: "Shows our most important links, with lots of information!",
            },
            {
                name: "/sign_in",
                value: "Signs you in to an event!",
            },
            {
                name: "/check_points",
                value: "Checks your Knight Hacks points!",
            },
            {
                name: "/leaderboard",
                value: "Shows the leaderboard privately",
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
                name: "/joke",
                value: "Tells a random joke!",
            },
            {
                name: "/beep",
                value: "Boop!",
            },
            {
                name: "/duck",
                value: "Quack!",
            },
            {
                name: "/cat",
                value: "Meow!",
            },
            {
                name: "/dog",
                value: "Bark!",
            },
            {
                name: "/capybara",
                value: "Capybara noises!",
            },
            {
                name: "/goat",
                value: "G.O.A.T.!",
            },
            {
                name: "/bubblewrap",
                value: "Gives you some bubble wrap!",
            },
            {
                name: "/help",
                value: "Shows this list of helpful commands!",
            },
        ],
    };

    // Send the embedding
    await interaction.reply({ embeds: [embed] });
}
