import type { Client } from "discord.js";
import { inject, injectable } from "inversify";

import { SYMBOLS } from "@/constants/constants.ts";
import { CreateEventCommand } from "@/modules/events/commands/create-event.command.ts";
import { ManageEventCommand } from "@/modules/events/commands/manage-event.command.ts";
import { SendEventsCommand } from "@/modules/events/commands/send-events.command.ts";
import { CreateEventInteraction } from "@/modules/events/interactions/create-event.interaction.ts";
import {
  GeneralEventReminderInteraction,
  GeneralEventReminderMonitor,
} from "@/modules/events/interactions/general-event-reminder.interaction.ts";
import { ManageEventInteraction } from "@/modules/events/interactions/manage-event.interaction.ts";
import { SelectEventInteraction } from "@/modules/events/interactions/select-event.interaction.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { DataService } from "@/types/data.types.ts";
import type { Module, CommandGroup, ModuleInteraction } from "@/types/module.types.ts";

@injectable()
export class EventsModule implements Module {
  public commands: CommandGroup[] = [];
  public interactions: ModuleInteraction[] = [];

  constructor(
    @inject(SYMBOLS.EnvConfig) envConfig: EnvConfig,
    @inject(SYMBOLS.Client) client: Client,
    @inject(SYMBOLS.DataService) dataService: DataService,
  ) {
    const sendEventsCmd = new SendEventsCommand();
    const createEventCmd = new CreateEventCommand(envConfig);
    const editEventCmd = new ManageEventCommand("edit", dataService);
    const cancelEventCmd = new ManageEventCommand("cancel", dataService);

    this.commands.push({
      name: "events",
      description: "Event management commands.",
      commands: [sendEventsCmd, createEventCmd, editEventCmd, cancelEventCmd],
    });

    const selectEventInteraction = new SelectEventInteraction();
    const createEventInteraction = new CreateEventInteraction(client, envConfig, dataService);
    const manageEventInteraction = new ManageEventInteraction(client, dataService, envConfig);
    const generalEventReminderInteraction = new GeneralEventReminderInteraction(dataService);
    const generalEventReminderMonitor = new GeneralEventReminderMonitor(client, dataService);
    this.interactions.push(selectEventInteraction);
    this.interactions.push(createEventInteraction);
    this.interactions.push(manageEventInteraction);
    this.interactions.push(generalEventReminderInteraction);
    this.interactions.push(generalEventReminderMonitor);
  }
}
