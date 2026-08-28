import type { Client } from "discord.js";
import { inject, injectable } from "inversify";
import type { Logger } from "pino";

import { SYMBOLS } from "@/constants/constants.ts";
import { CallsignInteraction } from "@/modules/callsign/interactions/callsign.interaction.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import { VatsimService } from "@/service/vatsim.service.ts";
import type { DataService } from "@/types/data.types.ts";
import type { Module, CommandGroup, ModuleInteraction } from "@/types/module.types.ts";

@injectable()
export class CallsignModule implements Module {
  public commands: CommandGroup[] = [];
  public interactions: ModuleInteraction[] = [];

  constructor(
    @inject(SYMBOLS.EnvConfig)
    envConfig: EnvConfig,
    @inject(SYMBOLS.Client)
    client: Client,
    @inject(SYMBOLS.DataService)
    dataService: DataService,
    @inject(VatsimService)
    vatsimService: VatsimService,
    @inject(SYMBOLS.Logger)
    logger: Logger,
  ) {
    const callsignInter = new CallsignInteraction(
      client,
      envConfig,
      dataService,
      logger,
      vatsimService,
    );
    this.interactions.push(callsignInter);
  }
}
