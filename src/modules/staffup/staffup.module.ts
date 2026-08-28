import type { Client } from "discord.js";
import { inject, injectable } from "inversify";
import type { Logger } from "pino";

import { SYMBOLS } from "@/constants/constants.ts";
import { GetStaffupsCommand } from "@/modules/staffup/commands/get-staffups.command.ts";
import { NewStaffupCommand } from "@/modules/staffup/commands/new-staffup.command.ts";
import { AcceptStaffupFormInteraction } from "@/modules/staffup/interactions/accept-staffup-form.interaction.ts";
import { AcceptStaffupInteraction } from "@/modules/staffup/interactions/accept-staffup.interaction.ts";
import { NewStaffupInteraction } from "@/modules/staffup/interactions/new-staffup.interaction.ts";
import { RemoveRequestInteraction } from "@/modules/staffup/interactions/remove-request.interaction.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { DataService } from "@/types/data.types.ts";
import type { Module, CommandGroup, ModuleInteraction } from "@/types/module.types.ts";

@injectable()
export class StaffupModule implements Module {
  public commands: CommandGroup[] = [];
  public interactions: ModuleInteraction[] = [];

  constructor(
    @inject(SYMBOLS.DataService)
    dataService: DataService,
    @inject(SYMBOLS.Client)
    client: Client,
    @inject(SYMBOLS.Logger)
    logger: Logger,
    @inject(SYMBOLS.EnvConfig)
    envConfig: EnvConfig,
    @inject(SYMBOLS.PositionsMap)
    positionsMap: Map<string, void>,
  ) {
    const newStaffupCmd = new NewStaffupCommand();
    const getStaffupsCmd = new GetStaffupsCommand(dataService);

    this.commands.push({
      name: "staffup",
      description: "Manage ATC staff-ups.",
      commands: [getStaffupsCmd, newStaffupCmd],
    });

    const acceptStaffupInter = new AcceptStaffupInteraction(client, dataService, envConfig, logger);
    const acceptStaffupFormInter = new AcceptStaffupFormInteraction(dataService);
    const newStaffupInter = new NewStaffupInteraction(positionsMap, dataService, envConfig, client);
    const removeRequestInter = new RemoveRequestInteraction(client, dataService, envConfig, logger);

    this.interactions.push(acceptStaffupInter);
    this.interactions.push(acceptStaffupFormInter);
    this.interactions.push(newStaffupInter);
    this.interactions.push(removeRequestInter);
  }
}
