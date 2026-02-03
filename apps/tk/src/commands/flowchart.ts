import type { CommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import {
  CPE_FLOWCHART_URL,
  CS_FLOWCHART_URL,
  DS_FLOWCHART_URL,
  IT_FLOWCHART_URL,
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
  );

export async function execute(interaction: CommandInteraction) {
	if (!interaction.isChatInputCommand()) {
    throw new Error("Interaction is of the wrong type");
  }

	const major = interaction.options.get("major")?.value; // this still works. idk why it shows an error
  let flowchartState = "";

  if (!major) {
    return interaction.reply("Invalid major!");
  }

  switch (
    major // images hosted on imgur... lol
  ) {
    case "Computer Science":
      flowchartState = CS_FLOWCHART_URL;
      break;
    case "Information Technology":
      flowchartState = IT_FLOWCHART_URL;
      break;
    case "Computer Engineering":
      flowchartState = CPE_FLOWCHART_URL;
      break;
    case "Data Science":
      flowchartState = DS_FLOWCHART_URL;
      break;
    default:
      flowchartState = ""; // TODO
  }

  const flowchartEmbed = new EmbedBuilder()
    .setColor(0x33e0ff)
    .setTitle(`${major} Flowchart`)
    .setImage(flowchartState);

  return interaction.reply({ embeds: [flowchartEmbed] }); // returns the embed with the image
}
