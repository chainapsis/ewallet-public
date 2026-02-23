import * as fs from "node:fs";

const DEVELOP_PREFIX = "develop/";
const RELEASE_PREFIX = "release/";

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

  let vercelEnv: string;
  let vercelBuildFlag: string;
  let vercelDeployFlag: string;

  if (tag.startsWith(RELEASE_PREFIX)) {
    vercelEnv = "production";
    vercelBuildFlag = "--prod";
    vercelDeployFlag = "--prod";
  } else if (tag.startsWith(DEVELOP_PREFIX)) {
    vercelEnv = "preview";
    vercelBuildFlag = "--target=develop";
    vercelDeployFlag = "--target=develop";
  } else {
    console.error("Unknown tag prefix. Expected develop/* or release/*");
    process.exit(1);
  }

  const output = [
    `vercel_env=${vercelEnv}`,
    `vercel_build_flag=${vercelBuildFlag}`,
    `vercel_deploy_flag=${vercelDeployFlag}`,
  ].join("\n");

  fs.appendFileSync(outputFile, output + "\n");

  console.log("Deploy environment determined from tag: %s", tag);
  console.log("  vercel_env=%s", vercelEnv);
  console.log("  vercel_build_flag=%s", vercelBuildFlag);
  console.log("  vercel_deploy_flag=%s", vercelDeployFlag);
}

main().then();

export {};
