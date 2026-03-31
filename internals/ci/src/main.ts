import { program } from "commander";

import { buildCs } from "./cmds/build_cs";
import { buildFrost } from "./cmds/build_frost";
import { buildPkgs } from "./cmds/build_pkgs";
import { buildSDK } from "./cmds/build_sdk";
import { DbMigrateAPI } from "./cmds/db_migrate_api";
import { dbMigrateKSN } from "./cmds/db_migrate_ksn";
import { DbSeedAPI } from "./cmds/db_seed_api";
import { deploy } from "./cmds/deploy";
import { depsCheck } from "./cmds/deps_check";
import { langCheck } from "./cmds/lang_check";
import { langFormat } from "./cmds/lang_format";
import { langLint } from "./cmds/lang_lint";
import { publish } from "./cmds/publish";
import { setup } from "./cmds/setup";
import { tmuxStart } from "./cmds/tmux_start";
import { tmuxStop } from "./cmds/tmux_stop";
import { typeCheck } from "./cmds/typecheck";
import { version } from "./cmds/version";

async function main() {
  const command = program.version("0.0.1").description("Oko Public CI");

  command.command("typecheck").action(typeCheck);

  command.command("version [args...]").action(version);

  command.command("publish").action(publish);

  command.command("deps_check").action(depsCheck);

  command.command("lang_format").action(langFormat);

  command.command("lang_check").argument("[args...]").action(langCheck);

  command.command("lang_lint").argument("[args...]").action(langLint);

  command.command("build_pkgs").action(buildPkgs);

  command.command("build_sdk").action(buildSDK);

  command.command("build_cs").action(buildCs);

  command.command("build_frost").action(buildFrost);

  command.command("tmux_start").action(tmuxStart);

  command.command("tmux_stop").action(tmuxStop);

  command
    .command("setup")
    .option("--skip-rust", "Skip rust build", false)
    .option("--skip-typecheck", "Skip typecheck", false)
    .action(setup);

  command
    .command("db_migrate_api")
    .option(
      "--use-env-file",
      "use env file config instead of test config",
      false,
    )
    .action(DbMigrateAPI);

  command
    .command("db_seed_api")
    .option(
      "--use-env-file",
      "use env file config instead of test config",
      false,
    )
    .action(DbSeedAPI);

  command
    .command("db_migrate_ksn")
    .option(
      "--use-env-file",
      "use env file config instead of test config",
      false,
    )
    .action(dbMigrateKSN);

  command
    .command("deploy")
    .option("--app <app>", "App to deploy")
    .option(
      "--env <env>",
      "Deployment environment (alpha|develop|prod). Default: alpha",
      "alpha",
    )
    .action(deploy);

  program.parse(process.argv);
}

main().then();
