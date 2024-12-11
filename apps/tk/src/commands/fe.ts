import { CommandInteraction, SlashCommandBuilder} from "discord.js";

// Foundation Exam command
// Gives info 

// Create the command
export const data = new SlashCommandBuilder()
    .setName("fe")
    .setDescription("Gives info about the Foundation Exam, links to help you pass, etc.");

export async function execute(interaction: CommandInteraction) {

    return interaction.reply("##Foundation Exam\nThe Foundation Exam is an exam offered by the College of Engineering and Computer Science");
}
