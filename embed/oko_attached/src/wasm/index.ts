import * as caitSithWasmModule from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import { initWasm as initCaitSithWasm } from "@oko-wallet/cait-sith-keplr-wasm";
import * as frostWasmModule from "@oko-wallet/frost-ed25519-keplr-wasm/pkg/frost_ed25519_keplr_wasm";
import { initWasm as initFrostWasm } from "@oko-wallet/frost-ed25519-keplr-wasm";

export async function initKeplrWasm() {
  await initCaitSithWasm(
    caitSithWasmModule,
    "/pkg/cait_sith_keplr_wasm_bg.wasm",
  );
  console.log("[attached] cait-sith WASM initialized");

  await initFrostWasm(
    frostWasmModule,
    "/pkg/frost_ed25519_keplr_wasm_bg.wasm",
  );
  console.log("[attached] frost-ed25519 WASM initialized");
}
