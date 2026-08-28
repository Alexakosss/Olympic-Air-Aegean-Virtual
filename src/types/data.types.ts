import type { Event, GeneralEvent } from "../schemas/events.schema.ts";
import type { StaffUp, StaffUpEntry, StaffUpPosition } from "../schemas/staffup.schema.ts";

export interface DataService {
  createStaffUp(staffUp: StaffUp): Promise<string>;
  getStaffUpByUUID(uuid: string): Promise<StaffUpEntry | undefined>;
  updateStaffUpPositions(uuid: string, positions: StaffUpPosition[]): Promise<StaffUpEntry>;
  updateStaffUp(uuid: string, staffup: Partial<StaffUp>): Promise<void>;
  storeName(userId: string, name: string): Promise<void>;
  getNameByUserId(userId: string): Promise<string | undefined>;
  deleteNameEntryByUserId(userId: string): Promise<void>;
  getAllNames(): Promise<Record<string, string>>;
  getStaffUps(): Promise<StaffUpEntry[]>;
  getEvents(): Promise<Event[]>;
  createGeneralEvent(event: GeneralEvent): Promise<string>;
  getGeneralEvents(): Promise<Array<{ uuid: string; event: GeneralEvent }>>;
  getGeneralEvent(uuid: string): Promise<GeneralEvent | undefined>;
  addGeneralEventReminder(uuid: string, userId: string): Promise<GeneralEvent | undefined>;
  getGeneralEventsByOwner(ownerId: string): Promise<Array<{ uuid: string; event: GeneralEvent }>>;
  updateGeneralEvent(uuid: string, event: Partial<GeneralEvent>): Promise<GeneralEvent>;
  deleteGeneralEvent(uuid: string): Promise<void>;
}
