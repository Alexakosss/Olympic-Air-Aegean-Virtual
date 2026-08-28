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
      .setTitle("OAV Support")
      .setDescription(
        [
          "If you wish to submit a request or have any questions, you may use this ticket tool.",
          "It is simple, fast, and efficient for us.",
          "",
          "For general information, visit [Olympic Air Aegean Airlines Virtual](https://www.oav.gr/).",
        ].join("\n"),
      )
      .setColor("#003087");

    const categoryMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket-category")
      .setPlaceholder("Select a support category")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("General Support")
          .setDescription("General questions and requests.")
          .setValue("general"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Training Support")
          .setDescription("Questions about training and training applications.")
          .setValue("training"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Technical Support")
          .setDescription("Website, Discord, or technical issues.")
          .setValue("technical"),
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
