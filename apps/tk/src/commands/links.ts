import {
    CommandInteraction,
    SlashCommandBuilder,
} from "discord.js";
import { LINKS } from "../consts";

/* command that returns an embed with our important links
+ linktree link */

export const data = new SlashCommandBuilder()
    .setName("links")
    .setDescription(
        "Replies with a list of our links!"
    );

export async function execute(interaction: CommandInteraction) {
    const embed = {
        title: "Links",
        url: "https://linktr.ee/knighthacks",
        description: "Click any of these links to get started with KnightHacks!",
        color: 0x33e0ff,
        fields: [
            {
                name: "Our Popular Links:",
                value: LINKS.join("\n")
            },
        ]
    };

    // send the embedded message
    await interaction.reply({ embeds: [embed] });
}