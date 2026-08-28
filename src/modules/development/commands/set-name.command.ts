import {
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandStringOption,
} from "discord.js";

import type { Command, CommandMeta } from "@/types/module.types.ts";
import { extractUserId } from "@/utils/discord.utils.ts";

export class SetNameCommand implements Command {
  public meta(): CommandMeta {
    return {
      name: "set-name",
      description: "Set a custom name for a user.",
      options: [
        new SlashCommandStringOption()
          .setName("id")
          .setDescription("The user ID.")
          .setRequired(true),
        new SlashCommandStringOption()
          .setName("name")
          .setDescription("The name to set to the user.")
          .setRequired(true),
      ],
    };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const id = extractUserId(interaction.options.getString("id"));
    const name = interaction.options.getString("name");

    if (!name) {
      throw new Error("Failed to get name");
    }

    if (!interaction.guild) throw new Error("Could not find guild");

    const member = await interaction.guild.members.fetch(id);

    await member.setNickname(name);

    await interaction.reply({
      content: `New name for user is ${name}.`,
      flags: [MessageFlags.Ephemeral],
    });
  }
}
