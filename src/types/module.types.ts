import type {
  ChatInputCommandInteraction,
  ApplicationCommandOptionBase,
  ClientEvents,
} from "discord.js";

export type CommandMeta = {
  name: string;
  description: string;
  options?: ApplicationCommandOptionBase[];
};

export type ModuleInteractionMeta<E extends keyof ClientEvents = keyof ClientEvents> = {
  event: E;
  once?: boolean;
};

export interface Command {
  meta(): CommandMeta;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface ModuleInteraction<E extends keyof ClientEvents = keyof ClientEvents> {
  meta(): ModuleInteractionMeta<E>;
  handle(...args: ClientEvents[E]): Promise<void>;
}

export type CommandGroup = {
  name?: string;
  description?: string;
  commands: Command[];
};

export interface Module {
  commands: CommandGroup[];
  interactions: ModuleInteraction[];
}
