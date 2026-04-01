import * as fs from "node:fs";

// App tag format: <app>/<env>/v<version>
// e.g. demo_web/develop/v0.0.1, attached/release/v1.0.0
const APP_TAG_PATTERN =
  /^([a-z_]+)\/(alpha|develop|release)\/v(\d+\.\d+\.\d+)$/;

interface ParsedTag {
  app: string;
  env: "alpha" | "develop" | "release";
  version: string;
}

function parseTag(tag: string): ParsedTag {
  const match = APP_TAG_PATTERN.exec(tag);

  if (!match) {
    console.error("Failed to parse tag: %s", tag);
    console.error(
      "Expected format: <app>/<env>/v<version> (e.g. demo_web/develop/v0.0.1)",
    );
    process.exit(1);
  }

  return {
    app: match[1],
    env: match[2] as "alpha" | "develop" | "release",
    version: match[3],
  };
}

async function main() {
  const tag = process.env.GIT_TAG;
  const outputFile = process.env.GITHUB_OUTPUT;

  if (tag === undefined || tag.length < 1) {
    console.error("GIT_TAG is empty");
    process.exit(1);
  }

  if (outputFile === undefined || outputFile.length < 1) {
    console.error("GITHUB_OUTPUT is empty");
    process.exit(1);
  }

  const parsed = parseTag(tag);

  let vercelEnv: string;
  let vercelBuildFlag: string;
  let vercelDeployFlag: string;

  if (parsed.env === "release") {
    vercelEnv = "production";
    vercelBuildFlag = "--prod";
    vercelDeployFlag = "--prod";
  } else if (parsed.env === "alpha") {
    vercelEnv = "preview";
    vercelBuildFlag = "--target=preview";
    vercelDeployFlag = "--target=preview";
  } else {
    vercelEnv = "develop";
    vercelBuildFlag = "--target=develop";
    vercelDeployFlag = "--target=develop";
  }

  const output = [
    `vercel_app=${parsed.app}`,
    `vercel_env=${vercelEnv}`,
    `vercel_build_flag=${vercelBuildFlag}`,
    `vercel_deploy_flag=${vercelDeployFlag}`,
  ].join("\n");

  fs.appendFileSync(outputFile, output + "\n");

  console.log("Deploy environment determined from tag: %s", tag);
  console.log("  vercel_app=%s", parsed.app);
  console.log("  vercel_env=%s", vercelEnv);
  console.log("  vercel_build_flag=%s", vercelBuildFlag);
  console.log("  vercel_deploy_flag=%s", vercelDeployFlag);
}

main().then();
