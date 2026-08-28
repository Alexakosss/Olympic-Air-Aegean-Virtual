import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  Events,
  FileUploadBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  type Interaction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { GeneralEvent } from "@/schemas/events.schema.ts";
import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";
import { newSimpleEmbed, withOavLogo } from "@/utils/discord.utils.ts";

import { OAV_EVENTS_CHANNEL_ID } from "../event.constants.ts";
import { buildGeneralEventEmbed, createGeneralEventReminderRow } from "../utils/display.utils.ts";

type ScheduleDraft = {
  title: string;
  startDate: string;
  endDate: string;
  startPeriod: number;
  endPeriod: number;
  createdAt: number;
};

const normalizeZDate = (value: string): string | undefined => {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export class CreateEventInteraction implements ModuleInteraction {
  private readonly drafts = new Map<string, ScheduleDraft>();
  constructor(
    private readonly client: Client,
    private readonly envCfg: EnvConfig,
    private readonly dataService: DataService,
  ) {}

  public meta(): ModuleInteractionMeta {
    return { event: Events.InteractionCreate };
  }

  private isOrganizer(interaction: Interaction): boolean {
    return Boolean(
      interaction.inGuild() &&
      interaction.member?.roles &&
      "cache" in interaction.member.roles &&
      interaction.member.roles.cache.has(this.envCfg.EVENT_ORGANIZER_ROLE_ID),
    );
  }

  private createDetailsModal(draft: ScheduleDraft): ModalBuilder {
    const timeOptions = (period: number) =>
      Array.from({ length: 24 }, (_, index) => {
        const totalMinutes = period * 60 + index * 30;
        const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
        const minute = totalMinutes % 60 === 0 ? "00" : "30";
        const value = `${hour}:${minute}`;
        return { label: `${value} Z`, value };
      });
    const startTime = new StringSelectMenuBuilder()
      .setCustomId("event-start-time")
      .setPlaceholder("Select start time (Z)")
      .setOptions(timeOptions(draft.startPeriod));
    const endTime = new StringSelectMenuBuilder()
      .setCustomId("event-end-time")
      .setPlaceholder("Select end time (Z)")
      .setOptions(timeOptions(draft.endPeriod));
    const description = new TextInputBuilder()
      .setCustomId("event-description")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("A short description for pilots.")
      .setRequired(true);
    const routes = new TextInputBuilder()
      .setCustomId("event-routes")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("LGAV → LIRF: KOR UL53 IXONI ... (optional)")
      .setRequired(false);
    const image = new FileUploadBuilder().setCustomId("event-image").setRequired(false);

    return new ModalBuilder()
      .setCustomId("general-event-details-form")
      .setTitle("✈️ New OAV Event — Details")
      .addLabelComponents(
        new LabelBuilder().setLabel("🕐 Start time (Z)").setStringSelectMenuComponent(startTime),
        new LabelBuilder().setLabel("🏁 End time (Z)").setStringSelectMenuComponent(endTime),
        new LabelBuilder().setLabel("📄 Short description").setTextInputComponent(description),
        new LabelBuilder().setLabel("🗺️ Event routes (optional)").setTextInputComponent(routes),
        new LabelBuilder().setLabel("🖼️ Event image (optional)").setFileUploadComponent(image),
      );
  }

  private async submitSchedule(interaction: Interaction): Promise<void> {
    if (!interaction.isModalSubmit() || interaction.customId !== "general-event-schedule-form")
      return;
    if (!this.isOrganizer(interaction)) {
      await interaction.reply({
        content: ":x: Only Event Organizers can create events.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const startDate = normalizeZDate(
      interaction.fields.getTextInputValue("event-start-date").trim(),
    );
    const endDate = normalizeZDate(interaction.fields.getTextInputValue("event-end-date").trim());
    const startPeriod = Number(interaction.fields.getStringSelectValues("event-start-period")[0]);
    const endPeriod = Number(interaction.fields.getStringSelectValues("event-end-period")[0]);
    if (!startDate || !endDate || ![0, 12].includes(startPeriod) || ![0, 12].includes(endPeriod)) {
      await interaction.reply({
        content: ":x: Choose valid Z dates and time ranges.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    this.drafts.set(interaction.user.id, {
      title: interaction.fields.getTextInputValue("event-title").trim(),
      startDate,
      endDate,
      startPeriod,
      endPeriod,
      createdAt: Date.now(),
    });
    const continueButton = new ButtonBuilder()
      .setCustomId(`general-event-details:${interaction.user.id}`)
      .setLabel("Continue to event details")
      .setStyle(ButtonStyle.Primary);
    await interaction.reply({
      content: ":white_check_mark: Schedule saved. Continue to add the event details.",
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(continueButton)],
      flags: MessageFlags.Ephemeral,
    });
  }

  private async showDetails(interaction: Interaction): Promise<void> {
    if (!interaction.isButton() || !interaction.customId.startsWith("general-event-details:"))
      return;
    const [, userId] = interaction.customId.split(":");
    const draft = this.drafts.get(interaction.user.id);
    if (userId !== interaction.user.id || !draft || Date.now() - draft.createdAt > 15 * 60 * 1000) {
      await interaction.reply({
        content: ":x: Your event schedule expired. Please run `/events create` again.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal(this.createDetailsModal(draft));
  }

  private async submitEvent(interaction: Interaction): Promise<void> {
    if (!interaction.isModalSubmit() || interaction.customId !== "general-event-details-form")
      return;
    if (!this.isOrganizer(interaction) || !interaction.guild) {
      await interaction.reply({
        content: ":x: Only Event Organizers can create events.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const draft = this.drafts.get(interaction.user.id);
    this.drafts.delete(interaction.user.id);
    if (!draft || Date.now() - draft.createdAt > 15 * 60 * 1000) {
      await interaction.reply({
        content: ":x: Your event schedule expired. Please run `/events create` again.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const startTime = interaction.fields.getStringSelectValues("event-start-time")[0];
    const endTime = interaction.fields.getStringSelectValues("event-end-time")[0];
    const start = new Date(`${draft.startDate}T${startTime}:00Z`);
    const end = new Date(`${draft.endDate}T${endTime}:00Z`);
    if (
      !startTime ||
      !endTime ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      await interaction.reply({
        content: ":x: Choose valid Z times. The end must be after the start.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const title = draft.title;
    const description = interaction.fields.getTextInputValue("event-description");
    const routes = interaction.fields.getTextInputValue("event-routes");
    const imageUrl = interaction.fields.getUploadedFiles("event-image")?.first()?.url;
    const scheduledEvent = await interaction.guild.scheduledEvents.create({
      name: title.slice(0, 100),
      description: description.slice(0, 1_000),
      scheduledStartTime: start,
      scheduledEndTime: end,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: { location: "VATSIM" },
    });

    const eventChannel = await this.client.channels.fetch(OAV_EVENTS_CHANNEL_ID);
    if (!eventChannel?.isSendable()) {
      await scheduledEvent.delete();
      throw new Error(`OAV events channel ${OAV_EVENTS_CHANNEL_ID} is unavailable or cannot receive messages.`);
    }

    const event: GeneralEvent = {
      title,
      description,
      routes: routes || undefined,
      imageUrl,
      startTime: start,
      endTime: end,
      ownerId: interaction.user.id,
      channelId: eventChannel.id,
      messageId: "pending",
      scheduledEventId: scheduledEvent.id,
      reminderUserIds: [],
      reminderSentAt: null,
    };
    const uuid = await this.dataService.createGeneralEvent(event);
    try {
      const announcement = await eventChannel.send(
        withOavLogo({
          embeds: [buildGeneralEventEmbed(event)],
          components: [createGeneralEventReminderRow(uuid)],
        }),
      );
      await this.dataService.updateGeneralEvent(uuid, { messageId: announcement.id });
    } catch (error) {
      await this.dataService.deleteGeneralEvent(uuid);
      await scheduledEvent.delete();
      throw error;
    }

    const panelChannel = await this.client.channels.fetch(
      this.envCfg.EVENT_ORGANIZER_PANEL_CHANNEL_ID,
    );
    if (panelChannel?.isSendable()) {
      await panelChannel.send(
        withOavLogo({
          content: `<@&${this.envCfg.EVENT_ORGANIZER_ROLE_ID}>`,
          embeds: [
            newSimpleEmbed()
              .setTitle("New event created")
              .setDescription(
                `**${title}** was created by ${interaction.user}.\nPosted in: <#${eventChannel.id}>`,
              )
              .setColor("#16a34a"),
          ],
        }),
      );
    }

    await interaction.reply({
      content: `:white_check_mark: Event created and posted in <#${eventChannel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  public async handle(interaction: Interaction): Promise<void> {
    await this.submitSchedule(interaction);
    await this.showDetails(interaction);
    await this.submitEvent(interaction);
  }
}
