import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, "..");

async function main() {
  console.log("Start build (typecheck only — source is consumed directly by Metro)");

  await new Promise<void>((resolve, reject) => {
    const child = spawn("yarn", ["run", "typecheck"], {
      cwd: PKG_ROOT,
      stdio: "inherit",
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start typecheck: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Typecheck failed"));
      }
    });
  });

  console.log("Done build");
}

main().then();
