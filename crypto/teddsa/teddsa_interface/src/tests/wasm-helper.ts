import * as wasmModule from "@oko-wallet/frost-ed25519-keplr-wasm/pkg/frost_ed25519_keplr_wasm";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const wasmInitState = {
  initialized: false,
};

export async function initWasmForTest(): Promise<void> {
  if (wasmInitState.initialized) {
    return;
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const wasmPath = join(
    __dirname,
    "../../../frost_ed25519_keplr_wasm/pkg/frost_ed25519_keplr_wasm_bg.wasm",
  );
  const wasmBytes = readFileSync(wasmPath);

  (wasmModule as any).initSync({ module: wasmBytes });
  wasmInitState.initialized = true;
}

export { wasmModule };
