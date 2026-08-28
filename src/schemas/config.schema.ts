import { z } from "zod";

export const envConfigSchema = z.object({
  BOT_ID: z.string().min(1),
  BOT_TOKEN: z.string().min(1),
  POSITIONS_CONFIG_PATH: z.string().min(1),
  JSON_STORE_PATH: z.string().min(1),
  STAFFUP_CHANNEL_ID: z.string().min(1),
  EVENTS_APPROVAL_CHANNEL_ID: z.string().min(1),
  GUILD_ID: z.string().min(1),
  GENERAL_EVENTS_CATEGORY_ID: z.string().min(1),
  EVENT_ORGANIZER_ROLE_ID: z.string().min(1),
  EVENT_ORGANIZER_PANEL_CHANNEL_ID: z.string().min(1),
});

export const aiportConfigSchema = z.object({
  icao: z.string().min(1),
  positions: z.array(z.enum(["DEL", "GND", "TWR", "APP"])),
});

export const radarConfigSchema = z.object({
  name: z.string().min(1),
});

export const positionsConfigSchema = z.object({
  airports: z.array(aiportConfigSchema),
  radar: z.array(radarConfigSchema),
});

export type EnvConfig = z.infer<typeof envConfigSchema>;
export type PositionsConfig = z.infer<typeof positionsConfigSchema>;
