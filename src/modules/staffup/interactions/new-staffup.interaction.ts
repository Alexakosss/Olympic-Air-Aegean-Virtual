import {
  ActionRowBuilder,
  type Client,
  Events,
  type Interaction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { MessageFlags } from "discord.js";

import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { StaffUp } from "@/schemas/staffup.schema.ts";
import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";
import { newSimpleEmbed } from "@/utils/discord.utils.ts";
import { gDuration, toDiscordDate } from "@/utils/time.utils.ts";

export class NewStaffupInteraction implements ModuleInteraction {
  constructor(
    private readonly allowedPositions: Map<string, void>,
    private readonly dataService: DataService,
    private readonly envCfg: EnvConfig,
    private readonly client: Client,
  ) {}

  public meta(): ModuleInteractionMeta {
    return {
      event: Events.InteractionCreate,
    };
  }

  private createActionRow(
    positionList: string[],
    uuid: string,
  ): ActionRowBuilder<StringSelectMenuBuilder> {
    const stringOptions: StringSelectMenuOptionBuilder[] = [];

    for (const pos of positionList) {
      stringOptions.push(new StringSelectMenuOptionBuilder().setLabel(pos).setValue(pos));
    }

    const positionSelector = new StringSelectMenuBuilder()
      .setCustomId(`atc-position:${uuid}`)
      .setPlaceholder("Select a position")
      .setOptions(stringOptions);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(positionSelector);
  }

  public async handle(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "new-atc-staffup-modal") return;

    type TimeRange = {
      start: string;
      end: string;
    };

    const timeRange = interaction.fields.getTextInputValue("event-time");
    const match = timeRange.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$/i,
    );

    if (!match) {
      await interaction.reply({
        flags: [MessageFlags.Ephemeral],
        content: ":x: Invalid time.",
      });
      return;
    }

    function parseZuluRange(input: string): TimeRange | null {
      if (!match) {
        return null;
      }

      const start = match[1]!;
      const end = match[2]!;

      if (!start || !end) {
        return null;
      }

      if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
        if (interaction.isRepliable()) {
          interaction.reply({
            flags: [MessageFlags.Ephemeral],
            content: ":x: Invalid time format. Please check your inputs and try again.",
          });
          return null;
        }
      }

      return { start, end };
    }

    const time = parseZuluRange(interaction.fields.getTextInputValue("event-time"));

    if (!time) return;

    const positions = interaction.fields.getTextInputValue("event-positions").trim().split(",");

    if (positions.length < 5) {
      await interaction.reply({
        flags: [MessageFlags.Ephemeral],
        content: ":x: At least 5 positions are required.",
      });
      return;
    }

    for (const pos of positions) {
      if (!this.allowedPositions.has(pos)) {
        await interaction.reply({
          flags: [MessageFlags.Ephemeral],
          content: `:x: Invalid position: \`${pos}\``,
        });
        return;
      }
    }

    const embed = newSimpleEmbed()
      .setTitle("New Staffup Event")
      .setImage(interaction.fields.getUploadedFiles("event-picture")?.first()?.url ?? null)
      .addFields(
        {
          name: "Title",
          value: `${interaction.fields.getTextInputValue("event-title")}`,
          inline: false,
        },
        {
          name: "Time Start in Zulu / Local time",
          value: `${time?.start} / ${toDiscordDate(new Date(time?.start ?? ""))}`,
          inline: false,
        },
        {
          name: "Time End in Zulu / Local time",
          value: `${time?.end} / ${toDiscordDate(new Date(time?.end ?? ""))} (length: ${gDuration(time?.start ?? "", time?.end ?? "")})`,
          inline: false,
        },
      );

    if (interaction.fields.getTextInputValue("event-description")) {
      embed.addFields({
        name: "Description",
        value: `${interaction.fields.getTextInputValue("event-description")}`,
        inline: false,
      });
    }

    embed.addFields({
      name: "Preferred positions",
      value: `${interaction.fields.getTextInputValue("event-positions").replaceAll(",", " ")}`,
      inline: false,
    });

    const channel = await this.client.channels.fetch(this.envCfg.STAFFUP_CHANNEL_ID);

    if (channel && channel.isSendable()) {
      const staffup: StaffUp = {
        title: interaction.fields.getTextInputValue("event-title"),
        description: interaction.fields.getTextInputValue("event-description"),
        startTime: new Date(time?.start ?? ""),
        endTime: new Date(time?.end ?? ""),
        ownerId: interaction.user.id,
        thumbnailUrl: interaction.fields.getUploadedFiles("event-picture")?.first()?.url,
        positions: positions,
      };

      const uuid = await this.dataService.createStaffUp(staffup);
      const actionRow = this.createActionRow(positions, uuid);

      const msg = await channel.send({
        embeds: [embed],
        components: [actionRow],
      });

      await interaction.reply({
        content: ":white_check_mark: Staffup event created! View it here: " + msg.url,
        flags: [MessageFlags.Ephemeral],
      });

      await this.dataService.updateStaffUp(uuid, {
        messageId: msg.id,
      });

      const userEmbed = newSimpleEmbed()
        .setTitle(`${staffup.title} event dashboard`)
        .setDescription(
          `Hello <@${interaction.user.id}>, this is the dashboard in which you will see updates about your staff-up event.`,
        )
        .setFields(
          {
            name: "Progress",
            value: "Start by choosing a position to fill the progress bar.",
          },
          {
            name: "Positions",
            value: "No positions have been selected yet.",
          },
        );

      const dm = await interaction.user.send({
        embeds: [userEmbed],
      });

      await this.dataService.updateStaffUp(uuid, {
        ownerMessageId: dm.id,
      });

      return;
    }

    await interaction.reply({
      content: ":x: Channel for staffup events not found, please contact a member of the team.",
      flags: [MessageFlags.Ephemeral],
    });
  }
}
