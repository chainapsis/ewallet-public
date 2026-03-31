import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

import { expectSuccess } from "@oko-wallet-ci/expect";
import { paths } from "@oko-wallet-ci/paths";

const VERCEL_SCOPE = "keplrwallet";

const APP_CONFIGS = {
  "oko-demo-web": {
    path: paths.demo_web,
  },
  "oko-attached": {
    path: paths.oko_attached,
  },
  "oko-customer-dashboard": {
    path: paths.ct_dashboard_web,
  },
  "oko-docs-web": {
    path: path.join(paths.root, "apps/docs_web"),
  },
  "oko-admin-web": {
    path: paths.oko_admin_web,
  },
  "oko-user-dashboard": {
    path: path.join(paths.root, "apps/user_dashboard"),
  },
  "oko-attached-mobile-host-web": {
    path: paths.attached_mobile_host_web,
  },
  "oko-sandbox-evm": {
    path: path.join(paths.root, "sandbox/sandbox_evm"),
  },
  "oko-sandbox-sol": {
    path: path.join(paths.root, "sandbox/sandbox_sol"),
  },
};

function listDeployableApps(): void {
  console.log(chalk.yellow("Available apps to deploy:\n"));
  Object.keys(APP_CONFIGS).forEach((key) => {
    console.log(`  ${chalk.green(key)}`);
  });
}

type DeploymentEnv = "alpha" | "develop" | "prod";

interface DeployOptions {
  app?: keyof typeof APP_CONFIGS;
  env?: DeploymentEnv;
}

export async function deploy(options: DeployOptions) {
  const { app, env = "alpha" } = options;

  if (!app) {
    listDeployableApps();
    console.error(chalk.red("Please specify an app using --app <app>"));
    process.exit(1);
  }

  const validEnvs: DeploymentEnv[] = ["alpha", "develop", "prod"];
  if (!validEnvs.includes(env)) {
    console.error(
      chalk.red(
        `Invalid environment: ${env}. Must be one of: ${validEnvs.join(", ")}\n`,
      ),
    );
    process.exit(1);
  }

  const config = APP_CONFIGS[app];
  if (!config) {
    console.error(chalk.red(`Unknown app: ${app}\n`));
    listDeployableApps();
    process.exit(1);
  }

  console.log(chalk.bold(`Deploying ${app} (${env})...\n`));

  // Step 0: Clean .vercel directory
  const vercelDir = path.join(paths.root, ".vercel");
  if (fs.existsSync(vercelDir)) {
    console.log(chalk.blue("Step 0:"), "Cleaning .vercel directory...");
    fs.rmSync(vercelDir, { recursive: true, force: true });
    console.log(chalk.green("✓ .vercel directory removed\n"));
  }

  // Step 1: Link to Vercel project
  console.log(chalk.blue("Step 1/3:"), "Linking to Vercel project...");
  const linkRet = spawnSync(
    "vercel",
    ["link", "--yes", `--scope=${VERCEL_SCOPE}`, `--project=${app}`],
    {
      cwd: paths.root,
      stdio: "inherit",
    },
  );
  expectSuccess(linkRet, "Vercel link failed");
  console.log(chalk.green("✓ Linked successfully\n"));

  // Step 2: Build
  console.log(chalk.blue("Step 2/3:"), "Building...");
  const buildArgs = ["build", "--yes"];
  if (env === "prod") {
    buildArgs.push("--prod");
  } else if (env === "develop") {
    buildArgs.push("--target=develop");
  } else if (env === "alpha") {
    buildArgs.push("--target=preview");
  }

  const buildRet = spawnSync("vercel", buildArgs, {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(buildRet, "Vercel build failed");
  console.log(chalk.green("✓ Build completed\n"));

  // Step 3: Deploy
  console.log(chalk.blue("Step 3/3:"), "Deploying...");
  const deployArgs = ["deploy", "--prebuilt"];
  if (env === "prod") {
    deployArgs.push("--prod");
  } else if (env === "develop") {
    deployArgs.push("--target=develop");
  } else if (env === "alpha") {
    deployArgs.push("--target=preview");
  }

  const deployRet = spawnSync("vercel", deployArgs, {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(deployRet, "Vercel deployment failed");
  console.log(chalk.bold.green("\n✓ Deployment completed successfully!"));
}
