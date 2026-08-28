import { Events, type Interaction } from "discord.js";

import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";

export class SelectEventInteraction implements ModuleInteraction {
  public meta(): ModuleInteractionMeta {
    return {
      event: Events.InteractionCreate,
    };
  }

  public async handle(interaction: Interaction) {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "event-participation-all-events") return;

    await interaction.reply(`Selected: ${interaction.values[0]}`);
  }
}
