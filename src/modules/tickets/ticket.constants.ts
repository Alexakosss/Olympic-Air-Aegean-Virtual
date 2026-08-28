export const ticketCategories = {
  general: {
    label: "General Support",
    emoji: "💬",
    description: "General questions and requests.",
  },
  report: {
    label: "Report a member",
    emoji: "❗",
    description: "Please provide any media file/link needed for this report.",
  },
  technical: {
    label: "Technical Support",
    emoji: "🛠️",
    description: "Website, Discord, or technical issues.",
  },
} as const;

export type TicketCategory = keyof typeof ticketCategories;

export const withTicketEmoji = (category: TicketCategory, text: string): string =>
  `${ticketCategories[category].emoji} ${text}`;
