import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

import { GENERAL_EVENT_FOOTER } from "@/modules/events/event.constants.ts";
import type { GeneralEvent } from "@/schemas/events.schema.ts";
import { newSimpleEmbed } from "@/utils/discord.utils.ts";
import { gDuration, toDiscordDate } from "@/utils/time.utils.ts";

export const createGeneralEventReminderRow = (uuid: string): ActionRowBuilder<ButtonBuilder> =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`general-event-remind:${uuid}`)
      .setEmoji("🔔")
      .setLabel("Remind Me!")
      .setStyle(ButtonStyle.Primary),
  );

const eventTimeFields = (event: GeneralEvent) => {
  const start = event.startTime.toISOString();
  const end = event.endTime.toISOString();
  return [
    {
      name: "🕐 Start — Z / Local",
      value: `${start}\n${toDiscordDate(event.startTime)}`,
      inline: false,
    },
    {
      name: "🏁 End — Z / Local",
      value: `${end}\n${toDiscordDate(event.endTime)}\n⌛ ${gDuration(start, end)}`,
      inline: false,
    },
  ];
};

export const buildGeneralEventEmbed = (event: GeneralEvent): EmbedBuilder => {
  const embed = newSimpleEmbed()
    .setTitle("✈️ New OAV Event")
    .setColor("#2388c9")
    .setImage(event.imageUrl ?? null)
    .setDescription(GENERAL_EVENT_FOOTER)
    .addFields({ name: "📝 Title", value: event.title, inline: false }, ...eventTimeFields(event), {
      name: "📄 Short Description",
      value: event.description,
      inline: false,
    });

  if (event.routes) {
    embed.addFields({ name: "🗺️ Event Routes", value: event.routes, inline: false });
  }
  return embed;
};

export const buildGeneralEventReminderEmbed = (event: GeneralEvent): EmbedBuilder => {
  const embed = newSimpleEmbed()
    .setTitle(`✈️ Thank you for sharing your interest — ${event.title}`)
    .setColor("#2388c9")
    .setDescription(
      [
        "Thank you for sharing your interest in our event. Below is a preview of the event details.",
        "",
        "🔔 You will receive a reminder notification one hour before the event.",
        "",
        "**For more information, please visit [Olympic Air Aegean Airlines Virtual](https://www.oav.gr/).**",
      ].join("\n"),
    )
    .addFields(...eventTimeFields(event));

  if (event.routes) {
    embed.addFields({ name: "🗺️ Route", value: event.routes, inline: false });
  }
  return embed;
};
