import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  StringSelectMenuBuilder,
} from "discord.js";

import { type Event } from "@/schemas/events.schema.ts";
import type { Command, CommandMeta } from "@/types/module.types.ts";
import { newSimpleEmbed } from "@/utils/discord.utils.ts";
import { gDuration, unix } from "@/utils/time.utils.ts";

export class SendEventsCommand implements Command {
  public meta(): CommandMeta {
    return {
      name: "send",
      description: "Send the events embed.",
    };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = newSimpleEmbed().setTitle("OAV Events");

    const events: Event[] = [
      {
        name: "Bougatsa Express",
        url: "https://www.oav.gr/",
        startTime: "2026-07-22 15:30",
        endTime: "2026-07-22 18:25",
        ownerId: "23424234234234234",
        description:
          "All flights outbound from Karpathos towards Athenshave included bougatsa catering for both the pilots and the passengers.",
        airports: ["LGAV", "LIRF"],
      },
      {
        name: "Athens Invasion",
        url: "https://www.oav.gr/",
        startTime: "2026-12-22 13:30",
        endTime: "2026-12-22 18:00",
        ownerId: "23424234234234234",
        description:
          "Join us in this adventure to bring aliens from the outer space into the Athens Eleftherios Venizelos arrivals gates!",
        airports: ["LGAV"],
      },
    ];

    const output = events
      .map((event) => {
        const airports = event.airports.map((airport) => `✈️ ${airport}\n`);

        return [
          `✈️ [${event.name}](${event.url})\n`,
          `⌛ Start time: <t:${unix(event.startTime)}:F>`,
          `⌛ End time: <t:${unix(event.endTime)}:F> (length: ${gDuration(event.startTime, event.endTime)})\n`,
          `📜 Short description:`,
          event.description,
          "",
          `🛫 Airports:`,
          airports,
        ].join("\n");
      })
      .join("\n-----------------------------------------\n");

    embed.setDescription(output);

    const event = new StringSelectMenuBuilder()
      .setCustomId("event-participation-all-events")
      .setPlaceholder("Choose an event...")
      .setOptions(
        events.map((event) => {
          const date = new Date(`${event.startTime.replace(" ", "T")}:00Z`);

          const dateF = date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            timeZone: "UTC",
          });

          return {
            label: `${event.name} (${dateF})`,
            value: event.name,
            emoji: "✈️",
          };
        }),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(event);

    await interaction.reply({ embeds: [embed], components: [row] });
  }
}
