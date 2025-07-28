import { program } from "commander";

import { typeCheck } from "./cmds/typecheck";
import { buildSDK } from "./cmds/build_sdk";
import { version } from "./cmds/version";

async function main() {
  const command = program.version("0.0.1").description("EWallet Public CI");

  command.command("typecheck").action(typeCheck);

  command.command("version").action(version);

  command.command("build_sdk").action(buildSDK);

  program.parse(process.argv);
}

main().then();
