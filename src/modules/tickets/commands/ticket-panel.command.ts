import {
  ActionRowBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandChannelOption,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import { ticketCategories } from "@/modules/tickets/ticket.constants.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { Command, CommandMeta } from "@/types/module.types.ts";
import { newSimpleEmbed, withOavLogo } from "@/utils/discord.utils.ts";

export class TicketPanelCommand implements Command {
  constructor(private readonly envCfg: EnvConfig) {}

  public meta(): CommandMeta {
    return {
      name: "panel",
      description: "Post the ticket panel in the specified channel.",
      options: [
        new SlashCommandChannelOption()
          .setName("channel")
          .setDescription("The channel where the ticket panel will be posted.")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ],
    };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member;
    const canPost = Boolean(
      interaction.inGuild() &&
        member &&
        "permissions" in member &&
        typeof member.permissions !== "string" &&
        (member.permissions.has(PermissionFlagsBits.ManageChannels) ||
          ("cache" in member.roles &&
            member.roles.cache.has(this.envCfg.TICKETS_SUPPORT_ROLE_ID))),
    );
    if (!canPost) {
      await interaction.reply({
        content: ":x: Only support staff can post the ticket panel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectedChannel = interaction.options.getChannel("channel", true);
    const channel = await interaction.guild?.channels.fetch(selectedChannel.id);

    if (!channel || !channel.isTextBased() || !channel.isSendable()) {
      await interaction.reply({
        content: ":x: Please choose a text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed: EmbedBuilder = newSimpleEmbed()
      .setTitle("🎫 OAV Support")
      .setDescription(
        [
          "👋 Welcome! If you wish to submit a request or have any questions, you may use this ticket tool.",
          "✨ It is simple, fast, and efficient for us.",
          "",
          "📋 **How it works**",
          "1️⃣ Select a category below",
          "2️⃣ Tell us how we can help",
          "3️⃣ Our team will join you in your private ticket",
          "",
          "🌐 For general information, visit [Olympic Air Aegean Airlines Virtual](https://www.oav.gr/).",
        ].join("\n"),
      )
      .setColor("#003087");

    const categoryMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket-category")
      .setPlaceholder("🎫 Select a support category")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(ticketCategories.general.label)
          .setDescription(ticketCategories.general.description)
          .setValue("general")
          .setEmoji(ticketCategories.general.emoji),
        new StringSelectMenuOptionBuilder()
          .setLabel(ticketCategories.report.label)
          .setDescription(ticketCategories.report.description)
          .setValue("report")
          .setEmoji(ticketCategories.report.emoji),
        new StringSelectMenuOptionBuilder()
          .setLabel(ticketCategories.technical.label)
          .setDescription(ticketCategories.technical.description)
          .setValue("technical")
          .setEmoji(ticketCategories.technical.emoji),
      );

    await channel.send(
      withOavLogo({
        embeds: [embed],
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu)],
      }),
    );
    await interaction.reply({
      content: `:white_check_mark: Ticket panel posted in ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
