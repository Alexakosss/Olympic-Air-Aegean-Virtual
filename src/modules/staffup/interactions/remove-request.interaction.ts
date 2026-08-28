import { type Interaction, type Client, MessageFlags, Events } from "discord.js";
import type { Logger } from "pino";

import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";
import { newSimpleEmbed, withOavLogo } from "@/utils/discord.utils.ts";
import { formatStaffupPositions } from "@/utils/positions.utils.ts";
import { toDiscordDate, gDuration } from "@/utils/time.utils.ts";

export class RemoveRequestInteraction implements ModuleInteraction {
  constructor(
    private readonly client: Client,
    private readonly dataService: DataService,
    private readonly envCfg: EnvConfig,
    private logger: Logger,
  ) {}

  public meta(): ModuleInteractionMeta {
    return {
      event: Events.InteractionCreate,
    };
  }

  public async handle(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("atc-remove-request")) return;

    const parts = interaction.customId.split(":");

    if (parts.length !== 3) return;

    const [_, uuid, userId] = parts;

    if (!userId || !uuid) return;

    const staffUpEntry = await this.dataService.getStaffUpByUUID(uuid);

    if (!staffUpEntry) return;

    const positionToRemove = staffUpEntry.positions.find((pos) => pos.userId === userId);

    if (!positionToRemove) return;

    if (positionToRemove.userId !== interaction.user.id) {
      await interaction.reply({
        content: `:warning: Hey <@${interaction.user.id}>, this remove button is not for you!`,
      });
    }

    const newPositions = staffUpEntry.positions.filter((pos) => pos.userId !== interaction.user.id);

    const updatedEntry = await this.dataService.updateStaffUpPositions(uuid, newPositions);

    const embed = newSimpleEmbed()
      .setTitle("Position removed")
      .setDescription(
        `User <@${interaction.user.id}> removed their request for the \`${positionToRemove.position}\` position.`,
      )
      .setColor("#eab308");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userEmbed = embed.setDescription(
      `Hey <@${interaction.user.id}>!\n\nJust sending you this message to confirm you removed your request for the \`${positionToRemove.position}\` position.`,
    );

    const staffupChannel = await this.client.channels.fetch(this.envCfg.STAFFUP_CHANNEL_ID);

    if (!staffupChannel || !staffupChannel.isTextBased()) {
      return this.logger.error("Channel not found or is not a text channel.");
    }
    const msg = await staffupChannel?.messages.fetch(`${staffUpEntry.staffup.messageId}`);

    const sTime = `${staffUpEntry.staffup.startTime.toISOString()}`;
    const eTime = `${staffUpEntry.staffup.startTime.toISOString()}`;

    const embedA = newSimpleEmbed()
      .setTitle("New Staffup Event")
      .setImage(staffUpEntry.staffup.thumbnailUrl ?? null)
      .addFields(
        {
          name: "Title",
          value: `${staffUpEntry.staffup.title}`,
          inline: false,
        },
        {
          name: "Time Start in Zulu / Local time",
          value: `${staffUpEntry.staffup.startTime} / ${toDiscordDate(new Date(staffUpEntry.staffup.startTime ?? ""))}`,
          inline: false,
        },
        {
          name: "Time End in Zulu / Local time",
          value: `${staffUpEntry.staffup.endTime} / ${toDiscordDate(new Date(staffUpEntry.staffup.endTime ?? ""))} (length: ${gDuration(sTime ?? "", eTime ?? "")})`,
          inline: false,
        },
      );

    if (staffUpEntry.staffup.description) {
      embedA.addFields({
        name: "Description",
        value: `${staffUpEntry.staffup.description}`,
        inline: false,
      });
    }

    embedA.addFields({
      name: "Preferred positions",
      value: `${staffUpEntry.staffup.positions.join(" ")}`,
      inline: false,
    });
    embedA.addFields({
      name: "Confirmed positions",
      value: formatStaffupPositions(updatedEntry.positions, "No positions are filled yet"),
      inline: false,
    });
    if (staffUpEntry.positions.length == staffUpEntry?.staffup.positions.length) {
      await msg.edit(
        withOavLogo({
          embeds: [embedA],
          content: ":white_check_mark: Staff-up positions filled",
        }),
      );
    } else {
      await msg.edit(withOavLogo({ embeds: [embedA] }));
    }

    try {
      await interaction.user.send(
        withOavLogo({
          embeds: [userEmbed],
        }),
      );
    } catch {}

    if (staffUpEntry.staffup.ownerMessageId) {
      const owner = await this.client.users.fetch(staffUpEntry.staffup.ownerId);

      if (!owner.dmChannel) return;

      const ownerMsg = await owner.dmChannel.messages.fetch(staffUpEntry.staffup.ownerMessageId);

      // -1 is the one we removed now, no need to read again
      const uniquePositions = new Set(staffUpEntry.positions.map((pos) => pos.position)).size - 1;

      // 5 positions / 100% = 20% for each
      const percentage = 20 * uniquePositions;

      const ownerEmbed = newSimpleEmbed()
        .setTitle(`${staffUpEntry.staffup.title} event dashboard`)
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

      await ownerMsg.edit(
        withOavLogo({
          embeds: [ownerEmbed],
        }),
      );
    }

    await interaction.deleteReply();
  }
}
