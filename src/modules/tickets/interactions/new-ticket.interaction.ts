import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

import { OAV_TICKETS_CATEGORY_ID } from "@/constants/constants.ts";
import {
  type TicketCategory,
  ticketCategories,
  withTicketEmoji,
} from "@/modules/tickets/ticket.constants.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";
import { newSimpleEmbed, withOavLogo } from "@/utils/discord.utils.ts";

const reportNotice =
  "❗ Please provide any media file or link needed for this report.";

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

  private canManageTicket(interaction: Interaction, openerId: string): boolean {
    if (!interaction.inGuild() || !interaction.member) return false;
    if (interaction.user.id === openerId) return true;

    const member = interaction.member;
    if (!("permissions" in member) || typeof member.permissions === "string") return false;

    return (
      member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      ("cache" in member.roles && member.roles.cache.has(this.envCfg.TICKETS_SUPPORT_ROLE_ID))
    );
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
        category === "report"
          ? "Describe the report and include any media file or link."
          : "Describe how we can help you.",
      );

    const modal = new ModalBuilder()
      .setCustomId(`ticket-notes:${category}`)
      .setTitle(withTicketEmoji(category, `${ticketCategories[category].label} Ticket`))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel(category === "report" ? "❗ Report details" : "📝 Details")
          .setDescription(
            category === "report"
              ? "Please provide any media file/link needed for this report."
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

    const categoryMeta = ticketCategories[category];
    const embed = newSimpleEmbed()
      .setTitle(withTicketEmoji(category, categoryMeta.label))
      .setDescription(
        [
          `👋 Welcome ${interaction.user}!`,
          "",
          "🎫 Thank you for opening a ticket. A member of our support team will be with you shortly.",
          "✨ Please add any extra details, screenshots, or links below.",
        ].join("\n"),
      )
      .addFields({ name: "📝 Details", value: notes, inline: false })
      .setColor("#003087");

    if (category === "report") {
      embed.addFields({ name: "❗ Important notice", value: reportNotice, inline: false });
    }

    const cancelButton = new ButtonBuilder()
      .setCustomId(`ticket-cancel:${interaction.user.id}`)
      .setLabel("Cancel Ticket")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger);

    await ticketChannel.send(
      withOavLogo({
        content: `👋 ${interaction.user} 🛎️ <@&${this.envCfg.TICKETS_SUPPORT_ROLE_ID}>`,
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton)],
      }),
    );
    await interaction.reply({
      content: `:white_check_mark: 🎫 Your ticket has been created: ${ticketChannel}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  private async cancelTicket(interaction: Interaction): Promise<void> {
    if (!interaction.isButton() || !interaction.customId.startsWith("ticket-cancel:")) return;

    const [, openerId] = interaction.customId.split(":");
    if (!openerId) return;

    if (!this.canManageTicket(interaction, openerId)) {
      await interaction.reply({
        content: ":x: Only the ticket opener or support staff can cancel this ticket.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      await interaction.reply({
        content: ":x: This ticket channel could not be found.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: `🗑️ Ticket cancelled by ${interaction.user}. This channel will be deleted.`,
    });

    try {
      await channel.delete("Ticket cancelled");
    } catch {
      await interaction.followUp({
        content: ":x: I could not delete this ticket channel. Please make sure I can manage channels.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  public async handle(interaction: Interaction): Promise<void> {
    await this.showNotesModal(interaction);
    await this.createTicket(interaction);
    await this.cancelTicket(interaction);
  }
}
