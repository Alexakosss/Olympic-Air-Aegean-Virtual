import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandStringOption,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import type { DataService } from "@/types/data.types.ts";
import type { Command, CommandMeta } from "@/types/module.types.ts";

export class ManageEventCommand implements Command {
  constructor(
    private readonly action: "edit" | "cancel",
    private readonly dataService: DataService,
  ) {}

  public meta(): CommandMeta {
    return {
      name: this.action,
      description: `${this.action === "edit" ? "Edit" : "Cancel"} one of your created events.`,
      ...(this.action === "cancel"
        ? {
            options: [
              new SlashCommandStringOption()
                .setName("title")
                .setDescription("Exact title of the event to cancel.")
                .setRequired(true),
            ],
          }
        : {}),
    };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const events = await this.dataService.getGeneralEventsByOwner(interaction.user.id);
    if (!events.length) {
      await interaction.reply({
        content: `:confused: You have no active events to ${this.action}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (this.action === "cancel") {
      const title = interaction.options.getString("title", true).trim();
      const matches = events.filter(
        ({ event }) => event.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase(),
      );
      if (!matches.length) {
        await interaction.reply({
          content: `:confused: No active event named **${title}** was found. Use the event's exact title.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (matches.length > 1) {
        await interaction.reply({
          content: `:warning: You have multiple events named **${title}**. Give each event a unique title before cancelling it.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const match = matches[0];
      if (!match) return;
      const { uuid, event } = match;
      const confirm = new ButtonBuilder()
        .setCustomId(`general-event-cancel-confirm:${uuid}:${interaction.user.id}`)
        .setLabel("Confirm cancellation")
        .setStyle(ButtonStyle.Danger);
      const keep = new ButtonBuilder()
        .setCustomId("general-event-cancel-keep")
        .setLabel("Keep event")
        .setStyle(ButtonStyle.Secondary);
      await interaction.reply({
        content: `:warning: Cancel **${event.title}**? This cannot be undone.`,
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirm, keep)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`general-event-${this.action}:${interaction.user.id}`)
      .setPlaceholder(`Choose an event to ${this.action}`)
      .setOptions(
        events.map(({ uuid, event }) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(event.title.slice(0, 100))
            .setDescription(event.startTime.toISOString().slice(0, 16) + "Z")
            .setValue(uuid),
        ),
      );
    await interaction.reply({
      content: `Choose the event you want to ${this.action}.`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      flags: MessageFlags.Ephemeral,
    });
  }
}
