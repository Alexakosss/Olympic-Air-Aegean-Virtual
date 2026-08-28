import {
  ActionRowBuilder,
  ButtonBuilder,
  type Client,
  EmbedBuilder,
  type Interaction,
  ButtonStyle,
  MessageFlags,
  Events,
} from "discord.js";
import type pino from "pino";

import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";
import { newSimpleEmbed } from "@/utils/discord.utils.ts";
import { OAV_LOGO_URL } from "@/constants/constants.ts";
import { formatStaffupPositions } from "@/utils/positions.utils.ts";
import { gDuration, toDiscordDate } from "@/utils/time.utils.ts";

export class AcceptStaffupInteraction implements ModuleInteraction {
  constructor(
    private readonly client: Client,
    private readonly dataService: DataService,
    private readonly envCfg: EnvConfig,
    private logger: pino.Logger,
  ) {}

  public meta(): ModuleInteractionMeta {
    return {
      event: Events.InteractionCreate,
    };
  }

  private createActionRow(userId: string, uuid: string): ActionRowBuilder<ButtonBuilder> {
    const cancelStaffupButton = new ButtonBuilder()
      .setCustomId(`atc-remove-request:${uuid}:${userId}`)
      .setLabel("Remove Request")
      .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(cancelStaffupButton);
  }

  public async handle(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("atc-position-form")) return;

    const parts = interaction.customId.split(":");

    if (parts.length !== 3) return;

    const [_, uuid, picked] = parts;

    if (!uuid || !picked) return;

    const staffupEntry = await this.dataService.getStaffUpByUUID(uuid);

    if (!staffupEntry) return;

    const positionRegistered = staffupEntry.positions.some(
      (pos) => pos.userId === interaction.user.id && pos.position === picked,
    );

    if (positionRegistered) {
      const embed: EmbedBuilder = new EmbedBuilder()
        .setTitle("Position already selected")
        .setThumbnail(OAV_LOGO_URL)
        .setDescription(
          `<@${interaction.user.id}> you have already selected the \`${picked}\` position.`,
        )
        .setColor("#dc2626")
        .setFooter({
          text: "Olympic Air Aegean Airlines Virtual",
          iconURL: OAV_LOGO_URL,
        })
        .setTimestamp();
      await interaction.reply({
        embeds: [embed],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const updatedEntry = await this.dataService.updateStaffUpPositions(uuid, [
      ...staffupEntry.positions,
      {
        userId: interaction.user.id,
        position: picked,
        notes: interaction.fields.getTextInputValue("atc-position-notes"),
      },
    ]);

    const actionRow = this.createActionRow(interaction.user.id, uuid);

    const embed = newSimpleEmbed()
      .setTitle(`Selected position for the ${staffupEntry.staffup.title} event`)
      .setDescription(
        `<@${interaction.user.id}> you successfully picked the \`${picked}\` position.`,
      )
      .setColor("#16a34a");

    await interaction.user.send({
      embeds: [embed],
      components: [actionRow],
    });

    await interaction.reply({
      content: ":white_check_mark: Actions performed.",
      flags: [MessageFlags.Ephemeral],
    });

    const staffupChannel = await this.client.channels.fetch(this.envCfg.STAFFUP_CHANNEL_ID);

    if (!staffupChannel || !staffupChannel.isTextBased()) {
      return this.logger.error("Channel not found or is not a text channel.");
    }

    const msg = await staffupChannel.messages.fetch(`${staffupEntry.staffup.messageId}`);

    const sTime = `${staffupEntry.staffup.startTime.toISOString()}`;
    const eTime = `${staffupEntry.staffup.startTime.toISOString()}`;

    const embedA = newSimpleEmbed()
      .setTitle("New Staffup Event")
      .setImage(staffupEntry.staffup.thumbnailUrl ?? null)
      .addFields(
        {
          name: "Title",
          value: `${staffupEntry.staffup.title}`,
          inline: false,
        },
        {
          name: "Time Start in Zulu / Local time",
          value: `${staffupEntry.staffup.startTime} / ${toDiscordDate(new Date(staffupEntry.staffup.startTime ?? ""))}`,
          inline: false,
        },
        {
          name: "Time End in Zulu / Local time",
          value: `${staffupEntry.staffup.endTime} / ${toDiscordDate(new Date(staffupEntry.staffup.endTime ?? ""))} (length: ${gDuration(sTime ?? "", eTime ?? "")})`,
          inline: false,
        },
      );

    if (staffupEntry.staffup.description) {
      embedA.addFields({
        name: "Description",
        value: `${staffupEntry.staffup.description}`,
        inline: false,
      });
    }

    embedA.addFields({
      name: "Preferred positions",
      value: `${staffupEntry.staffup.positions.join(" ")}`,
      inline: false,
    });

    embedA.addFields({
      name: "Confirmed positions",
      value: formatStaffupPositions(updatedEntry.positions, "No positions are filled yet"),
      inline: false,
    });

    if (staffupEntry.positions.length == staffupEntry.staffup.positions.length) {
      await msg.edit({
        embeds: [embedA],
        content: ":white_check_mark: Staff-up positions filled",
      });
    } else {
      await msg.edit({ embeds: [embedA] });
    }

    if (staffupEntry.staffup.ownerMessageId) {
      const owner = await this.client.users.fetch(staffupEntry.staffup.ownerId);

      if (!owner.dmChannel) return;

      const ownerMsg = await owner.dmChannel.messages.fetch(staffupEntry.staffup.ownerMessageId);

      // +1 is the one we stored now, no need to read again
      const uniquePositions = new Set(staffupEntry.positions.map((pos) => pos.position)).size + 1;

      // 5 positions / 100% = 20% for each
      const percentage = 20 * uniquePositions;

      const ownerEmbed = newSimpleEmbed()
        .setTitle(`${staffupEntry.staffup.title} event dashboard`)
        .setDescription(
          `Hello <@${owner.id}>, this is the dashboard in which you will see updates about your staff-up event.`,
        )
        .setFields(
          {
            name: "Progress",
            value: `${percentage !== 0 ? `You are ${percentage}% there!` : "Start by choosing a position to fill the progress bar."}`,
          },
          {
            name: "Positions",
            value: formatStaffupPositions(
              updatedEntry.positions,
              "No positions have been selected yet.",
              true,
            ),
          },
        );

      await ownerMsg.edit({
        embeds: [ownerEmbed],
      });
    }
  }
}
