import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

import { doBuildPkgs } from "@oko-wallet-ci/cmds/build_pkgs";
import { doBuildSDK } from "@oko-wallet-ci/cmds/build_sdk";
import { expectSuccess } from "@oko-wallet-ci/expect";
import { paths } from "@oko-wallet-ci/paths";

const WILDCARD_VERSION = "workspace:*";

// TODO: Currently only support "prelease" version bump.
// Later the "version" script will have variants such as "version_prelease".
export async function version(args: any[]) {
  console.log("Start versioning packages, args: %s", args);

  console.log("Fetching the Git repository at 'origin' to sync with the local");
  const fetchRet = spawnSync("git", ["fetch", "origin"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(fetchRet, "git fetch failed");

  console.log("We will first re-build the packages\n");
  await doBuildPkgs();
  await doBuildSDK();

  console.log("Checking type definition in sandbox simple host");
  const testSandboxRet = spawnSync("yarn", ["tsc"], {
    cwd: paths.sandbox_simple_host,
    stdio: "inherit",
  });
  expectSuccess(testSandboxRet, "publish failed");
  console.log("%s %s", chalk.green.bold("Ok"), "sandbox_simple_host");

  const wsDeps = findWorkspaceDependencies();
  if (wsDeps.length > 0) {
    console.error(
      "%s workspace versioning is prohibited for public packages",
      chalk.red.bold("Error"),
    );

    for (const dep of wsDeps) {
      console.log("pkg: %s, dep: %s: %s", dep.pkg, dep.depName, dep.version);
    }
    process.exit(1);
  }

  const changedRet = spawnSync("yarn", ["lerna", "changed", "--json"], {
    cwd: paths.root,
  });
  const changedRaw = changedRet.stdout.toString().trim();

  if (changedRaw.length > 0) {
    let changed: { name: string; version: string }[];
    try {
      changed = JSON.parse(changedRaw);

      console.log("Following pkgs are changed (current version)");
      for (const dep of changed) {
        console.log("%s: %s", dep.name, dep.version);
      }
    } catch (err) {
      console.log(
        "%s parsing the changed pkgs, err: %s",
        chalk.red.bold("Error"),
        err,
      );
      process.exit(1);
    }
  }

  const versionRet = spawnSync(
    "yarn",
    [
      "lerna",
      "version",
      "prerelease",
      "--no-private",
      // "--no-git-tag-version",
      // "--force-git-tag",
      // "--no-push",
      "--yes",
      "--message",
      "project: version bump to %s",
    ],
    {
      cwd: paths.root,
      stdio: "inherit",
    },
  );
  expectSuccess(versionRet, "lerna version failed");
}

function getPackageJsonPaths(): string[] {
  const lernaJsonPath = path.join(paths.root, "lerna.json");
  const lernaJson = JSON.parse(fs.readFileSync(lernaJsonPath, "utf-8"));
  const packages: string[] = lernaJson.packages ?? [];

  return packages.map((pkg) => path.join(paths.root, pkg, "package.json"));
}

interface DependencyInfo {
  pkg: string;
  depName: string;
  version: string;
}

function findWorkspaceDependencies(): DependencyInfo[] {
  const packageJsonPaths = getPackageJsonPaths();
  const depFields = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  const wsDeps = [];

  for (const pkgPath of packageJsonPaths) {
    try {
      const content = fs.readFileSync(pkgPath, "utf-8");
      const pJson = JSON.parse(content);

      if (pJson.private === true) {
        continue;
      }

      for (const field of depFields) {
        const deps = pJson[field];
        if (!deps || typeof deps !== "object") {
          continue;
        }

        for (const [depName, depVersion] of Object.entries(deps)) {
          if (
            typeof depVersion === "string" &&
            depVersion.startsWith(WILDCARD_VERSION)
          ) {
            wsDeps.push({
              pkg: pJson.name,
              depName,
              version: depVersion,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to check deps. pkg %s, err: %s", pkgPath, err);
    }
  }

  return wsDeps;
}

// NOTE: Now unused, but may change later
function _createGitCommitAndTags(
  changedPackages: Array<{ name: string; version: string }>,
) {
  console.log("Creating git commit and tags...");

  if (changedPackages.length === 0) {
    console.log("No packages were changed, skipping commit and tags");
    return;
  }

  // Stage all changes
  const addRet = spawnSync("git", ["add", "."], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(addRet, "git add failed");

  // Build commit message with version info
  const versionList = changedPackages
    .map((pkg) => `- ${pkg.name}@${pkg.version}`)
    .join("\n");
  const commitMessage = `chore: publish

${versionList}`;

  // Create commit
  const commitRet = spawnSync("git", ["commit", "-m", commitMessage], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(commitRet, "git commit failed");

  // Create tags only for changed packages
  for (const pkg of changedPackages) {
    const tag = `${pkg.name}@${pkg.version}`;
    console.log("  Creating tag: %s", tag);
    const tagRet = spawnSync("git", ["tag", "-a", tag, "-m", tag], {
      cwd: paths.root,
      stdio: "inherit",
    });
    if (tagRet.status !== 0) {
      console.warn("  Tag %s already exists, skipping", tag);
    }
  }

  console.log(
    "%s Created commit and %d tags",
    chalk.green.bold("Done"),
    changedPackages.length,
  );

  // Push commit and tags to remote
  console.log("Pushing commit and tags to origin...");
  const pushRet = spawnSync(
    "git",
    ["push", "-u", "origin", "HEAD", "--follow-tags"],
    {
      cwd: paths.root,
      stdio: "inherit",
    },
  );
  expectSuccess(pushRet, "git push failed");
  console.log("%s Pushed to origin", chalk.green.bold("Done"));
}
