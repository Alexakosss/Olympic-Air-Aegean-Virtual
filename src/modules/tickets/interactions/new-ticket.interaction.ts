import {
  ChannelType,
  Events,
  type Interaction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { OAV_TICKETS_CATEGORY_ID, OAV_WEBSITE_URL } from "@/constants/constants.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";
import { newSimpleEmbed, withOavLogo } from "@/utils/discord.utils.ts";

const ticketCategories = {
  general: "General Support",
  training: "Training Support",
  technical: "Technical Support",
} as const;

type TicketCategory = keyof typeof ticketCategories;

const trainingNotice =
  `Any ticket asking to expedite a training request will be closed immediately. Visit ${OAV_WEBSITE_URL} for information before opening a ticket.`;

export class NewTicketInteraction implements ModuleInteraction {
  constructor(private readonly envCfg: EnvConfig) {}

  public meta(): ModuleInteractionMeta {
    return {
      event: Events.InteractionCreate,
    };
  }

  private isTicketCategory(value: string): value is TicketCategory {
    return value in ticketCategories;
  }

  private async showNotesModal(interaction: Interaction): Promise<void> {
    if (!interaction.isStringSelectMenu() || interaction.customId !== "ticket-category") return;

    const category = interaction.values[0];
    if (!category || !this.isTicketCategory(category)) return;

    const notes = new TextInputBuilder()
      .setCustomId("ticket-notes")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder(
        category === "training"
          ? "Describe your question. Do not request expedited training."
          : "Describe how we can help you.",
      );

    const modal = new ModalBuilder()
      .setCustomId(`ticket-notes:${category}`)
      .setTitle(`${ticketCategories[category]} Ticket`)
      .addLabelComponents(
        new LabelBuilder()
          .setLabel(category === "training" ? "Training support details" : "Details")
          .setDescription(
            category === "training"
              ? `Training-expedite requests will be closed. See ${OAV_WEBSITE_URL} first.`
              : "Please include the details needed to help you.",
          )
          .setTextInputComponent(notes),
      );

    await interaction.showModal(modal);
  }

  private async createTicket(interaction: Interaction): Promise<void> {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("ticket-notes:")) return;

    const [, category] = interaction.customId.split(":");
    if (!category || !this.isTicketCategory(category) || !interaction.guild) return;

    const notes = interaction.fields.getTextInputValue("ticket-notes");
    const channelName = `ticket-${category}-${interaction.user.username}`
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]/g, "-")
      .slice(0, 90);

    let ticketChannel;
    try {
      ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: OAV_TICKETS_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: this.envCfg.TICKETS_SUPPORT_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });
    } catch {
      await interaction.reply({
        content:
          ":x: I could not create a ticket channel. Please make sure I can manage channels in the tickets category.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = newSimpleEmbed()
      .setTitle(ticketCategories[category])
      .setDescription(`Ticket opened by ${interaction.user}.`)
      .addFields({ name: "Details", value: notes, inline: false })
      .setColor("#003087");

    if (category === "training") {
      embed.addFields({ name: "Important notice", value: trainingNotice, inline: false });
    }

    await ticketChannel.send(
      withOavLogo({
        content: `${interaction.user} <@&${this.envCfg.TICKETS_SUPPORT_ROLE_ID}>`,
        embeds: [embed],
      }),
    );
    await interaction.reply({
      content: `:white_check_mark: Your ticket has been created: ${ticketChannel}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  public async handle(interaction: Interaction): Promise<void> {
    await this.showNotesModal(interaction);
    await this.createTicket(interaction);
  }
}
