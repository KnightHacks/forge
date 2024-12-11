import {
    CommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
} from "discord.js";

// COUNTDOWN COMMAND
// Command that reports the time until Knight Hacks VII

// Create the command
export const data = new SlashCommandBuilder()
    .setName("countdown")
    .setDescription(
        "Count down the days until our grand adventure, Knight Hacks VII!"
    );

export async function execute(interaction: CommandInteraction) {
    // Grab today's date and the date of Knight Hacks
    const today = new Date();
    // Add 4 hours to the date to account for the time difference (THE VPS IS FOUR HOURS BEHIND)
    today.setHours(today.getHours());
    const KH = new Date("October 4, 2024 17:00:00");

    // Calculate the differences in time
    const secondsDiff = (KH.getTime() - today.getTime()) / 1000;
    const minutesDiff = Math.floor((secondsDiff % 3600) / 60);
    const hoursDiff = Math.floor((secondsDiff % 86400) / 3600);
    const daysDiff = Math.floor(secondsDiff / 86400);

    // Create an embed message for aesthetics
    const countdownEmbed = new EmbedBuilder()
        .setColor(0x33e0ff)
        .setTitle("Knight Hacks VII Countdown")
        .setDescription(
            "Count down the days until our grand adventure, Knight Hacks VII! Get excited, scallywags!"
        )
        .setURL("https://2024.knighthacks.org")
        .addFields(
            {
                name: "Days",
                value: `${daysDiff} days`,
                inline: true,
            },
            {
                name: "Hours",
                value: `${hoursDiff} hours`,
                inline: true,
            },
            {
                name: "Minutes",
                value: `${minutesDiff} minutes`,
                inline: true,
            }
        )
        .setThumbnail("https://i.imgur.com/0hEcuRf.png");

    // Send the embed message
    await interaction.reply({
        embeds: [countdownEmbed],
    });
}
