import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import type { DataService } from "@/types/data.types.ts";
import type { Command, CommandMeta } from "@/types/module.types.ts";
import { newSimpleEmbed, withOavLogo } from "@/utils/discord.utils.ts";
import { formatStaffupPositions } from "@/utils/positions.utils.ts";
import { toDiscordDate } from "@/utils/time.utils.ts";

export class GetStaffupsCommand implements Command {
  constructor(private readonly dataService: DataService) {}

  public meta(): CommandMeta {
    return {
      name: "get",
      description: "Get all active ATC staff-ups.",
    };
  }

  public async execute(interaction: ChatInputCommandInteraction) {
    const staffups = await this.dataService.getStaffUps();

    const embeds: EmbedBuilder[] = [];

    if (Object.keys(staffups).length == 0) {
      await interaction.reply({
        content: ":confused: No staffups found.",
      });
      return;
    }

    for (const entry of staffups) {
      const { positions, staffup } = entry;

      const embed = newSimpleEmbed()
        .setTitle(staffup.title)
        .setFields(
          {
            name: "Start time",
            value: `Zulu: ${new Date(staffup.startTime).toISOString()}\nLocal: ${toDiscordDate(new Date(staffup.startTime))}`,
          },
          {
            name: "Required Positions",
            value: staffup.positions.join(" "),
          },
          {
            name: "Current Positions",
            value: formatStaffupPositions(positions, "No positions have been selected yet."),
          },
        );

      if (staffup.description) {
        embed.addFields({
          name: "Description",
          value: staffup.description,
        });
      }

      embeds.push(embed);
    }

    await interaction.reply(withOavLogo({ embeds }));
  }
}
