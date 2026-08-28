import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AttachmentBuilder,
  type BaseMessageOptions,
  EmbedBuilder,
  type GuildMember,
} from "discord.js";

import { OAV_WEBSITE_URL } from "../constants/constants.ts";

const OAV_LOGO_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/oav-logo.png",
);

export const OAV_LOGO_FILE_NAME = "oav-logo.png";
export const OAV_LOGO_ATTACHMENT_URL = `attachment://${OAV_LOGO_FILE_NAME}`;

export const createOavLogoFile = (): AttachmentBuilder =>
  new AttachmentBuilder(OAV_LOGO_PATH, { name: OAV_LOGO_FILE_NAME });

export const withOavLogo = <T extends BaseMessageOptions>(options: T): T => ({
  ...options,
  files: [createOavLogoFile(), ...(options.files ?? [])],
});

export const newSimpleEmbed = (): EmbedBuilder => {
  return new EmbedBuilder()
    .setAuthor({
      name: "Olympic Air Aegean Airlines Virtual",
      iconURL: OAV_LOGO_ATTACHMENT_URL,
      url: OAV_WEBSITE_URL,
    })
    .setThumbnail(OAV_LOGO_ATTACHMENT_URL)
    .setColor("#003087")
    .setFooter({
      text: "Olympic Air Aegean Airlines Virtual",
      iconURL: OAV_LOGO_ATTACHMENT_URL,
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
