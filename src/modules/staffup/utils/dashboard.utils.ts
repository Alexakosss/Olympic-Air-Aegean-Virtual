import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const createStaffupDashboardRow = (
  uuid: string,
  userId: string,
): ActionRowBuilder<ButtonBuilder> =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`staffup-dashboard-edit:${uuid}:${userId}`)
      .setLabel("Edit Event")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`staffup-dashboard-suggest-roster:${uuid}:${userId}`)
      .setLabel("Suggest Roster")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`staffup-dashboard-roster:${uuid}:${userId}`)
      .setLabel("Roster")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`staffup-dashboard-cancel:${uuid}:${userId}`)
      .setLabel("Cancel Event")
      .setStyle(ButtonStyle.Danger),
  );
