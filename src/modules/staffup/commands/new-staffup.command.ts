import {
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  FileUploadBuilder,
} from "discord.js";

import type { Command, CommandMeta } from "@/types/module.types.ts";

export class NewStaffupCommand implements Command {
  public meta(): CommandMeta {
    return {
      name: "new",
      description: "Create a new ATC staff-up event.",
    };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId("new-atc-staffup-modal")
      .setTitle("New ATC Staff-Up");

    const eventTitle = new TextInputBuilder()
      .setCustomId("event-title")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Bougatsa Express")
      .setRequired(true);

    const eventTitleLabel = new LabelBuilder()
      .setLabel("Event title")
      .setTextInputComponent(eventTitle);

    const eventTime = new TextInputBuilder()
      .setCustomId("event-time")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("2026-07-23T11:47:26z-2026-07-23T15:40:00z")
      .setRequired(true);

    const timeLabel = new LabelBuilder()
      .setLabel("Start time-End time (Zulu)")
      .setTextInputComponent(eventTime);

    const description = new TextInputBuilder()
      .setCustomId("event-description")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("This field is not required.")
      .setRequired(false);

    const descriptionLabel = new LabelBuilder()
      .setLabel("Description")
      .setTextInputComponent(description);

    const positions = new TextInputBuilder()
      .setCustomId("event-positions")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("LGAV_DEL,LGAV_GND,LGAV_TWR,LGIR_APP,LGIR_TWR")
      .setRequired(true);

    const positionsLabel = new LabelBuilder()
      .setLabel("Positions, comma-separated (min. 5)")
      .setTextInputComponent(positions);

    const imageUpload = new FileUploadBuilder().setCustomId("event-picture").setRequired(false);

    const imageUploadLabel = new LabelBuilder()
      .setLabel("Event thumbnail")
      .setFileUploadComponent(imageUpload);

    modal.addLabelComponents(
      eventTitleLabel,
      timeLabel,
      descriptionLabel,
      positionsLabel,
      imageUploadLabel,
    );

    await interaction.showModal(modal);
  }
}
