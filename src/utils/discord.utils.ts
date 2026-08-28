import { EmbedBuilder, type GuildMember } from "discord.js";

import { OAV_LOGO_URL } from "../constants/constants.ts";

export const newSimpleEmbed = (): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle("Olympic Air Aegean Airlines Virtual")
    .setThumbnail(OAV_LOGO_URL)
    .setColor("#3b82f6")
    .setFooter({
      text: "Olympic Air Aegean Airlines Virtual",
      iconURL: OAV_LOGO_URL,
    })
    .setTimestamp();
};

export const extractUserId = (raw: string | null): string => {
  if (!raw) throw new Error("ID must be defined");
  const match = raw.match(/<@!?(\d{17,19})>/);
  if (!match) throw new Error("ID is not valid!");
  const id = match[1];
  if (!id) throw new Error("ID is not valid!");
  return id;
};

export const createCallsignName = (cid: string, callsign: string, name: string): string => {
  if (name === `|${cid}|`) {
    return `${cid} - ${name}`;
  }
  const freeLetters = 32 - (callsign.length + cid.length + 6); // 4x space + 2x dash
  const remainingName = name.substring(0, freeLetters);
  return `${callsign} - ${remainingName} - ${cid}`;
};

export const getMemberName = (member: GuildMember): string => {
  if (member.nickname) {
    return member.nickname;
  }
  return member.displayName;
};

export const extractNameFromCallsignName = (callsignName: string): string => {
  try {
    const hasName = callsignName.split("-").length >= 2;
    if (!hasName) return "";
    const callsignFreeName = callsignName.substring(callsignName.indexOf("-") + 2);
    return callsignFreeName.substring(callsignName.lastIndexOf("-") - 8);
  } catch {
    return "";
  }
};
