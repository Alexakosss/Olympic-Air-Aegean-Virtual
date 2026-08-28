import { type Client, Events, type Interaction } from "discord.js";
import type { Logger } from "pino";

import { CallsignService } from "@/modules/callsign/service/callsign.service.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { VatsimService } from "@/service/vatsim.service.ts";
import type { DataService } from "@/types/data.types.ts";
import type { ModuleInteraction, ModuleInteractionMeta } from "@/types/module.types.ts";

export class CallsignInteraction implements ModuleInteraction {
  private callsignService: CallsignService;

  constructor(
    client: Client,
    envConfig: EnvConfig,
    dataService: DataService,
    logger: Logger,
    vatsimService: VatsimService,
  ) {
    this.callsignService = new CallsignService(
      client,
      envConfig,
      dataService,
      logger,
      vatsimService,
    );
  }

  public meta(): ModuleInteractionMeta {
    return {
      event: Events.ClientReady,
      once: true,
    };
  }

  public async handle(_: Interaction) {
    await this.callsignService.start();
  }
}
