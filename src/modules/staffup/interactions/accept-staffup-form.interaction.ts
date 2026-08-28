import {
  EmbedBuilder,
  type Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  Events,
} from "discord.js";

import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";

export class AcceptStaffupFormInteraction implements ModuleInteraction {
  constructor(private readonly dataService: DataService) {}

  public meta(): ModuleInteractionMeta {
    return {
      event: Events.InteractionCreate,
    };
  }

  public async handle(interaction: Interaction) {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith("atc-position")) return;

    const uuid = interaction.customId.split("atc-position:")[1];

    if (!uuid) return;

    const staffupEntry = await this.dataService.getStaffUpByUUID(uuid);

    if (!staffupEntry) return;

    const picked = interaction.values[0];

    if (!picked) {
      throw new Error("Pick position option is missing");
    }

    const modal = new ModalBuilder()
      .setCustomId(`atc-position-form:${uuid}:${picked}`)
      .setTitle("Notes for the position");

    const notes = new TextInputBuilder()
      .setCustomId("atc-position-notes")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Available only for 30 minutes.")
      .setRequired(false);

    const notesLabel = new LabelBuilder().setLabel("Notes").setTextInputComponent(notes);

    modal.addLabelComponents(notesLabel);

    await interaction.showModal(modal);
  }
}
