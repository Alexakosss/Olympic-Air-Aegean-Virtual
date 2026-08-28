import type { Client, Guild } from "discord.js";
import type { Logger } from "pino";

import type { EnvConfig } from "@/schemas/config.schema.ts";
import type { VatsimReplySchema } from "@/schemas/vatsim.schema.ts";
import type { VatsimService } from "@/service/vatsim.service.ts";
import type { DataService } from "@/types/data.types.ts";
import { createCallsignName, getMemberName } from "@/utils/discord.utils.ts";
import { extractVatsimCID, removeVatsimCIDFromName } from "@/utils/vatsim.utils.ts";

export class CallsignService {
  private guild: Guild | undefined = undefined;

  constructor(
    private readonly client: Client,
    private readonly config: EnvConfig,
    private readonly dataService: DataService,
    private readonly logger: Logger,
    private readonly vatsimService: VatsimService,
  ) {}

  public async start() {
    this.guild = await this.client.guilds.fetch(this.config.GUILD_ID);
    this.vatsimService.emitter.on("update", async (res: VatsimReplySchema) => {
      await this.update(res);
    });
  }

  private async update(res: VatsimReplySchema) {
    try {
      if (!this.guild) throw new Error("Guild is not available");

      const storedNames = await this.dataService.getAllNames();

      // First check cache for members that are no longer online
      for (const [userId, name] of Object.entries(storedNames)) {
        try {
          const member = await this.guild.members.fetch(userId);
          const memberName = getMemberName(member);
          const memberCID = extractVatsimCID(memberName);
          const vatsimMember = res.controllers.find((c) => c.cid === memberCID);

          if (!vatsimMember) {
            this.logger.info(`Updated user ${member.id} with '${name}'`);
            await member.setNickname(name);
            await this.dataService.deleteNameEntryByUserId(userId);
            continue;
          }

          if (memberName.includes(vatsimMember.callsign)) {
            continue;
          }

          const callsignName = createCallsignName(
            vatsimMember.cid.toString(),
            vatsimMember.callsign,
            removeVatsimCIDFromName(memberName),
          );

          this.logger.info(`Updated user ${member.id} with '${callsignName}'`);
          await member.setNickname(callsignName);
        } catch (err) {
          this.logger.error(`Error updating user ${userId}, error: ${err}`);
        }
      }

      // Now check for new users we haven't seen before
      for (const controller of res.controllers) {
        try {
          const discordMember = this.guild.members.cache.find((m) =>
            getMemberName(m).includes(controller.cid.toString()),
          );

          if (!discordMember) {
            continue;
          }

          if (storedNames[discordMember.id]) {
            continue;
          }

          const discordMemberName = getMemberName(discordMember);

          const callsignName = createCallsignName(
            controller.cid.toString(),
            controller.callsign,
            removeVatsimCIDFromName(discordMemberName),
          );

          this.logger.info(`Updated user ${discordMember.id} with '${callsignName}'`);
          await discordMember.setNickname(callsignName);
          await this.dataService.storeName(discordMember.id, discordMemberName);
        } catch (err) {
          this.logger.error(
            `Failed to update information for controller ${controller.cid.toString()}, error: ${err}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Failed to update callsigns, error: ${err}`);
    }
  }
}
