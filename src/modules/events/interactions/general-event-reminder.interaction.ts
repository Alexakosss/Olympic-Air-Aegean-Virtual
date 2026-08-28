import { type Client, Events, type Interaction, MessageFlags } from "discord.js";

import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";
import { withOavLogo } from "@/utils/discord.utils.ts";

import { buildGeneralEventReminderEmbed } from "../utils/display.utils.ts";

export class GeneralEventReminderInteraction implements ModuleInteraction {
  constructor(private readonly dataService: DataService) {}

  public meta(): ModuleInteractionMeta {
    return { event: Events.InteractionCreate };
  }

  public async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isButton() || !interaction.customId.startsWith("general-event-remind:"))
      return;

    const [, uuid] = interaction.customId.split(":");
    if (!uuid) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const existingEvent = await this.dataService.getGeneralEvent(uuid);
    if (!existingEvent) {
      await interaction.editReply(":x: This event is no longer available.");
      return;
    }
    if (existingEvent.startTime <= new Date()) {
      await interaction.editReply(
        ":x: This event has already started, so a reminder cannot be added.",
      );
      return;
    }
    const event = await this.dataService.addGeneralEventReminder(uuid, interaction.user.id);
    if (!event) return;

    try {
      await interaction.user.send(
        withOavLogo({ embeds: [buildGeneralEventReminderEmbed(event)] }),
      );
      await interaction.editReply(
        ":white_check_mark: Reminder saved. I sent the event preview to your direct messages.",
      );
    } catch {
      await interaction.editReply(
        ":warning: Reminder saved, but I could not send a direct message. Please allow direct messages from this server and press **Remind Me!** again.",
      );
    }
  }
}

export class GeneralEventReminderMonitor implements ModuleInteraction {
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly client: Client,
    private readonly dataService: DataService,
  ) {}

  public meta(): ModuleInteractionMeta {
    return { event: Events.ClientReady, once: true };
  }

  private async sendDueReminders(): Promise<void> {
    const now = Date.now();
    const events = await this.dataService.getGeneralEvents();

    await Promise.all(
      events.map(async ({ uuid, event }) => {
        const millisecondsUntilStart = event.startTime.getTime() - now;
        if (
          event.reminderSentAt ||
          !event.reminderUserIds.length ||
          millisecondsUntilStart <= 0 ||
          millisecondsUntilStart > 60 * 60 * 1000
        ) {
          return;
        }

        await Promise.all(
          event.reminderUserIds.map(async (userId) => {
            try {
              const user = await this.client.users.fetch(userId);
              await user.send(
                withOavLogo({
                  embeds: [
                    buildGeneralEventReminderEmbed(event)
                      .setTitle(`🔔 Event reminder — ${event.title}`)
                      .setDescription(
                        [
                          "Your event begins in approximately one hour.",
                          "",
                          "**For more information, please visit [Olympic Air Aegean Airlines Virtual](https://www.oav.gr/).**",
                        ].join("\n"),
                      ),
                  ],
                }),
              );
            } catch {
              // A blocked DM should not stop reminders for the other interested users.
            }
          }),
        );
        await this.dataService.updateGeneralEvent(uuid, { reminderSentAt: new Date() });
      }),
    );
  }

  public async handle(): Promise<void> {
    await this.sendDueReminders();
    this.interval = setInterval(() => void this.sendDueReminders(), 60_000);
    this.interval.unref();
  }
}
