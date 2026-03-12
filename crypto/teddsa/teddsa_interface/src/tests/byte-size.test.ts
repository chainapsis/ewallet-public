import { beforeAll, describe, expect, it } from "@jest/globals";

import type { CentralizedKeygenOutput } from "../keygen";
import type {
  AggregateInput,
  SignatureOutput,
  SignatureShareOutput,
  SigningCommitmentOutput,
  SignRound1Input,
  SignRound2Input,
  VerifyInput,
} from "../sign";
import { initWasmForTest, wasmModule } from "./wasm-helper";

function toArray(obj: number[] | Record<number, number>): number[] {
  if (Array.isArray(obj)) {
    return obj;
  }
  const result: number[] = [];
  for (let i = 0; i < 32; i++) {
    result.push(obj[i] ?? 0);
  }
  return result;
}

describe("WASM byte size validation", () => {
  beforeAll(async () => {
    await initWasmForTest();
  });

  describe("keygen output sizes", () => {
    it("Identifier should be exactly 32 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage = keygen.keygen_outputs[0];

      expect(toArray(keyPackage.identifier).length).toBe(32);
    });

    it("signing_share should be exactly 32 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage = keygen.keygen_outputs[0];

      expect(toArray(keyPackage.signing_share).length).toBe(32);
    });

    it("verifying_share should be exactly 32 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage = keygen.keygen_outputs[0];

      expect(toArray(keyPackage.verifying_share).length).toBe(32);
    });

    it("verifying_key should be exactly 32 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage = keygen.keygen_outputs[0];

      expect(toArray(keyPackage.verifying_key).length).toBe(32);
    });

    it("PublicKeyPackage.verifying_key should be exactly 32 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const publicKeyPackage = keygen.public_key_package;

      expect(toArray(publicKeyPackage.verifying_key).length).toBe(32);
    });

    it("PublicKeyPackage.verifying_shares values should be exactly 32 bytes each", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const publicKeyPackage = keygen.public_key_package;

      for (const [_key, value] of Object.entries(
        publicKeyPackage.verifying_shares,
      )) {
        expect(toArray(value).length).toBe(32);
      }
    });
  });

  describe("sign round1 output sizes", () => {
    it("nonces should be exactly 138 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage = keygen.keygen_outputs[0];

      const input: SignRound1Input = { key_package: keyPackage };
      const round1: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519(input);

      expect(round1.nonces.length).toBe(138);
    });

    it("commitments should be exactly 69 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage = keygen.keygen_outputs[0];

      const input: SignRound1Input = { key_package: keyPackage };
      const round1: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519(input);

      expect(round1.commitments.length).toBe(69);
    });

    it("identifier should be exactly 32 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage = keygen.keygen_outputs[0];

      const input: SignRound1Input = { key_package: keyPackage };
      const round1: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519(input);

      expect(round1.identifier.length).toBe(32);
    });
  });

  describe("sign round2 output sizes", () => {
    it("signature_share should be exactly 32 bytes", () => {
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage0 = keygen.keygen_outputs[0];
      const keyPackage1 = keygen.keygen_outputs[1];

      // round1 for both signers
      const round1_0: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519({ key_package: keyPackage0 });
      const round1_1: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519({ key_package: keyPackage1 });

      const message = Array.from(new TextEncoder().encode("test message"));
      const all_commitments = [
        { identifier: round1_0.identifier, commitments: round1_0.commitments },
        { identifier: round1_1.identifier, commitments: round1_1.commitments },
      ];

      const round2Input: SignRound2Input = {
        message,
        key_package: keyPackage0,
        nonces: round1_0.nonces,
        all_commitments,
      };

      const round2: SignatureShareOutput =
        wasmModule.cli_sign_round2_ed25519(round2Input);

      expect(round2.signature_share.length).toBe(32);
      expect(round2.identifier.length).toBe(32);
    });
  });

  describe("full signing flow", () => {
    it("should complete keygen -> round1 -> round2 -> aggregate -> verify", () => {
      // 1. keygen
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage0 = keygen.keygen_outputs[0];
      const keyPackage1 = keygen.keygen_outputs[1];

      // 2. round1 for both signers
      const round1_0: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519({ key_package: keyPackage0 });
      const round1_1: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519({ key_package: keyPackage1 });

      // 3. round2 for both signers
      const message = Array.from(new TextEncoder().encode("test message"));
      const all_commitments = [
        { identifier: round1_0.identifier, commitments: round1_0.commitments },
        { identifier: round1_1.identifier, commitments: round1_1.commitments },
      ];

      const round2_0: SignatureShareOutput = wasmModule.cli_sign_round2_ed25519(
        {
          message,
          key_package: keyPackage0,
          nonces: round1_0.nonces,
          all_commitments,
        },
      );
      const round2_1: SignatureShareOutput = wasmModule.cli_sign_round2_ed25519(
        {
          message,
          key_package: keyPackage1,
          nonces: round1_1.nonces,
          all_commitments,
        },
      );

      // 4. aggregate
      const aggregateInput: AggregateInput = {
        message,
        all_commitments,
        all_signature_shares: [
          {
            identifier: round2_0.identifier,
            signature_share: round2_0.signature_share,
          },
          {
            identifier: round2_1.identifier,
            signature_share: round2_1.signature_share,
          },
        ],
        public_key_package: keygen.public_key_package,
      };

      const signatureOutput: SignatureOutput =
        wasmModule.cli_aggregate_ed25519(aggregateInput);

      expect(signatureOutput.signature.length).toBe(64);

      // 5. verify
      const verifyInput: VerifyInput = {
        message,
        signature: signatureOutput.signature,
        public_key_package: keygen.public_key_package,
      };

      const valid: boolean = wasmModule.cli_verify_ed25519(verifyInput);
      expect(valid).toBe(true);
    });

    it("should fail verification with wrong message", () => {
      // keygen
      const keygen: CentralizedKeygenOutput =
        wasmModule.cli_keygen_centralized_ed25519();
      const keyPackage0 = keygen.keygen_outputs[0];
      const keyPackage1 = keygen.keygen_outputs[1];

      // round1
      const round1_0: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519({ key_package: keyPackage0 });
      const round1_1: SigningCommitmentOutput =
        wasmModule.cli_sign_round1_ed25519({ key_package: keyPackage1 });

      // round2
      const message = Array.from(new TextEncoder().encode("original message"));
      const all_commitments = [
        { identifier: round1_0.identifier, commitments: round1_0.commitments },
        { identifier: round1_1.identifier, commitments: round1_1.commitments },
      ];

      const round2_0: SignatureShareOutput = wasmModule.cli_sign_round2_ed25519(
        {
          message,
          key_package: keyPackage0,
          nonces: round1_0.nonces,
          all_commitments,
        },
      );
      const round2_1: SignatureShareOutput = wasmModule.cli_sign_round2_ed25519(
        {
          message,
          key_package: keyPackage1,
          nonces: round1_1.nonces,
          all_commitments,
        },
      );

      // aggregate
      const signatureOutput: SignatureOutput = wasmModule.cli_aggregate_ed25519(
        {
          message,
          all_commitments,
          all_signature_shares: [
            {
              identifier: round2_0.identifier,
              signature_share: round2_0.signature_share,
            },
            {
              identifier: round2_1.identifier,
              signature_share: round2_1.signature_share,
            },
          ],
          public_key_package: keygen.public_key_package,
        },
      );

      // verify with wrong message
      const wrongMessage = Array.from(
        new TextEncoder().encode("wrong message"),
      );
      const valid: boolean = wasmModule.cli_verify_ed25519({
        message: wrongMessage,
        signature: signatureOutput.signature,
        public_key_package: keygen.public_key_package,
      });

      expect(valid).toBe(false);
    });
  });
});
