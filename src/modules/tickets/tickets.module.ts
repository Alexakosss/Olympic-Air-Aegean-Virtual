import { inject, injectable } from "inversify";

import { SYMBOLS } from "@/constants/constants.ts";
import { TicketPanelCommand } from "@/modules/tickets/commands/ticket-panel.command.ts";
import { NewTicketInteraction } from "@/modules/tickets/interactions/new-ticket.interaction.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { Module, CommandGroup, ModuleInteraction } from "@/types/module.types.ts";

@injectable()
export class TicketsModule implements Module {
  public commands: CommandGroup[] = [];
  public interactions: ModuleInteraction[] = [];

  constructor(
    @inject(SYMBOLS.EnvConfig)
    envConfig: EnvConfig,
  ) {
    const ticketPanelCmd = new TicketPanelCommand(envConfig);

    this.commands.push({
      name: "tickets",
      description: "Manage the OAV tickets system.",
      commands: [ticketPanelCmd],
    });

    const newTicketInter = new NewTicketInteraction(envConfig);
    this.interactions.push(newTicketInter);
  }
}
