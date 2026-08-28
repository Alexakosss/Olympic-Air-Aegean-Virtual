import { promises as fs } from "fs";

import {
  Client,
  Events,
  MessageFlags,
  REST,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
  GatewayIntentBits,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  type ChatInputCommandInteraction,
  type APIApplicationCommandBasicOption,
  type ClientEvents,
} from "discord.js";
import dotenv from "dotenv";
import { Container } from "inversify";
import pino, { type Logger } from "pino";

import { OAV_WELCOME_CHANNEL_ID, OAV_WEBSITE_URL, SYMBOLS } from "@/constants/constants.ts";
import { CallsignModule } from "@/modules/callsign/callsign.module.ts";
import { DevelopmentModule } from "@/modules/development/development.module.ts";
import { EventsModule } from "@/modules/events/events.module.ts";
import { StaffupModule } from "@/modules/staffup/staffup.module.ts";
import { VatsimService } from "@/service/vatsim.service.ts";
import type { DataService } from "@/types/data.types.ts";
import type { Command, Module, ModuleInteraction } from "@/types/module.types.ts";
import { newSimpleEmbed } from "@/utils/discord.utils.ts";

import {
  type EnvConfig,
  envConfigSchema,
  type PositionsConfig,
  positionsConfigSchema,
} from "./schemas/config.schema.ts";
import { JSONStoreService } from "./service/json-store.service.ts";

type ModuleClass = new (...args: any[]) => Module;

const MODULES: ModuleClass[] = [DevelopmentModule, EventsModule, StaffupModule, CallsignModule];

function createAllowedPositionsMap(positionsCfg: PositionsConfig): Map<string, void> {
  const allowedPositions: Map<string, void> = new Map();

  // firstly airports
  for (const airport of positionsCfg.airports) {
    for (const pos of airport.positions) {
      allowedPositions.set(`${airport.icao}_${pos}`);
    }
  }

  // then center
  for (const rd of positionsCfg.radar) {
    allowedPositions.set(rd.name);
  }

  return allowedPositions;
}

class Bot {
  private constructor(private readonly container: Container) {}

  private buildCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    if (!this.container) throw new Error("Container is missing");
    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    for (const m of MODULES) {
      const cm = this.container.get(m);
      for (const cg of cm.commands) {
        if (cg.name) {
          if (!cg.description) throw new Error(`Command ${cg.name} does not have a description.`);
          commands.push({
            name: cg.name,
            description: cg.description,
            options: cg.commands.map((cmd) => {
              const meta = cmd.meta();
              return {
                type: ApplicationCommandOptionType.Subcommand,
                name: meta.name,
                description: meta.description,
                options: (meta.options ?? undefined) as
                  | APIApplicationCommandBasicOption[]
                  | undefined,
              };
            }),
          });
          continue;
        }
        for (const cmd of cg.commands) {
          const meta = cmd.meta();
          commands.push({
            name: meta.name,
            description: meta.description,
            options: (meta.options ?? undefined) as APIApplicationCommandOption[] | undefined,
          });
        }
      }
    }
    return commands;
  }

  private registerModuleInteraction<E extends keyof ClientEvents>(
    event: E,
    moduleInteractions: ModuleInteraction[],
  ) {
    const client: Client = this.container.get(SYMBOLS.Client);
    for (const mi of moduleInteractions) {
      const meta = mi.meta();
      if (typeof meta.once !== "undefined" && meta.once) {
        client.once(event, async (...args: ClientEvents[E]) => {
          await mi.handle(...args);
        });
        continue;
      }
      client.on(event, async (...args: ClientEvents[E]) => {
        await mi.handle(...args);
      });
    }
  }

  private buildInteractions() {
    const interactions: Map<keyof ClientEvents, ModuleInteraction[]> = new Map();

    for (const m of MODULES) {
      const cm = this.container.get(m);
      for (const inter of cm.interactions) {
        const meta = inter.meta();
        if (interactions.has(meta.event)) {
          const eventInteractions = interactions.get(meta.event);
          if (!eventInteractions) {
            continue;
          }
          eventInteractions.push(inter);
          interactions.set(meta.event, eventInteractions);
          continue;
        }
        interactions.set(meta.event, [inter]);
      }
    }

    for (const [event, moduleInteractions] of interactions.entries()) {
      this.registerModuleInteraction(
        event,
        moduleInteractions as ModuleInteraction<typeof event>[],
      );
    }
  }

  private lookupCommand(main: string, sub: string | null): Command | undefined {
    if (!this.container) throw new Error("Container is missing");
    if (!sub) {
      for (const m of MODULES) {
        const cm = this.container.get(m);
        for (const cg of cm.commands) {
          if (cg.name) continue;
          const cmd = cg.commands.find((cmd) => cmd.meta().name === main);
          if (cmd) return cmd;
        }
      }
      return undefined;
    }

    for (const m of MODULES) {
      const cm = this.container.get(m);
      const cg = cm.commands.find((cg) => cg.name === main);
      if (!cg) continue;
      const cmd = cg.commands.find((cmd) => cmd.meta().name === sub);
      if (cmd) return cmd;
    }

    return undefined;
  }

  private setupHooks() {
    const client: Client = this.container.get(SYMBOLS.Client);
    const logger: Logger = this.container.get(SYMBOLS.Logger);
    const envConfig: EnvConfig = this.container.get(SYMBOLS.EnvConfig);

    // startup hook
    client.once(Events.ClientReady, async (ready: Client<true>) => {
      logger.info(`Ready! Logged in as ${ready.user.tag}`);

      try {
        const guild = await client.guilds.fetch(envConfig.GUILD_ID);
        await guild.members.fetch();
      } catch (err) {
        logger.error(`Failed to update guild cache, error: ${err}`);
      }

      if (client.user) {
        if (client.user.username !== "OAV Events") {
          await client.user.setUsername("OAV Events");
        }
        client.user.setActivity({
          name: "Organizing some events",
          state: "I am trying my absolute best.",
        });
      }
    });

    // command hooks
    client.on(Events.InteractionCreate, async (i) => {
      if (!i.isChatInputCommand()) return;

      const interaction = i as ChatInputCommandInteraction;
      const sub = interaction.options.getSubcommand(false);

      const cmd = this.lookupCommand(interaction.commandName, sub);

      if (!cmd) {
        logger.error(`Invalid command: ${interaction.commandName}`);
        return;
      }

      try {
        await cmd.execute(interaction as ChatInputCommandInteraction);
      } catch (error) {
        logger.error(`Failed to execute command ${interaction.commandName}, error: ${error}`);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    });

    client.on(Events.GuildMemberAdd, async (member) => {
      if (member.user.bot) return;

      const welcomeChannel = await member.guild.channels.fetch(OAV_WELCOME_CHANNEL_ID);
      if (!welcomeChannel?.isSendable()) {
        logger.warn(
          `Welcome channel ${OAV_WELCOME_CHANNEL_ID} is unavailable or cannot receive messages in guild ${member.guild.id}.`,
        );
        return;
      }

      try {
        await welcomeChannel.send({
          content: `${member}`,
          embeds: [
            newSimpleEmbed()
              .setTitle("Welcome to our Discord Server")
              .setDescription(
                [
                  "Feel free to enroll yourself throughout the channels.",
                  "We can't wait to meet you in our Voice channels, where we meet and discuss everything related to aviation.",
                  "",
                  `For any questions, check out our Operations Manual, open a Ticket, or visit our Official Site: ${OAV_WEBSITE_URL}`,
                ].join("\n"),
              )
              .setColor("#2388c9"),
          ],
        });
      } catch (error) {
        logger.error(`Failed to send welcome message in guild ${member.guild.id}, error: ${error}`);
      }
    });
  }

  static async create() {
    const container = new Container();
    const logger = pino({
      transport: {
        target: "pino-pretty",
      },
    });
    container.bind<Logger>(SYMBOLS.Logger).toConstantValue(logger);

    logger.info("Loading environment variables...");
    dotenv.config({ path: ".env" });
    const envConfig = await envConfigSchema.parseAsync(process.env);
    container.bind<EnvConfig>(SYMBOLS.EnvConfig).toConstantValue(envConfig);

    logger.info("Loading positions configuration");
    const positionsFile = await fs.readFile(envConfig.POSITIONS_CONFIG_PATH, {
      encoding: "utf-8",
    });
    const positions = await positionsConfigSchema.parseAsync(JSON.parse(positionsFile));
    const allowedPositionsMap = createAllowedPositionsMap(positions);
    container.bind<Map<string, void>>(SYMBOLS.PositionsMap).toConstantValue(allowedPositionsMap);

    logger.info("Creating data service");
    container.bind<DataService>(SYMBOLS.DataService).to(JSONStoreService);

    logger.info("Creating vatsim service");
    container.bind(VatsimService).toSelf().inSingletonScope();

    logger.info("Creating Discord client");
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });
    container.bind<Client>(SYMBOLS.Client).toConstantValue(client);

    for (const module of MODULES) {
      container.bind<Module>(module).toSelf().inSingletonScope();
      logger.info(`Loaded module ${module.name}`);
    }

    return new Bot(container);
  }

  public async run() {
    const logger: Logger = this.container.get(SYMBOLS.Logger);
    const client: Client = this.container.get(SYMBOLS.Client);
    const envConfig: EnvConfig = this.container.get(SYMBOLS.EnvConfig);
    const vatsimService = this.container.get(VatsimService);

    logger.info("Updating application commands");

    const commands = this.buildCommands();
    const rest = new REST().setToken(envConfig.BOT_TOKEN);
    const res = (await rest.put(Routes.applicationCommands(envConfig.BOT_ID), {
      body: commands,
    })) as RESTPostAPIChatInputApplicationCommandsJSONBody[];

    logger.info(`Updated ${res.length} application commands`);

    logger.info("Starting services");
    vatsimService.watch();

    logger.info("Updating interactions");
    this.buildInteractions();

    logger.info("Setting up hooks");
    this.setupHooks();

    logger.info("Starting client");
    await client.login(envConfig.BOT_TOKEN);
  }
}

const bot = await Bot.create();
await bot.run();
