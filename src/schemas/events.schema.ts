import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
  startTime: z.iso.date(),
  endTime: z.iso.date(),
  ownerId: z.string().min(1),
  description: z.string().optional(),
  airports: z.array(z.string().regex(/^[A-Z]{4}$/)),
});

export const eventEntrySchema = z.object({
  event: eventSchema,
  staffupUUID: z.string().min(1),
});

export type Event = z.infer<typeof eventSchema>;
export type EventEntry = z.infer<typeof eventEntrySchema>;

export const generalEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  routes: z.string().optional(),
  imageUrl: z.url().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  ownerId: z.string().min(1),
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  scheduledEventId: z.string().min(1).optional(),
  reminderUserIds: z.array(z.string().min(1)).default([]),
  reminderSentAt: z.coerce.date().nullable().optional(),
});

export type GeneralEvent = z.infer<typeof generalEventSchema>;
