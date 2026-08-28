import { promises as fs } from "fs";
import path from "path";

import { inject } from "inversify";
import { MutexRW } from "mutex-ts";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { SYMBOLS } from "@/constants/constants.ts";
import type { EnvConfig } from "@/schemas/config.schema.ts";

import {
  eventEntrySchema,
  generalEventSchema,
  type Event,
  type GeneralEvent,
} from "../schemas/events.schema.ts";
import type { DataService } from "../types/data.types.ts";

const jsonStoreSchema = z.object({
  events: z.record(z.string(), eventEntrySchema),
  generalEvents: z.record(z.string(), generalEventSchema).default({}),
  names: z.record(z.string(), z.string()),
});

type JSONStoreSchema = z.infer<typeof jsonStoreSchema>;

export class JSONStoreService implements DataService {
  private mu: MutexRW = new MutexRW();

  constructor(
    @inject(SYMBOLS.EnvConfig)
    private readonly envConfig: EnvConfig,
  ) {}
  getEvents(): Promise<Event[]> {
    throw new Error("Method not implemented.");
  }

  private initSchema(): JSONStoreSchema {
    return {
      events: {},
      generalEvents: {},
      names: {},
    };
  }

  private async ensureStore() {
    try {
      await fs.stat(this.envConfig.JSON_STORE_PATH);
    } catch {
      const dir = path.dirname(this.envConfig.JSON_STORE_PATH);
      if (dir && dir !== ".") await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.envConfig.JSON_STORE_PATH,
        JSON.stringify(this.initSchema(), null, 2),
        {
          encoding: "utf8",
        },
      );
    }
  }

  private async storeRead(): Promise<JSONStoreSchema> {
    await this.ensureStore();

    const contents = await fs.readFile(this.envConfig.JSON_STORE_PATH, {
      encoding: "utf8",
    });

    try {
      const parsed: unknown = JSON.parse(contents);
      if (parsed && typeof parsed === "object" && "staffups" in parsed) {
        delete (parsed as { staffups?: unknown }).staffups;
      }
      return await jsonStoreSchema.parseAsync(parsed);
    } catch {
      return this.initSchema();
    }
  }

  private async storeWrite(store: JSONStoreSchema): Promise<void> {
    await this.ensureStore();
    await fs.writeFile(this.envConfig.JSON_STORE_PATH, JSON.stringify(store, null, 2), {
      encoding: "utf8",
    });
  }

  public async createGeneralEvent(event: GeneralEvent): Promise<string> {
    const release = await this.mu.obtainRW();
    try {
      const store = await this.storeRead();
      const uuid = uuidv4();
      store.generalEvents[uuid] = event;
      await this.storeWrite(store);
      return uuid;
    } finally {
      release();
    }
  }

  public async getGeneralEvent(uuid: string): Promise<GeneralEvent | undefined> {
    const release = await this.mu.obtainRO();
    try {
      return (await this.storeRead()).generalEvents[uuid];
    } finally {
      release();
    }
  }

  public async getGeneralEvents(): Promise<Array<{ uuid: string; event: GeneralEvent }>> {
    const release = await this.mu.obtainRO();
    try {
      return Object.entries((await this.storeRead()).generalEvents).map(([uuid, event]) => ({
        uuid,
        event,
      }));
    } finally {
      release();
    }
  }

  public async addGeneralEventReminder(
    uuid: string,
    userId: string,
  ): Promise<GeneralEvent | undefined> {
    const release = await this.mu.obtainRW();
    try {
      const store = await this.storeRead();
      const event = store.generalEvents[uuid];
      if (!event) return undefined;

      if (!event.reminderUserIds.includes(userId)) {
        event.reminderUserIds.push(userId);
        await this.storeWrite(store);
      }
      return event;
    } finally {
      release();
    }
  }

  public async getGeneralEventsByOwner(
    ownerId: string,
  ): Promise<Array<{ uuid: string; event: GeneralEvent }>> {
    const release = await this.mu.obtainRO();
    try {
      return Object.entries((await this.storeRead()).generalEvents)
        .filter(([, event]) => event.ownerId === ownerId)
        .map(([uuid, event]) => ({ uuid, event }));
    } finally {
      release();
    }
  }

  public async updateGeneralEvent(
    uuid: string,
    event: Partial<GeneralEvent>,
  ): Promise<GeneralEvent> {
    const release = await this.mu.obtainRW();
    try {
      const store = await this.storeRead();
      const current = store.generalEvents[uuid];
      if (!current) throw new Error(`General event ${uuid} not found.`);
      store.generalEvents[uuid] = { ...current, ...event };
      await this.storeWrite(store);
      return store.generalEvents[uuid];
    } finally {
      release();
    }
  }

  public async deleteGeneralEvent(uuid: string): Promise<void> {
    const release = await this.mu.obtainRW();
    try {
      const store = await this.storeRead();
      if (!store.generalEvents[uuid]) return;
      delete store.generalEvents[uuid];
      await this.storeWrite(store);
    } finally {
      release();
    }
  }

  public async storeName(userId: string, username: string) {
    const release = await this.mu.obtainRW();

    try {
      const store = await this.storeRead();

      store.names[userId] = username;

      await this.storeWrite(store);
    } finally {
      release();
    }
  }

  public async getNameByUserId(userId: string): Promise<string | undefined> {
    const release = await this.mu.obtainRW();

    try {
      const store = await this.storeRead();
      return store.names[userId];
    } finally {
      release();
    }
  }

  public async deleteNameEntryByUserId(userId: string): Promise<void> {
    const release = await this.mu.obtainRW();

    try {
      const store = await this.storeRead();
      delete store.names[userId];
      await this.storeWrite(store);
    } finally {
      release();
    }
  }

  public async getAllNames(): Promise<Record<string, string>> {
    const release = await this.mu.obtainRW();

    try {
      const store = await this.storeRead();
      return store.names;
    } finally {
      release();
    }
  }
}
