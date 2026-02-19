import type { CommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import {
  CPE_FLOWCHART_23_24_URL,
  CPE_FLOWCHART_24_25_URL,
  CPE_FLOWCHART_25_26_URL,
  CS_FLOWCHART_23_24_URL,
  CS_FLOWCHART_24_25_URL,
  CS_FLOWCHART_25_26_URL,
  DS_FLOWCHART_24_25_URL,
  IT_FLOWCHART_23_24_URL,
  IT_FLOWCHART_24_25_URL,
  IT_FLOWCHART_25_26_URL,
} from "../consts";

export const data = new SlashCommandBuilder()
  .setName("flowchart")
  .setDescription("Get the UCF flowchart for your major!")
  .addStringOption(
    (
      option, // to have a second parameter in your command
    ) =>
      option
        .setName("major")
        .setDescription("Input your major for its flowchart!")
        .setRequired(true)
        .addChoices(
          {
            name: "Computer Science",
            value: "Computer Science",
          },
          {
            name: "Information Technology",
            value: "Information Technology",
          },
          {
            name: "Computer Engineering",
            value: "Computer Engineering",
          },
          {
            name: "Data Science",
            value: "Data Science",
          },
        ),
  )
  .addStringOption((option) =>
    option
      .setName("year")
      .setDescription("Select the catalog year for the flowchart")
      .setRequired(true)
      .addChoices(
        {
          name: "2023-2024",
          value: "23-24",
        },
        {
          name: "2024-2025",
          value: "24-25",
        },
        {
          name: "2025-2026",
          value: "25-26",
        },
      ),
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) {
    throw new Error("Interaction is of the wrong type");
  }

  const major = interaction.options.getString("major");
  const year = interaction.options.getString("year");

  if (!major || !year) {
    return interaction.reply({
      content: "Invalid major or year selected!",
      ephemeral: true,
    });
  }

  const flowchartUrls: Record<string, Record<string, string>> = {
    "Computer Science": {
      "23-24": CS_FLOWCHART_23_24_URL,
      "24-25": CS_FLOWCHART_24_25_URL,
      "25-26": CS_FLOWCHART_25_26_URL,
    },
    "Information Technology": {
      "23-24": IT_FLOWCHART_23_24_URL,
      "24-25": IT_FLOWCHART_24_25_URL,
      "25-26": IT_FLOWCHART_25_26_URL,
    },
    "Computer Engineering": {
      "23-24": CPE_FLOWCHART_23_24_URL,
      "24-25": CPE_FLOWCHART_24_25_URL,
      "25-26": CPE_FLOWCHART_25_26_URL,
    },
    "Data Science": {
      "24-25": DS_FLOWCHART_24_25_URL,
    },
  };

  const flowchartState = flowchartUrls[major]?.[year];

  if (!flowchartState) {
    if (major === "Data Science") {
      return interaction.reply({
        content:
          "Data Science only has a flowchart for the 2024-2025 catalog year!",
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: `Could not find flowchart for ${major} ${year} catalog year`,
      ephemeral: true,
    });
  }

  const flowchartEmbed = new EmbedBuilder()
    .setColor(0x33e0ff)
    .setTitle(`${major} ${year} Flowchart`)
    .setImage(flowchartState);

  return interaction.reply({ embeds: [flowchartEmbed] }); // returns the embed with the image
}
