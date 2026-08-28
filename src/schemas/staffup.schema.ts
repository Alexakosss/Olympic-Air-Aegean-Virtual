import { z } from "zod";

export const staffupSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  ownerId: z.string().min(1),
  positions: z.array(z.string()),
  thumbnailUrl: z.url().optional(),
  messageId: z.string().optional(),
  ownerMessageId: z.string().optional(),
});

export const staffupPositionsSchema = z.object({
  userId: z.string().min(1),
  position: z.string().min(1),
  notes: z.string().optional(),
});

export const staffupEntrySchema = z.object({
  staffup: staffupSchema,
  positions: z.array(staffupPositionsSchema),
});

export type StaffUp = z.infer<typeof staffupSchema>;
export type StaffUpPosition = z.infer<typeof staffupPositionsSchema>;
export type StaffUpEntry = z.infer<typeof staffupEntrySchema>;
