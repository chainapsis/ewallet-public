import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { paths } from "../paths";

function updateVersionConstant(packagePath: string, constantsPath: string) {
  try {
    // Read package.json to get current version
    const packageJsonPath = join(packagePath, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const version = packageJson.version;

    console.info(`Updating VERSION constant to ${version} in ${constantsPath}`);

    // Read constants file
    const constantsFullPath = join(packagePath, constantsPath);
    let constantsContent = readFileSync(constantsFullPath, "utf-8");

    // Replace VERSION constant with current package version
    constantsContent = constantsContent.replace(
      /export const VERSION = ["'].*["'];/,
      `export const VERSION = "${version}";`,
    );

    // Write back updated content
    writeFileSync(constantsFullPath, constantsContent, "utf-8");
    console.info("VERSION constant updated successfully");
  } catch (error) {
    console.warn(`Failed to update VERSION constant: ${error}`);
  }
}

export function updateAllVersionConstants() {
  console.info("Updating VERSION constants in all SDK packages...");

  // Update SDK ETH provider version constant
  updateVersionConstant(paths.sdk_eth, "src/provider/constants.ts");

  console.info("All VERSION constants updated!");
}
