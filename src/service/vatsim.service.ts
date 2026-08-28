import { EventEmitter } from "events";

import { inject, injectable } from "inversify";
import type { Logger } from "pino";

import { SYMBOLS, VATSIM_DATA_API } from "../constants/constants.ts";
import { vatsimReplySchema } from "../schemas/vatsim.schema.ts";

@injectable()
export class VatsimService {
  private interval: ReturnType<typeof setInterval> | null = null;
  public emitter: EventEmitter;

  constructor(
    @inject(SYMBOLS.Logger)
    private readonly logger: Logger,
  ) {
    this.emitter = new EventEmitter();
  }

  public watch() {
    this.tick();
    this.interval = setInterval(() => this.tick(), 20000);
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private tick() {
    fetch(VATSIM_DATA_API)
      .then((res) => {
        if (!res.ok) throw new Error(`Vatsim returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const parsed = vatsimReplySchema.safeParse(data);
        if (!parsed.success) {
          console.error("schema mismatch:", parsed.error);
          return;
        }
        this.emitter.emit("update", parsed.data);
      })
      .catch((err) => this.logger.error(`Vatsim watch tick failed: ${err}`));
  }
}
