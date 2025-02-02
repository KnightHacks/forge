import type { CommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

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
  const major = interaction.options.get("major")?.value; // this still works. idk why it shows an error
  let flowchartState = "";

  if (!major) {
    return interaction.reply("Invalid major!");
  }

  switch (
    major // images hosted on imgur... lol
  ) {
    case "Computer Science":
      flowchartState = "https://blade.knighthacks.org/flowcharts/bs-cs.png";
      break;
    case "Information Technology":
      flowchartState = "https://blade.knighthacks.org/flowcharts/bs-it.png";
      break;
    case "Computer Engineering":
      flowchartState = "https://blade.knighthacks.org/flowcharts/bs-cpe.png";
      break;
    case "Data Science":
      flowchartState = "https://blade.knighthacks.org/flowcharts/bs-ds.png";
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
