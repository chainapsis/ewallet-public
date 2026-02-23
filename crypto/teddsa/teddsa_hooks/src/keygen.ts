import { wasmModule } from "@oko-wallet/frost-ed25519-keplr-wasm";
import { Bytes } from "@oko-wallet/bytes";
import type { Bytes32 } from "@oko-wallet/bytes";
import type { Result } from "@oko-wallet/stdlib-js";
import type { CentralizedKeygenOutput } from "@oko-wallet/oko-types/teddsa";

import type { TeddsaKeygenResult, TeddsaKeygenOutputBytes } from "./types";

export async function importExternalSecretKeyEd25519(
  secretKey: Bytes32,
): Promise<Result<TeddsaKeygenResult, string>> {
  try {
    const keygenOutput: CentralizedKeygenOutput =
      wasmModule.cli_keygen_import_ed25519([...secretKey.toUint8Array()]);

    return processKeygenOutput(keygenOutput);
  } catch (error: any) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function runTeddsaKeygen(): Promise<
  Result<TeddsaKeygenResult, string>
> {
  try {
    const keygenOutput: CentralizedKeygenOutput =
      wasmModule.cli_keygen_centralized_ed25519();

    return processKeygenOutput(keygenOutput);
  } catch (error: any) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function runTeddsaKeygenSeed(
  seed: Bytes32,
): Promise<Result<TeddsaKeygenResult, string>> {
  try {
    const keygenOutput: CentralizedKeygenOutput =
      wasmModule.cli_keygen_seed_ed25519([...seed.toUint8Array()]);

    return processKeygenOutput(keygenOutput);
  } catch (error: any) {
    return {
      success: false,
      err: String(error),
    };
  }
}

function processKeygenOutput(
  keygenOutput: CentralizedKeygenOutput,
): Result<TeddsaKeygenResult, string> {
  const [keygen_1_raw, keygen_2_raw] = keygenOutput.keygen_outputs;
  const publicKeyPackage = keygenOutput.public_key_package;

  const publicKeyBytesRes = Bytes.fromUint8Array(
    new Uint8Array(publicKeyPackage.verifying_key),
    32,
  );
  if (publicKeyBytesRes.success === false) {
    return {
      success: false,
      err: publicKeyBytesRes.err,
    };
  }

  const keygen_1: TeddsaKeygenOutputBytes = {
    key_package: keygen_1_raw,
    public_key_package: publicKeyPackage,
    identifier: new Uint8Array(keygen_1_raw.identifier),
    public_key: publicKeyBytesRes.data,
  };

  const keygen_2: TeddsaKeygenOutputBytes = {
    key_package: keygen_2_raw,
    public_key_package: publicKeyPackage,
    identifier: new Uint8Array(keygen_2_raw.identifier),
    public_key: publicKeyBytesRes.data,
  };

  return {
    success: true,
    data: { keygen_1, keygen_2 },
  };
}
