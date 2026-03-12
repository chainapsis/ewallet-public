import fs from "node:fs";
import os from "node:os";
import chalk from "chalk";
import path from "path";

import {
  ENV_FILE_NAME,
  ENV_FILE_NAME_2,
  ENV_FILE_NAME_3,
  EXAMPLE_ENV_FILE,
  EXAMPLE_ENV_FILE_2,
  EXAMPLE_ENV_FILE_3,
} from "@oko-wallet-ksn-server/envs";

const CONFIG_DIR_NAME = ".oko";

function copyEnv(envFileName: string, exampleEnvFileName: string) {
  const cwd = process.cwd();
  const forceOverwrite = process.argv.includes("--force");

  console.log("Create an env file, cwd: %s", cwd);
  if (forceOverwrite) {
    console.log("Force overwrite mode enabled");
  }

  createConfigDir();

  const envExamplePath = path.resolve(cwd, exampleEnvFileName);
  const envPath = getEnvPath(envFileName);

  if (fs.existsSync(envPath) && !forceOverwrite) {
    console.log(`Abort creating env. File already exists, path: ${envPath}`);
    console.log(`Use --force flag to overwrite existing file`);
    return;
  }

  if (fs.existsSync(envPath) && forceOverwrite) {
    console.log(`Overwriting existing env file, path: ${envPath}`);
  }

  console.log(
    "Copying env file, srcPath: %s, destPath: %s",
    envExamplePath,
    envPath,
  );

  fs.copyFileSync(envExamplePath, envPath);

  const env = fs.readFileSync(envPath).toString();

  const encryptionSecretPathMatch = env.match(/ENCRYPTION_SECRET_PATH=(.*)/);
  if (encryptionSecretPathMatch) {
    const homeDir = os.homedir();
    const encryptionSecretPath = encryptionSecretPathMatch[1]
      .replace(/"/g, "")
      .replace(/\$HOME/g, homeDir)
      .replace(/^~/, homeDir);

    const encryptionSecretDir = path.dirname(encryptionSecretPath);

    if (!fs.existsSync(encryptionSecretDir)) {
      fs.mkdirSync(encryptionSecretDir, { recursive: true });
    }

    fs.writeFileSync(encryptionSecretPath, "temp_enc_secret");
    console.log("Created encryption secret file: %s", encryptionSecretPath);
  }

  console.log("%s", env);

  console.log("Create env done!, path: %s", envPath);
}

function main() {
  console.log("\nenv file - base (1)");
  copyEnv(ENV_FILE_NAME, EXAMPLE_ENV_FILE);

  console.log("\nenv file - 2");
  copyEnv(ENV_FILE_NAME_2, EXAMPLE_ENV_FILE_2);

  console.log("\nenv file - 3");
  copyEnv(ENV_FILE_NAME_3, EXAMPLE_ENV_FILE_3);

  console.log("%s creating env", chalk.green("Done"));
}

main();

/////////////////////////////////////////////////////////////////////////////////
// Utils
/////////////////////////////////////////////////////////////////////////////////

function createConfigDir() {
  const configPath = path.join(os.homedir(), CONFIG_DIR_NAME);

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath);
  }

  return configPath;
}

function getEnvPath(envFileName: string) {
  const envPath = path.join(os.homedir(), CONFIG_DIR_NAME, envFileName);
  return envPath;
}
