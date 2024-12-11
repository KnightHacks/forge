import {
    CommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("flowchart")
    .setDescription("Get the UCF flowchart for your major!")
    .addStringOption((option) => // to have a second parameter in your command
        option.setName("major")
            .setDescription("Input your major for its flowchart!")
            .setRequired(true)
            .addChoices(
                { 
                    name: "Computer Science", 
                    value: "Computer Science" 
                },
                { 
                    name: "Information Technology", 
                    value: "Information Technology" 
                },
                { 
                    name: "Computer Engineering", 
                    value: "Computer Engineering" 
                },
                {
                    name: "Data Science",
                    value: "Data Science",
                },
            ));


export async function execute(interaction: CommandInteraction) {
    const major = interaction.options.getString("major"); // this still works. idk why it shows an error
    let flowchartState = "";

    if (!major) {
        return interaction.reply("Invalid major!");
    }

    switch (major) { // images hosted on imgur... lol
        case "Computer Science":
            flowchartState = "https://i.imgur.com/yydsAcX.png";
            break;
        case "Information Technology":
            flowchartState = "https://i.imgur.com/o87vu16.png";
            break;
        case "Computer Engineering":
            flowchartState = "https://i.imgur.com/OxCyt2j.png";
            break;
        case "Data Science":
            flowchartState = "https://i.imgur.com/pohVTQA.png";
            break;
        default:
            flowchartState = "";
    }

    const flowchartEmbed = new EmbedBuilder()
    .setColor(0x33e0ff)
    .setTitle(major + " Flowchart")
    .setImage(flowchartState);

    return interaction.reply({ embeds: [flowchartEmbed] }); // returns the embed with the image
}