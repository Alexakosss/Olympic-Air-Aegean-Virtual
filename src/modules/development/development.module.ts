import { inject, injectable } from "inversify";

import { SYMBOLS } from "@/constants/constants.ts";
import { SetNameCommand } from "@/modules/development/commands/set-name.command.ts";
import type { Module, CommandGroup, ModuleInteraction } from "@/types/module.types.ts";

import { CheckPositionCommand } from "./commands/check-position.command.ts";

@injectable()
export class DevelopmentModule implements Module {
  public commands: CommandGroup[] = [];
  public interactions: ModuleInteraction[] = [];

  constructor(
    @inject(SYMBOLS.PositionsMap)
    positionsMap: Map<string, void>,
  ) {
    const checkPositionCmd = new CheckPositionCommand(positionsMap);
    const setNameCmd = new SetNameCommand();

    this.commands.push({
      name: "dev",
      description: "Development only commands.",
      commands: [checkPositionCmd, setNameCmd],
    });
  }
}
