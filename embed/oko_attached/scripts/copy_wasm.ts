import { cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteAsync } from "del";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, "../");

async function main() {
  await removeDirtyFiles();

  const wasmPath = path.resolve(
    PKG_ROOT,
    "../../crypto/teddsa/frost_ed25519_keplr_wasm/pkg/" +
      "frost_ed25519_keplr_wasm_bg.wasm",
  );
  const destPath = path.resolve(PKG_ROOT, "./public/pkg");
  cpSync(wasmPath, destPath);
}

main().then();

async function removeDirtyFiles() {
  const PKG = "./public/pkg";

  console.log("deleting: %s", PKG);

  await deleteAsync([path.resolve(PKG_ROOT, PKG)]);
}
