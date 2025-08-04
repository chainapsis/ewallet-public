#!/usr/bin/env node

const { writeFileSync } = require("fs");
const { join } = require("path");
const packageJson = require("../package.json");

function generateVersionFile() {
  const versionFilePath = join(__dirname, "../src/provider/version.ts");
  const content = `export const VERSION = ${JSON.stringify(packageJson.version)};\n`;

  writeFileSync(versionFilePath, content, "utf8");

  console.log(`✅ Generated version.ts with VERSION: ${packageJson.version}`);
}

if (require.main === module) {
  generateVersionFile();
}

module.exports = { generateVersionFile };
