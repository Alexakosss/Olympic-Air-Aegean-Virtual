import {
  type ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { Command, CommandMeta } from "@/types/module.types.ts";

export class CreateEventCommand implements Command {
  constructor(private readonly envCfg: EnvConfig) {}
  public meta(): CommandMeta {
    return {
      name: "create",
      description: "Create a new OAV event.",
    };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const isOrganizer = Boolean(
      interaction.inGuild() &&
      interaction.member?.roles &&
      "cache" in interaction.member.roles &&
      interaction.member.roles.cache.has(this.envCfg.EVENT_ORGANIZER_ROLE_ID),
    );
    if (!isOrganizer) {
      await interaction.reply({
        content: ":x: Only Event Organizers can create events.",
        ephemeral: true,
      });
      return;
    }

    const title = new TextInputBuilder()
      .setCustomId("event-title")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("From Acropolis To The Colosseum")
      .setRequired(true);
    const startDate = new TextInputBuilder()
      .setCustomId("event-start-date")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("2026-08-27")
      .setRequired(true);
    const endDate = new TextInputBuilder()
      .setCustomId("event-end-date")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("2026-08-27")
      .setRequired(true);
    const periodOptions = [
      { label: "00:00–11:30 Z", value: "0" },
      { label: "12:00–23:30 Z", value: "12" },
    ];
    const startPeriod = new StringSelectMenuBuilder()
      .setCustomId("event-start-period")
      .setPlaceholder("Select start-time range (Z)")
      .setOptions(periodOptions);
    const endPeriod = new StringSelectMenuBuilder()
      .setCustomId("event-end-period")
      .setPlaceholder("Select end-time range (Z)")
      .setOptions(periodOptions);

    await interaction.showModal(
      new ModalBuilder()
        .setCustomId("general-event-schedule-form")
        .setTitle("✈️ New OAV Event — Schedule")
        .addLabelComponents(
          new LabelBuilder().setLabel("📝 Event title").setTextInputComponent(title),
          new LabelBuilder().setLabel("🕐 Start date (Z)").setTextInputComponent(startDate),
          new LabelBuilder()
            .setLabel("🕐 Start-time range (Z)")
            .setStringSelectMenuComponent(startPeriod),
          new LabelBuilder().setLabel("🏁 End date (Z)").setTextInputComponent(endDate),
          new LabelBuilder()
            .setLabel("🏁 End-time range (Z)")
            .setStringSelectMenuComponent(endPeriod),
        ),
    );
  }
}
