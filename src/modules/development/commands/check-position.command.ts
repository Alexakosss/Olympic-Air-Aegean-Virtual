import { type ChatInputCommandInteraction, SlashCommandStringOption } from "discord.js";

import type { Command, CommandMeta } from "@/types/module.types.ts";

export class CheckPositionCommand implements Command {
  constructor(private readonly positions: Map<string, void>) {}

  public meta(): CommandMeta {
    return {
      name: "check-position",
      description: "Check if a position exists",
      options: [
        new SlashCommandStringOption()
          .setName("position")
          .setDescription("The position to check")
          .setRequired(true),
      ],
    };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const position = interaction.options.getString("position");

    if (!position) {
      throw new Error("Position option is missing");
    }

    const exists = this.positions.has(position);

    if (!exists) {
      await interaction.reply({
        content: `:x: Position \`${position}\` does not exist.`,
      });
      return;
    }

    await interaction.reply({
      content: `:white_check_mark: Position \`${position}\` does exist.`,
    });
  }
}
