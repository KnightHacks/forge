import type { CommandInteraction, Interaction } from "discord.js";

export interface TkCommand {
  execute(interaction: CommandInteraction): Promise<unknown>;
}

export async function safelyHandleTkInteraction(input: {
  commands: Record<string, TkCommand | undefined>;
  interaction: Interaction;
  onError: () => void;
}) {
  if (!input.interaction.isCommand()) return;
  const command = input.commands[input.interaction.commandName];
  if (!command) return;

  try {
    await command.execute(input.interaction);
  } catch {
    input.onError();
  }
}
