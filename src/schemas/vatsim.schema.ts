import { z } from "zod";

export const vatsimMemberSchema = z.object({
  cid: z.number(),
  callsign: z.string(),
});

export const vatsimReplySchema = z.object({
  controllers: z.array(vatsimMemberSchema),
});

export type VatsimReplySchema = z.infer<typeof vatsimReplySchema>;
