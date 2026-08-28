import {
  type Client,
  ChannelType,
  Events,
  type Interaction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { GeneralEvent } from "@/schemas/events.schema.ts";
import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";

import { buildGeneralEventEmbed, createGeneralEventReminderRow } from "../utils/display.utils.ts";

export class ManageEventInteraction implements ModuleInteraction {
  constructor(
    private readonly client: Client,
    private readonly dataService: DataService,
    private readonly envCfg: EnvConfig,
  ) {}

  public meta(): ModuleInteractionMeta {
    return { event: Events.InteractionCreate };
  }

  private async editSelect(interaction: Interaction): Promise<void> {
    if (
      !interaction.isStringSelectMenu() ||
      !interaction.customId.startsWith("general-event-edit:")
    )
      return;
    const [, ownerId] = interaction.customId.split(":");
    const uuid = interaction.values[0];
    if (!uuid || ownerId !== interaction.user.id) return;
    const event = await this.dataService.getGeneralEvent(uuid);
    if (!event || event.ownerId !== interaction.user.id) return;

    const title = new TextInputBuilder()
      .setCustomId("title")
      .setStyle(TextInputStyle.Short)
      .setValue(event.title)
      .setRequired(true);
    const times = new TextInputBuilder()
      .setCustomId("times")
      .setStyle(TextInputStyle.Short)
      .setValue(`${event.startTime.toISOString()}-${event.endTime.toISOString()}`)
      .setRequired(true);
    const description = new TextInputBuilder()
      .setCustomId("description")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(event.description)
      .setRequired(true);
    const routes = new TextInputBuilder()
      .setCustomId("routes")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(event.routes ?? "")
      .setRequired(false);
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`general-event-edit-form:${uuid}`)
        .setTitle("Edit OAV Event")
        .addLabelComponents(
          new LabelBuilder().setLabel("Event title").setTextInputComponent(title),
          new LabelBuilder().setLabel("Start time - End time (Z)").setTextInputComponent(times),
          new LabelBuilder().setLabel("Short description").setTextInputComponent(description),
          new LabelBuilder().setLabel("Event routes (optional)").setTextInputComponent(routes),
        ),
    );
  }

  private async editSubmit(interaction: Interaction): Promise<void> {
    if (
      !interaction.isModalSubmit() ||
      !interaction.customId.startsWith("general-event-edit-form:")
    )
      return;
    const [, uuid] = interaction.customId.split(":");
    if (!uuid) return;
    const current = await this.dataService.getGeneralEvent(uuid);
    if (!current || current.ownerId !== interaction.user.id) return;
    const match = interaction.fields.getTextInputValue("times").match(/^(.+Z)-(.+Z)$/);
    const startTime = match?.[1];
    const endTime = match?.[2];
    if (
      !startTime ||
      !endTime ||
      Number.isNaN(Date.parse(startTime)) ||
      Number.isNaN(Date.parse(endTime))
    ) {
      await interaction.reply({
        content: ":x: Use Z time: `2026-07-25T16:00:00Z-2026-07-25T19:00:00Z`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const update = {
      title: interaction.fields.getTextInputValue("title"),
      description: interaction.fields.getTextInputValue("description"),
      routes: interaction.fields.getTextInputValue("routes") || undefined,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    };
    if (current.scheduledEventId && interaction.guild) {
      await interaction.guild.scheduledEvents.edit(current.scheduledEventId, {
        name: update.title.slice(0, 100),
        description: update.description.slice(0, 1_000),
        scheduledStartTime: update.startTime,
        scheduledEndTime: update.endTime,
      });
    }
    const updated = await this.dataService.updateGeneralEvent(uuid, {
      ...update,
      ...(current.startTime.getTime() !== update.startTime.getTime()
        ? { reminderSentAt: null }
        : {}),
    });
    const channel = await this.client.channels.fetch(updated.channelId);
    if (channel?.isTextBased())
      await (
        await channel.messages.fetch(updated.messageId)
      ).edit({
        embeds: [buildGeneralEventEmbed(updated)],
        components: [createGeneralEventReminderRow(uuid)],
      });
    await interaction.reply({
      content: ":white_check_mark: Event details updated.",
      flags: MessageFlags.Ephemeral,
    });
  }

  private async cancelEvent(
    uuid: string,
    event: GeneralEvent,
    userTag: string,
    guildId?: string,
  ): Promise<void> {
    if (event.scheduledEventId && guildId) {
      const guild = await this.client.guilds.fetch(guildId);
      await guild.scheduledEvents.delete(event.scheduledEventId);
    }
    const channel = await this.client.channels.fetch(event.channelId);
    if (channel?.type === ChannelType.GuildText) {
      await channel.delete(`Event cancelled by ${userTag}`);
    }
    await this.dataService.deleteGeneralEvent(uuid);
  }

  private async cancelSelect(interaction: Interaction): Promise<void> {
    if (
      !interaction.isStringSelectMenu() ||
      !interaction.customId.startsWith("general-event-cancel:")
    )
      return;
    const [, ownerId] = interaction.customId.split(":");
    const uuid = interaction.values[0];
    if (!uuid || ownerId !== interaction.user.id) return;
    const event = await this.dataService.getGeneralEvent(uuid);
    if (!event || event.ownerId !== interaction.user.id) return;
    await interaction.deferUpdate();
    await this.cancelEvent(uuid, event, interaction.user.tag, interaction.guildId ?? undefined);
    await interaction.followUp({
      content: `:white_check_mark: **${event.title}** has been cancelled.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  private async cancelByTitle(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    if (interaction.customId === "general-event-cancel-keep") {
      await interaction.update({
        content: ":white_check_mark: The event was not cancelled.",
        components: [],
      });
      return;
    }
    if (!interaction.customId.startsWith("general-event-cancel-confirm:")) return;

    const [, uuid, ownerId] = interaction.customId.split(":");
    if (!uuid || ownerId !== interaction.user.id) return;
    const event = await this.dataService.getGeneralEvent(uuid);
    if (!event || event.ownerId !== interaction.user.id) {
      await interaction.update({
        content: ":confused: This event is no longer active.",
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();
    await this.cancelEvent(uuid, event, interaction.user.tag, interaction.guildId ?? undefined);
    await interaction.followUp({
      content: `:white_check_mark: **${event.title}** has been cancelled.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  public async handle(interaction: Interaction): Promise<void> {
    await this.editSelect(interaction);
    await this.editSubmit(interaction);
    await this.cancelSelect(interaction);
    await this.cancelByTitle(interaction);
  }
}
