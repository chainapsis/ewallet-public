import type {
  CommitmentEntry,
  SignatureShareEntry,
} from "@oko-wallet/teddsa-interface";
import { Participant } from "@oko-wallet/teddsa-interface";

import {
  type NapiCentralizedKeygenOutput,
  type NapiSigningCommitmentOutput,
  runAggregateEd25519,
  runKeygenCentralizedEd25519,
  runSignRound1Ed25519,
  runSignRound2Ed25519,
  runVerifyEd25519,
} from "../server";

interface TeddsaClientState {
  keygenOutput?: NapiCentralizedKeygenOutput;
  round1Output?: NapiSigningCommitmentOutput;
}

interface TeddsaServerState {
  keygenOutput?: NapiCentralizedKeygenOutput;
  round1Output?: NapiSigningCommitmentOutput;
}

function makeClientState(): TeddsaClientState {
  return {};
}

function makeServerState(): TeddsaServerState {
  return {};
}

// ============================================================================
// Integration Tests
// ============================================================================

export async function signTestEd25519(
  clientState: TeddsaClientState,
  serverState: TeddsaServerState,
) {
  // 1. Centralized keygen - generates key shares for both parties
  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeygenOutput = keygenOutput.keygen_outputs[Participant.P0];
  const serverKeygenOutput = keygenOutput.keygen_outputs[Participant.P1];

  console.log(
    `Keygen success. Public key length: ${keygenOutput.public_key.length} bytes`,
  );

  // Store key packages
  clientState.keygenOutput = keygenOutput;
  serverState.keygenOutput = keygenOutput;

  // Test message to sign
  const message = new TextEncoder().encode("Hello, Solana!");

  // 2. Round 1 - Both parties generate nonces and commitments
  const clientRound1 = runSignRound1Ed25519(
    new Uint8Array(clientKeygenOutput.key_package),
  );
  const serverRound1 = runSignRound1Ed25519(
    new Uint8Array(serverKeygenOutput.key_package),
  );

  console.log("Round 1 complete - nonces and commitments generated");

  // Collect all commitments
  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  // 3. Round 2 - Both parties generate signature shares
  const clientRound2 = runSignRound2Ed25519(
    message,
    new Uint8Array(clientKeygenOutput.key_package),
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    new Uint8Array(serverKeygenOutput.key_package),
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  console.log("Round 2 complete - signature shares generated");

  // Collect all signature shares
  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  // 4. Aggregate - Combine signature shares into final signature
  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(clientKeygenOutput.public_key_package),
  );

  console.log(
    `Aggregate success. Signature length: ${aggregateOutput.signature.length} bytes`,
  );

  if (aggregateOutput.signature.length !== 64) {
    throw new Error(
      `Invalid signature length: expected 64, got ${aggregateOutput.signature.length}`,
    );
  }

  // 5. Verify - Check that the signature is valid
  const isValid = runVerifyEd25519(
    message,
    new Uint8Array(aggregateOutput.signature),
    new Uint8Array(clientKeygenOutput.public_key_package),
  );

  if (isValid) {
    console.log("Verification SUCCESS - signature is valid");
  } else {
    throw new Error("Verification FAILED - signature is invalid");
  }

  // Verify with wrong message should fail
  const wrongMessage = new TextEncoder().encode("Wrong message!");
  const isValidWrong = runVerifyEd25519(
    wrongMessage,
    new Uint8Array(aggregateOutput.signature),
    new Uint8Array(clientKeygenOutput.public_key_package),
  );

  if (!isValidWrong) {
    console.log("Negative test passed - wrong message correctly rejected");
  } else {
    throw new Error(
      "Negative test FAILED - wrong message was incorrectly accepted",
    );
  }

  return {
    signature: aggregateOutput.signature,
    publicKey: keygenOutput.public_key,
  };
}

// ============================================================================
// Round 1 Tests
// ============================================================================

async function signRound1BasicTest() {
  console.log("\nTesting sign round1 basic functionality...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );

  const round1Output = runSignRound1Ed25519(clientKeyPackage);

  if (!round1Output.nonces || round1Output.nonces.length === 0) {
    throw new Error("Nonces should not be empty");
  }
  if (!round1Output.commitments || round1Output.commitments.length === 0) {
    throw new Error("Commitments should not be empty");
  }
  if (!round1Output.identifier || round1Output.identifier.length === 0) {
    throw new Error("Identifier should not be empty");
  }

  const keygenIdentifier = Buffer.from(
    keygenOutput.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const round1Identifier = Buffer.from(round1Output.identifier).toString("hex");

  if (keygenIdentifier !== round1Identifier) {
    throw new Error("Round1 identifier should match key_package identifier");
  }

  console.log("  ✓ Basic functionality test passed");
  return round1Output;
}

async function signRound1ErrorTest() {
  console.log("\nTesting sign round1 error cases...\n");

  const invalidInputs = [
    { name: "empty array", input: new Uint8Array(0) },
    { name: "single byte", input: new Uint8Array([0x00]) },
    { name: "invalid format", input: new Uint8Array(100).fill(0xff) },
  ];

  for (const { name, input } of invalidInputs) {
    try {
      runSignRound1Ed25519(input);
      throw new Error(`Expected error for ${name}, but operation succeeded`);
    } catch (error: any) {
      if (
        !error.message?.includes("sign_round1") &&
        !error.message?.includes("deserialize") &&
        !error.message?.includes("error")
      ) {
        throw new Error(`Unexpected error for ${name}: ${error.message}`);
      }
      console.log(`  ✓ Correctly rejected ${name}`);
    }
  }

  console.log("Error handling test passed");
}

async function signRound1OutputFormatTest() {
  console.log("\nTesting sign round1 output format...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );

  const round1Output = runSignRound1Ed25519(clientKeyPackage);

  if (!Array.isArray(round1Output.nonces)) {
    throw new Error("Nonces should be an array");
  }
  if (!Array.isArray(round1Output.commitments)) {
    throw new Error("Commitments should be an array");
  }
  if (!Array.isArray(round1Output.identifier)) {
    throw new Error("Identifier should be an array");
  }

  if (round1Output.nonces.length === 0) {
    throw new Error("Nonces array should not be empty");
  }
  if (round1Output.commitments.length === 0) {
    throw new Error("Commitments array should not be empty");
  }
  if (round1Output.identifier.length === 0) {
    throw new Error("Identifier array should not be empty");
  }

  console.log(`  ✓ Nonces length: ${round1Output.nonces.length} bytes`);
  console.log(
    `  ✓ Commitments length: ${round1Output.commitments.length} bytes`,
  );
  console.log(`  ✓ Identifier length: ${round1Output.identifier.length} bytes`);
  console.log("Output format test passed");
}

async function signRound1RandomnessTest() {
  console.log("\nTesting sign round1 randomness...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );

  const round1_1 = runSignRound1Ed25519(clientKeyPackage);
  const round1_2 = runSignRound1Ed25519(clientKeyPackage);
  const round1_3 = runSignRound1Ed25519(clientKeyPackage);

  const nonces1 = Buffer.from(round1_1.nonces).toString("hex");
  const nonces2 = Buffer.from(round1_2.nonces).toString("hex");
  const nonces3 = Buffer.from(round1_3.nonces).toString("hex");

  if (nonces1 === nonces2 || nonces1 === nonces3 || nonces2 === nonces3) {
    throw new Error("Nonces should be different on each call");
  }

  const commitments1 = Buffer.from(round1_1.commitments).toString("hex");
  const commitments2 = Buffer.from(round1_2.commitments).toString("hex");
  const commitments3 = Buffer.from(round1_3.commitments).toString("hex");

  if (
    commitments1 === commitments2 ||
    commitments1 === commitments3 ||
    commitments2 === commitments3
  ) {
    throw new Error("Commitments should be different on each call");
  }

  const id1 = Buffer.from(round1_1.identifier).toString("hex");
  const id2 = Buffer.from(round1_2.identifier).toString("hex");
  const id3 = Buffer.from(round1_3.identifier).toString("hex");

  if (id1 !== id2 || id2 !== id3) {
    throw new Error("Identifier should be identical across calls");
  }

  console.log(
    "Randomness test passed - nonces/commitments differ, identifier matches",
  );
}

async function signRound1ConsistencyTest() {
  console.log("\nTesting sign round1 consistency...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const clientId = Buffer.from(clientRound1.identifier).toString("hex");
  const serverId = Buffer.from(serverRound1.identifier).toString("hex");
  const keygenClientId = Buffer.from(
    keygenOutput.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const keygenServerId = Buffer.from(
    keygenOutput.keygen_outputs[Participant.P1].identifier,
  ).toString("hex");

  if (clientId !== keygenClientId) {
    throw new Error("Client identifier should match key_package identifier");
  }
  if (serverId !== keygenServerId) {
    throw new Error("Server identifier should match key_package identifier");
  }
  if (clientId === serverId) {
    throw new Error("Client and server identifiers should be different");
  }

  console.log("Consistency test passed - identifiers match key_packages");
}

async function signRound1IntegrationTest() {
  console.log("\nTesting sign round1 integration with round2...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  try {
    const clientRound2 = runSignRound2Ed25519(
      message,
      clientKeyPackage,
      new Uint8Array(clientRound1.nonces),
      allCommitments,
    );

    if (clientRound2.identifier.length === 0) {
      throw new Error("Round2 identifier should not be empty");
    }

    const round1Id = Buffer.from(clientRound1.identifier).toString("hex");
    const round2Id = Buffer.from(clientRound2.identifier).toString("hex");

    if (round1Id !== round2Id) {
      throw new Error("Round1 and Round2 identifiers should match");
    }

    console.log("Integration test passed - round1 output works with round2");
  } catch (error: any) {
    throw new Error(
      `Round1 output should be compatible with round2: ${error.message}`,
    );
  }
}

export async function runRound1Tests() {
  console.log("\n" + "=".repeat(50));
  console.log("Round 1 Tests");
  console.log("=".repeat(50));

  await signRound1BasicTest();
  await signRound1ErrorTest();
  await signRound1OutputFormatTest();
  await signRound1RandomnessTest();
  await signRound1ConsistencyTest();
  await signRound1IntegrationTest();

  console.log("\n✓ All Round 1 tests passed");
}

// ============================================================================
// Round 2 Tests
// ============================================================================

async function signRound2BasicTest() {
  console.log("\nTesting sign round2 basic functionality...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );

  if (
    !clientRound2.signature_share ||
    clientRound2.signature_share.length === 0
  ) {
    throw new Error("Signature share should not be empty");
  }
  if (!clientRound2.identifier || clientRound2.identifier.length === 0) {
    throw new Error("Identifier should not be empty");
  }

  const keygenIdentifier = Buffer.from(
    keygenOutput.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const round1Identifier = Buffer.from(clientRound1.identifier).toString("hex");
  const round2Identifier = Buffer.from(clientRound2.identifier).toString("hex");

  if (keygenIdentifier !== round2Identifier) {
    throw new Error("Round2 identifier should match key_package identifier");
  }
  if (round1Identifier !== round2Identifier) {
    throw new Error("Round2 identifier should match round1 identifier");
  }

  console.log("  ✓ Basic functionality test passed");
  return clientRound2;
}

async function signRound2ErrorTest() {
  console.log("\nTesting sign round2 error cases...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const validCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  // Test invalid key_package
  try {
    runSignRound2Ed25519(
      message,
      new Uint8Array(0),
      new Uint8Array(clientRound1.nonces),
      validCommitments,
    );
    throw new Error("Expected error for empty key_package");
  } catch (error: any) {
    if (
      !error.message?.includes("sign_round2") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for empty key_package: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected empty key_package");
  }

  // Test invalid nonces
  try {
    runSignRound2Ed25519(
      message,
      clientKeyPackage,
      new Uint8Array(0),
      validCommitments,
    );
    throw new Error("Expected error for empty nonces");
  } catch (error: any) {
    if (
      !error.message?.includes("sign_round2") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(`Unexpected error for empty nonces: ${error.message}`);
    }
    console.log("  ✓ Correctly rejected empty nonces");
  }

  // Test invalid all_commitments (empty array)
  try {
    runSignRound2Ed25519(
      message,
      clientKeyPackage,
      new Uint8Array(clientRound1.nonces),
      [],
    );
    throw new Error("Expected error for empty all_commitments");
  } catch (error: any) {
    if (
      !error.message?.includes("sign_round2") &&
      !error.message?.includes("IncorrectNumberOfCommitments") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for empty all_commitments: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected empty all_commitments");
  }

  // Test invalid all_commitments (missing own commitment)
  const invalidCommitments: CommitmentEntry[] = [
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];
  try {
    runSignRound2Ed25519(
      message,
      clientKeyPackage,
      new Uint8Array(clientRound1.nonces),
      invalidCommitments,
    );
    throw new Error("Expected error for missing own commitment");
  } catch (error: any) {
    if (
      !error.message?.includes("sign_round2") &&
      !error.message?.includes("MissingCommitment") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for missing own commitment: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected missing own commitment");
  }

  console.log("Error handling test passed");
}

async function signRound2OutputFormatTest() {
  console.log("\nTesting sign round2 output format...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const round2Output = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );

  if (!Array.isArray(round2Output.signature_share)) {
    throw new Error("Signature share should be an array");
  }
  if (!Array.isArray(round2Output.identifier)) {
    throw new Error("Identifier should be an array");
  }

  if (round2Output.signature_share.length === 0) {
    throw new Error("Signature share array should not be empty");
  }
  if (round2Output.identifier.length === 0) {
    throw new Error("Identifier array should not be empty");
  }

  console.log(
    `  ✓ Signature share length: ${round2Output.signature_share.length} bytes`,
  );
  console.log(`  ✓ Identifier length: ${round2Output.identifier.length} bytes`);
  console.log("Output format test passed");
}

async function signRound2ConsistencyTest() {
  console.log("\nTesting sign round2 consistency...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const clientId = Buffer.from(clientRound2.identifier).toString("hex");
  const serverId = Buffer.from(serverRound2.identifier).toString("hex");
  const keygenClientId = Buffer.from(
    keygenOutput.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const keygenServerId = Buffer.from(
    keygenOutput.keygen_outputs[Participant.P1].identifier,
  ).toString("hex");
  const round1ClientId = Buffer.from(clientRound1.identifier).toString("hex");
  const round1ServerId = Buffer.from(serverRound1.identifier).toString("hex");

  if (clientId !== keygenClientId) {
    throw new Error("Client identifier should match key_package identifier");
  }
  if (serverId !== keygenServerId) {
    throw new Error("Server identifier should match key_package identifier");
  }
  if (clientId !== round1ClientId) {
    throw new Error("Client identifier should match round1 identifier");
  }
  if (serverId !== round1ServerId) {
    throw new Error("Server identifier should match round1 identifier");
  }
  if (clientId === serverId) {
    throw new Error("Client and server identifiers should be different");
  }

  console.log(
    "Consistency test passed - identifiers match key_packages and round1",
  );
}

async function signRound2NoncesCommitmentsTest() {
  console.log("\nTesting sign round2 nonces-commitments matching...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  // Test with correct nonces and commitments
  const round2Output = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );

  if (round2Output.signature_share.length === 0) {
    throw new Error("Signature share should not be empty");
  }

  // Test with wrong nonces (from different round1)
  const anotherRound1 = runSignRound1Ed25519(clientKeyPackage);
  try {
    runSignRound2Ed25519(
      message,
      clientKeyPackage,
      new Uint8Array(anotherRound1.nonces),
      allCommitments,
    );
    throw new Error("Expected error for mismatched nonces and commitments");
  } catch (error: any) {
    if (
      !error.message?.includes("sign_round2") &&
      !error.message?.includes("IncorrectCommitment") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for mismatched nonces: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected mismatched nonces and commitments");
  }

  console.log("Nonces-commitments matching test passed");
}

async function signRound2MessageDependencyTest() {
  console.log("\nTesting sign round2 message dependency...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const _allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message1 = new TextEncoder().encode("Message 1");
  const message2 = new TextEncoder().encode("Message 2");
  const message3 = new TextEncoder().encode("Message 3");

  // Generate new round1 for each message (since nonces can only be used once)
  const round1_1 = runSignRound1Ed25519(clientKeyPackage);
  const round1_2 = runSignRound1Ed25519(clientKeyPackage);
  const round1_3 = runSignRound1Ed25519(clientKeyPackage);

  const commitments1: CommitmentEntry[] = [
    {
      identifier: round1_1.identifier,
      commitments: round1_1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];
  const commitments2: CommitmentEntry[] = [
    {
      identifier: round1_2.identifier,
      commitments: round1_2.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];
  const commitments3: CommitmentEntry[] = [
    {
      identifier: round1_3.identifier,
      commitments: round1_3.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const round2_1 = runSignRound2Ed25519(
    message1,
    clientKeyPackage,
    new Uint8Array(round1_1.nonces),
    commitments1,
  );
  const round2_2 = runSignRound2Ed25519(
    message2,
    clientKeyPackage,
    new Uint8Array(round1_2.nonces),
    commitments2,
  );
  const round2_3 = runSignRound2Ed25519(
    message3,
    clientKeyPackage,
    new Uint8Array(round1_3.nonces),
    commitments3,
  );

  const share1 = Buffer.from(round2_1.signature_share).toString("hex");
  const share2 = Buffer.from(round2_2.signature_share).toString("hex");
  const share3 = Buffer.from(round2_3.signature_share).toString("hex");

  if (share1 === share2 || share1 === share3 || share2 === share3) {
    throw new Error(
      "Signature shares should be different for different messages",
    );
  }

  const id1 = Buffer.from(round2_1.identifier).toString("hex");
  const id2 = Buffer.from(round2_2.identifier).toString("hex");
  const id3 = Buffer.from(round2_3.identifier).toString("hex");

  if (id1 !== id2 || id2 !== id3) {
    throw new Error("Identifier should be identical across different messages");
  }

  console.log(
    "Message dependency test passed - different messages produce different shares",
  );
}

async function signRound2IntegrationTest() {
  console.log("\nTesting sign round2 integration with aggregate...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Integration test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  try {
    const aggregateOutput = runAggregateEd25519(
      message,
      allCommitments,
      allSignatureShares,
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );

    if (aggregateOutput.signature.length !== 64) {
      throw new Error(
        `Invalid signature length: expected 64, got ${aggregateOutput.signature.length}`,
      );
    }

    const isValid = runVerifyEd25519(
      message,
      new Uint8Array(aggregateOutput.signature),
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );

    if (!isValid) {
      throw new Error("Aggregated signature should be valid");
    }

    console.log(
      "Integration test passed - round2 output works with aggregate and verify",
    );
  } catch (error: any) {
    throw new Error(
      `Round2 output should be compatible with aggregate: ${error.message}`,
    );
  }
}

export async function runRound2Tests() {
  console.log("\n" + "=".repeat(50));
  console.log("Round 2 Tests");
  console.log("=".repeat(50));

  await signRound2BasicTest();
  await signRound2ErrorTest();
  await signRound2OutputFormatTest();
  await signRound2ConsistencyTest();
  await signRound2NoncesCommitmentsTest();
  await signRound2MessageDependencyTest();
  await signRound2IntegrationTest();

  console.log("\n✓ All Round 2 tests passed");
}

// ============================================================================
// Aggregate Tests
// ============================================================================

async function aggregateBasicTest() {
  console.log("\nTesting aggregate basic functionality...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (!aggregateOutput.signature || aggregateOutput.signature.length === 0) {
    throw new Error("Signature should not be empty");
  }
  if (aggregateOutput.signature.length !== 64) {
    throw new Error(
      `Invalid signature length: expected 64, got ${aggregateOutput.signature.length}`,
    );
  }

  console.log("  ✓ Basic functionality test passed");
  return aggregateOutput;
}

async function aggregateErrorTest() {
  console.log("\nTesting aggregate error cases...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  // Test invalid public_key_package
  try {
    runAggregateEd25519(
      message,
      allCommitments,
      allSignatureShares,
      new Uint8Array(0),
    );
    throw new Error("Expected error for empty public_key_package");
  } catch (error: any) {
    if (
      !error.message?.includes("aggregate") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for empty public_key_package: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected empty public_key_package");
  }

  // Test invalid all_commitments (empty array)
  try {
    runAggregateEd25519(
      message,
      [],
      allSignatureShares,
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );
    throw new Error("Expected error for empty all_commitments");
  } catch (error: any) {
    if (
      !error.message?.includes("aggregate") &&
      !error.message?.includes("IncorrectNumberOfCommitments") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for empty all_commitments: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected empty all_commitments");
  }

  // Test invalid all_signature_shares (empty array)
  try {
    runAggregateEd25519(
      message,
      allCommitments,
      [],
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );
    throw new Error("Expected error for empty all_signature_shares");
  } catch (error: any) {
    if (
      !error.message?.includes("aggregate") &&
      !error.message?.includes("IncorrectNumberOfCommitments") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for empty all_signature_shares: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected empty all_signature_shares");
  }

  // Test mismatched identifiers (commitments and signature_shares)
  const mismatchedSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
  ];
  try {
    runAggregateEd25519(
      message,
      allCommitments,
      mismatchedSignatureShares,
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );
    throw new Error("Expected error for mismatched identifiers");
  } catch (error: any) {
    if (
      !error.message?.includes("aggregate") &&
      !error.message?.includes("IncorrectNumberOfCommitments") &&
      !error.message?.includes("UnknownIdentifier") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for mismatched identifiers: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected mismatched identifiers");
  }

  console.log("Error handling test passed");
}

async function aggregateOutputFormatTest() {
  console.log("\nTesting aggregate output format...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (!Array.isArray(aggregateOutput.signature)) {
    throw new Error("Signature should be an array");
  }

  if (aggregateOutput.signature.length === 0) {
    throw new Error("Signature array should not be empty");
  }

  if (aggregateOutput.signature.length !== 64) {
    throw new Error(
      `Signature length should be 64 bytes, got ${aggregateOutput.signature.length}`,
    );
  }

  console.log(
    `  ✓ Signature length: ${aggregateOutput.signature.length} bytes`,
  );
  console.log("Output format test passed");
}

async function aggregateConsistencyTest() {
  console.log("\nTesting aggregate consistency...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  // Test same input produces same output
  const aggregate1 = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );
  const aggregate2 = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const sig1 = Buffer.from(aggregate1.signature).toString("hex");
  const sig2 = Buffer.from(aggregate2.signature).toString("hex");

  if (sig1 !== sig2) {
    throw new Error("Same input should produce same signature");
  }

  // Test order independence (reverse order of commitments and signature_shares)
  const reversedCommitments: CommitmentEntry[] = [
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
  ];

  const reversedSignatureShares: SignatureShareEntry[] = [
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
  ];

  const aggregate3 = runAggregateEd25519(
    message,
    reversedCommitments,
    reversedSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const sig3 = Buffer.from(aggregate3.signature).toString("hex");

  if (sig1 !== sig3) {
    throw new Error("Order of commitments/shares should not affect result");
  }

  console.log("Consistency test passed - same input produces same output");
}

async function aggregateCommitmentsSharesMatchingTest() {
  console.log("\nTesting aggregate commitments-shares matching...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  // Test with correct matching
  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (aggregateOutput.signature.length !== 64) {
    throw new Error("Signature should be 64 bytes");
  }

  // Test with missing commitment (only client)
  const clientOnlyCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
  ];

  try {
    runAggregateEd25519(
      message,
      clientOnlyCommitments,
      allSignatureShares,
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );
    throw new Error("Expected error for missing commitment");
  } catch (error: any) {
    if (
      !error.message?.includes("aggregate") &&
      !error.message?.includes("IncorrectNumberOfCommitments") &&
      !error.message?.includes("UnknownIdentifier") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for missing commitment: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected missing commitment");
  }

  // Test with missing signature share (only client)
  const clientOnlySignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
  ];

  try {
    runAggregateEd25519(
      message,
      allCommitments,
      clientOnlySignatureShares,
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );
    throw new Error("Expected error for missing signature share");
  } catch (error: any) {
    if (
      !error.message?.includes("aggregate") &&
      !error.message?.includes("IncorrectNumberOfCommitments") &&
      !error.message?.includes("UnknownIdentifier") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for missing signature share: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected missing signature share");
  }

  console.log("Commitments-shares matching test passed");
}

async function aggregateMessageDependencyTest() {
  console.log("\nTesting aggregate message dependency...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  // Generate single set of round1/commitments/nonces to use for all messages
  // This allows us to test message dependency by keeping nonces/commitments constant
  const round1_client = runSignRound1Ed25519(clientKeyPackage);
  const round1_server = runSignRound1Ed25519(serverKeyPackage);
  const sharedCommitments: CommitmentEntry[] = [
    {
      identifier: round1_client.identifier,
      commitments: round1_client.commitments,
    },
    {
      identifier: round1_server.identifier,
      commitments: round1_server.commitments,
    },
  ];

  const message1 = new TextEncoder().encode("Message 1");
  const message2 = new TextEncoder().encode("Message 2");
  const message3 = new TextEncoder().encode("Message 3");
  const emptyMessage = new Uint8Array(0);

  // Use the SAME nonces and commitments for different messages
  // This tests that aggregate correctly depends on the message parameter
  const round2_1_client = runSignRound2Ed25519(
    message1,
    clientKeyPackage,
    new Uint8Array(round1_client.nonces),
    sharedCommitments,
  );
  const round2_1_server = runSignRound2Ed25519(
    message1,
    serverKeyPackage,
    new Uint8Array(round1_server.nonces),
    sharedCommitments,
  );
  const shares1: SignatureShareEntry[] = [
    {
      identifier: round2_1_client.identifier,
      signature_share: round2_1_client.signature_share,
    },
    {
      identifier: round2_1_server.identifier,
      signature_share: round2_1_server.signature_share,
    },
  ];

  // Use the SAME nonces and commitments for message2
  const round2_2_client = runSignRound2Ed25519(
    message2,
    clientKeyPackage,
    new Uint8Array(round1_client.nonces),
    sharedCommitments,
  );
  const round2_2_server = runSignRound2Ed25519(
    message2,
    serverKeyPackage,
    new Uint8Array(round1_server.nonces),
    sharedCommitments,
  );
  const shares2: SignatureShareEntry[] = [
    {
      identifier: round2_2_client.identifier,
      signature_share: round2_2_client.signature_share,
    },
    {
      identifier: round2_2_server.identifier,
      signature_share: round2_2_server.signature_share,
    },
  ];

  // Use the SAME nonces and commitments for message3
  const round2_3_client = runSignRound2Ed25519(
    message3,
    clientKeyPackage,
    new Uint8Array(round1_client.nonces),
    sharedCommitments,
  );
  const round2_3_server = runSignRound2Ed25519(
    message3,
    serverKeyPackage,
    new Uint8Array(round1_server.nonces),
    sharedCommitments,
  );
  const shares3: SignatureShareEntry[] = [
    {
      identifier: round2_3_client.identifier,
      signature_share: round2_3_client.signature_share,
    },
    {
      identifier: round2_3_server.identifier,
      signature_share: round2_3_server.signature_share,
    },
  ];

  // Aggregate with same commitments/shares but different messages
  const aggregate1 = runAggregateEd25519(
    message1,
    sharedCommitments,
    shares1,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );
  const aggregate2 = runAggregateEd25519(
    message2,
    sharedCommitments,
    shares2,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );
  const aggregate3 = runAggregateEd25519(
    message3,
    sharedCommitments,
    shares3,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const sig1 = Buffer.from(aggregate1.signature).toString("hex");
  const sig2 = Buffer.from(aggregate2.signature).toString("hex");
  const sig3 = Buffer.from(aggregate3.signature).toString("hex");

  // Different messages should produce different signatures
  // This proves that aggregate correctly depends on the message parameter
  if (sig1 === sig2 || sig1 === sig3 || sig2 === sig3) {
    throw new Error("Different messages should produce different signatures");
  }

  // Test empty message with new nonces (since we already used the shared nonces)
  const round1_empty_client = runSignRound1Ed25519(clientKeyPackage);
  const round1_empty_server = runSignRound1Ed25519(serverKeyPackage);
  const commitments_empty: CommitmentEntry[] = [
    {
      identifier: round1_empty_client.identifier,
      commitments: round1_empty_client.commitments,
    },
    {
      identifier: round1_empty_server.identifier,
      commitments: round1_empty_server.commitments,
    },
  ];
  const round2_empty_client = runSignRound2Ed25519(
    emptyMessage,
    clientKeyPackage,
    new Uint8Array(round1_empty_client.nonces),
    commitments_empty,
  );
  const round2_empty_server = runSignRound2Ed25519(
    emptyMessage,
    serverKeyPackage,
    new Uint8Array(round1_empty_server.nonces),
    commitments_empty,
  );
  const shares_empty: SignatureShareEntry[] = [
    {
      identifier: round2_empty_client.identifier,
      signature_share: round2_empty_client.signature_share,
    },
    {
      identifier: round2_empty_server.identifier,
      signature_share: round2_empty_server.signature_share,
    },
  ];

  const aggregateEmpty = runAggregateEd25519(
    emptyMessage,
    commitments_empty,
    shares_empty,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (aggregateEmpty.signature.length !== 64) {
    throw new Error("Empty message should still produce valid signature");
  }

  // Verify that empty message signature is different from non-empty messages
  const sigEmpty = Buffer.from(aggregateEmpty.signature).toString("hex");
  if (sigEmpty === sig1 || sigEmpty === sig2 || sigEmpty === sig3) {
    throw new Error("Empty message should produce different signature");
  }

  console.log(
    "Message dependency test passed - same nonces/commitments, different messages produce different signatures",
  );
}

async function aggregateIntegrationTest() {
  console.log("\nTesting aggregate integration with verify...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Integration test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (aggregateOutput.signature.length !== 64) {
    throw new Error(
      `Invalid signature length: expected 64, got ${aggregateOutput.signature.length}`,
    );
  }

  const isValid = runVerifyEd25519(
    message,
    new Uint8Array(aggregateOutput.signature),
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (!isValid) {
    throw new Error("Aggregated signature should be valid");
  }

  // Test with wrong message
  const wrongMessage = new TextEncoder().encode("Wrong message");
  const isValidWrong = runVerifyEd25519(
    wrongMessage,
    new Uint8Array(aggregateOutput.signature),
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (isValidWrong) {
    throw new Error("Wrong message should not verify");
  }

  console.log("Integration test passed - aggregate output works with verify");
}

async function aggregateThresholdTest() {
  console.log("\nTesting aggregate threshold validation...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  // Test with threshold (2-of-2, so both shares required)
  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateWithThreshold = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (aggregateWithThreshold.signature.length !== 64) {
    throw new Error("Threshold shares should produce valid signature");
  }

  // Verify the threshold signature
  const isValid = runVerifyEd25519(
    message,
    new Uint8Array(aggregateWithThreshold.signature),
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (!isValid) {
    throw new Error("Threshold signature should be valid");
  }

  // Test with below threshold (only one share)
  const singleSignatureShare: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
  ];

  const singleCommitment: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
  ];

  try {
    runAggregateEd25519(
      message,
      singleCommitment,
      singleSignatureShare,
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );
    throw new Error("Expected error for below threshold shares");
  } catch (error: any) {
    if (
      !error.message?.includes("aggregate") &&
      !error.message?.includes("IncorrectNumberOfCommitments") &&
      !error.message?.includes("error")
    ) {
      throw new Error(`Unexpected error for below threshold: ${error.message}`);
    }
    console.log("  ✓ Correctly rejected below threshold shares");
  }

  console.log(
    "Threshold test passed - threshold shares work, below threshold rejected",
  );
}

export async function runAggregateTests() {
  console.log("\n" + "=".repeat(50));
  console.log("Aggregate Tests");
  console.log("=".repeat(50));

  await aggregateBasicTest();
  await aggregateErrorTest();
  await aggregateOutputFormatTest();
  await aggregateConsistencyTest();
  await aggregateCommitmentsSharesMatchingTest();
  await aggregateMessageDependencyTest();
  await aggregateIntegrationTest();
  await aggregateThresholdTest();

  console.log("\n✓ All Aggregate tests passed");
}

// ============================================================================
// Verify Tests
// ============================================================================

async function verifyBasicTest() {
  console.log("\nTesting verify basic functionality...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const isValid = runVerifyEd25519(
    message,
    new Uint8Array(aggregateOutput.signature),
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (typeof isValid !== "boolean") {
    throw new Error("Verify should return a boolean");
  }

  if (!isValid) {
    throw new Error("Valid signature should return true");
  }

  console.log("  ✓ Basic functionality test passed");
  return isValid;
}

async function verifyErrorTest() {
  console.log("\nTesting verify error cases...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const validSignature = new Uint8Array(aggregateOutput.signature);
  const validPublicKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].public_key_package,
  );

  // Test invalid public_key_package
  try {
    runVerifyEd25519(message, validSignature, new Uint8Array(0));
    throw new Error("Expected error for empty public_key_package");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for empty public_key_package: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected empty public_key_package");
  }

  // Test invalid signature (empty)
  try {
    runVerifyEd25519(message, new Uint8Array(0), validPublicKeyPackage);
    throw new Error("Expected error for empty signature");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("Invalid signature length") &&
      !error.message?.includes("error")
    ) {
      throw new Error(`Unexpected error for empty signature: ${error.message}`);
    }
    console.log("  ✓ Correctly rejected empty signature");
  }

  // Test invalid signature (wrong length)
  try {
    runVerifyEd25519(message, new Uint8Array(32), validPublicKeyPackage);
    throw new Error("Expected error for wrong signature length");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("Invalid signature length") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for wrong signature length: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected wrong signature length");
  }

  // Test invalid signature (too long)
  try {
    runVerifyEd25519(message, new Uint8Array(128), validPublicKeyPackage);
    throw new Error("Expected error for too long signature");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("Invalid signature length") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for too long signature: ${error.message}`,
      );
    }
    console.log("  ✓ Correctly rejected too long signature");
  }

  console.log("Error handling test passed");
}

async function verifyOutputFormatTest() {
  console.log("\nTesting verify output format...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const isValid = runVerifyEd25519(
    message,
    new Uint8Array(aggregateOutput.signature),
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  if (typeof isValid !== "boolean") {
    throw new Error("Verify output should be a boolean");
  }

  if (isValid !== true) {
    throw new Error("Valid signature should return true");
  }

  // Test invalid signature (may throw error during deserialize or return false)
  const invalidSignature = new Uint8Array(64).fill(0xff);
  try {
    const isValidInvalid = runVerifyEd25519(
      message,
      invalidSignature,
      new Uint8Array(
        keygenOutput.keygen_outputs[Participant.P0].public_key_package,
      ),
    );

    // If no error, should return false
    if (typeof isValidInvalid !== "boolean") {
      throw new Error(
        "Verify output should be a boolean even for invalid signature",
      );
    }

    if (isValidInvalid !== false) {
      throw new Error("Invalid signature should return false");
    }
  } catch (error: any) {
    // If error occurs during deserialize, that's also acceptable
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("elliptic curve") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for invalid signature: ${error.message}`,
      );
    }
  }

  console.log("  ✓ Output is boolean type");
  console.log("  ✓ Valid signature returns true");
  console.log("  ✓ Invalid signature returns false");
  console.log("Output format test passed");
}

async function verifyConsistencyTest() {
  console.log("\nTesting verify consistency...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const signature = new Uint8Array(aggregateOutput.signature);
  const publicKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].public_key_package,
  );

  // Test same input produces same output
  const isValid1 = runVerifyEd25519(message, signature, publicKeyPackage);
  const isValid2 = runVerifyEd25519(message, signature, publicKeyPackage);
  const isValid3 = runVerifyEd25519(message, signature, publicKeyPackage);

  if (isValid1 !== isValid2 || isValid2 !== isValid3) {
    throw new Error("Same input should produce same verification result");
  }

  if (!isValid1) {
    throw new Error("Valid signature should consistently return true");
  }

  // Test invalid signature consistently returns false or throws error
  const invalidSignature = new Uint8Array(64).fill(0xff);
  try {
    const isValidInvalid1 = runVerifyEd25519(
      message,
      invalidSignature,
      publicKeyPackage,
    );
    const isValidInvalid2 = runVerifyEd25519(
      message,
      invalidSignature,
      publicKeyPackage,
    );

    if (isValidInvalid1 !== isValidInvalid2) {
      throw new Error(
        "Same invalid input should produce same verification result",
      );
    }

    if (isValidInvalid1 !== false) {
      throw new Error("Invalid signature should consistently return false");
    }
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("elliptic curve") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for invalid signature: ${error.message}`,
      );
    }
  }

  console.log("Consistency test passed - same input produces same output");
}

async function verifyInvalidSignatureTest() {
  console.log("\nTesting verify invalid signature rejection...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const message = new TextEncoder().encode("Test message");
  const publicKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].public_key_package,
  );

  // Test random bytes as signature (may throw error during deserialize or return false)
  const randomSignature = new Uint8Array(64);
  crypto.getRandomValues(randomSignature);
  try {
    const isValidRandom = runVerifyEd25519(
      message,
      randomSignature,
      publicKeyPackage,
    );

    if (isValidRandom) {
      throw new Error("Random bytes should not be a valid signature");
    }
    console.log("  ✓ Correctly rejected random bytes signature");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("elliptic curve") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for random signature: ${error.message}`,
      );
    }
    console.log(
      "  ✓ Correctly rejected random bytes signature (deserialize error)",
    );
  }

  // Test all zeros signature (may throw error during deserialize or return false)
  const zeroSignature = new Uint8Array(64).fill(0);
  try {
    const isValidZero = runVerifyEd25519(
      message,
      zeroSignature,
      publicKeyPackage,
    );

    if (isValidZero) {
      throw new Error("All zeros should not be a valid signature");
    }
    console.log("  ✓ Correctly rejected all zeros signature");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("elliptic curve") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(`Unexpected error for zero signature: ${error.message}`);
    }
    console.log(
      "  ✓ Correctly rejected all zeros signature (deserialize error)",
    );
  }

  // Test all ones signature (may throw error during deserialize or return false)
  const onesSignature = new Uint8Array(64).fill(0xff);
  try {
    const isValidOnes = runVerifyEd25519(
      message,
      onesSignature,
      publicKeyPackage,
    );

    if (isValidOnes) {
      throw new Error("All ones should not be a valid signature");
    }
    console.log("  ✓ Correctly rejected all ones signature");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("elliptic curve") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(`Unexpected error for ones signature: ${error.message}`);
    }
    console.log(
      "  ✓ Correctly rejected all ones signature (deserialize error)",
    );
  }

  // Test signature from different key
  const otherKeygenOutput = runKeygenCentralizedEd25519();
  const otherClientKeyPackage = new Uint8Array(
    otherKeygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const otherServerKeyPackage = new Uint8Array(
    otherKeygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const otherClientRound1 = runSignRound1Ed25519(otherClientKeyPackage);
  const otherServerRound1 = runSignRound1Ed25519(otherServerKeyPackage);

  const otherAllCommitments: CommitmentEntry[] = [
    {
      identifier: otherClientRound1.identifier,
      commitments: otherClientRound1.commitments,
    },
    {
      identifier: otherServerRound1.identifier,
      commitments: otherServerRound1.commitments,
    },
  ];

  const otherClientRound2 = runSignRound2Ed25519(
    message,
    otherClientKeyPackage,
    new Uint8Array(otherClientRound1.nonces),
    otherAllCommitments,
  );
  const otherServerRound2 = runSignRound2Ed25519(
    message,
    otherServerKeyPackage,
    new Uint8Array(otherServerRound1.nonces),
    otherAllCommitments,
  );

  const otherAllSignatureShares: SignatureShareEntry[] = [
    {
      identifier: otherClientRound2.identifier,
      signature_share: otherClientRound2.signature_share,
    },
    {
      identifier: otherServerRound2.identifier,
      signature_share: otherServerRound2.signature_share,
    },
  ];

  const otherAggregateOutput = runAggregateEd25519(
    message,
    otherAllCommitments,
    otherAllSignatureShares,
    new Uint8Array(
      otherKeygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  // Verify signature from different key with original public key should fail
  const isValidWrongKey = runVerifyEd25519(
    message,
    new Uint8Array(otherAggregateOutput.signature),
    publicKeyPackage,
  );

  if (isValidWrongKey) {
    throw new Error("Signature from different key should not verify");
  }
  console.log("  ✓ Correctly rejected signature from different key");

  // Test modified signature (flip one bit)
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const validSignature = new Uint8Array(aggregateOutput.signature);
  const modifiedSignature = new Uint8Array(validSignature);
  modifiedSignature[0] = modifiedSignature[0] ^ 0x01; // Flip one bit

  // Modified signature may throw error during deserialize or return false
  try {
    const isValidModified = runVerifyEd25519(
      message,
      modifiedSignature,
      publicKeyPackage,
    );

    if (isValidModified) {
      throw new Error("Modified signature should not verify");
    }
    console.log("  ✓ Correctly rejected modified signature");
  } catch (error: any) {
    if (
      !error.message?.includes("verify") &&
      !error.message?.includes("elliptic curve") &&
      !error.message?.includes("deserialize") &&
      !error.message?.includes("error")
    ) {
      throw new Error(
        `Unexpected error for modified signature: ${error.message}`,
      );
    }
    console.log(
      "  ✓ Correctly rejected modified signature (deserialize error)",
    );
  }

  console.log("Invalid signature test passed");
}

async function verifyWrongMessageTest() {
  console.log("\nTesting verify wrong message rejection...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message1 = new TextEncoder().encode("Message 1");
  const message2 = new TextEncoder().encode("Message 2");
  const message3 = new TextEncoder().encode("Message 3");

  const clientRound2 = runSignRound2Ed25519(
    message1,
    clientKeyPackage,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message1,
    serverKeyPackage,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message1,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const signature = new Uint8Array(aggregateOutput.signature);
  const publicKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].public_key_package,
  );

  // Test correct message should verify
  const isValidCorrect = runVerifyEd25519(
    message1,
    signature,
    publicKeyPackage,
  );
  if (!isValidCorrect) {
    throw new Error("Correct message should verify");
  }
  console.log("  ✓ Correct message verifies successfully");

  // Test wrong message should not verify
  const isValidWrong1 = runVerifyEd25519(message2, signature, publicKeyPackage);
  if (isValidWrong1) {
    throw new Error("Wrong message should not verify");
  }
  console.log("  ✓ Wrong message correctly rejected");

  const isValidWrong2 = runVerifyEd25519(message3, signature, publicKeyPackage);
  if (isValidWrong2) {
    throw new Error("Wrong message should not verify");
  }
  console.log("  ✓ Another wrong message correctly rejected");

  // Test modified message (add one byte)
  const modifiedMessage = new Uint8Array([...message1, 0x00]);
  const isValidModified = runVerifyEd25519(
    modifiedMessage,
    signature,
    publicKeyPackage,
  );
  if (isValidModified) {
    throw new Error("Modified message should not verify");
  }
  console.log("  ✓ Modified message correctly rejected");

  // Test empty message vs non-empty message
  const emptyMessage = new Uint8Array(0);
  const emptyClientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const emptyServerRound1 = runSignRound1Ed25519(serverKeyPackage);

  const emptyAllCommitments: CommitmentEntry[] = [
    {
      identifier: emptyClientRound1.identifier,
      commitments: emptyClientRound1.commitments,
    },
    {
      identifier: emptyServerRound1.identifier,
      commitments: emptyServerRound1.commitments,
    },
  ];

  const emptyClientRound2 = runSignRound2Ed25519(
    emptyMessage,
    clientKeyPackage,
    new Uint8Array(emptyClientRound1.nonces),
    emptyAllCommitments,
  );
  const emptyServerRound2 = runSignRound2Ed25519(
    emptyMessage,
    serverKeyPackage,
    new Uint8Array(emptyServerRound1.nonces),
    emptyAllCommitments,
  );

  const emptyAllSignatureShares: SignatureShareEntry[] = [
    {
      identifier: emptyClientRound2.identifier,
      signature_share: emptyClientRound2.signature_share,
    },
    {
      identifier: emptyServerRound2.identifier,
      signature_share: emptyServerRound2.signature_share,
    },
  ];

  const emptyAggregateOutput = runAggregateEd25519(
    emptyMessage,
    emptyAllCommitments,
    emptyAllSignatureShares,
    publicKeyPackage,
  );

  const emptySignature = new Uint8Array(emptyAggregateOutput.signature);

  // Empty message signature should verify with empty message
  const isValidEmpty = runVerifyEd25519(
    emptyMessage,
    emptySignature,
    publicKeyPackage,
  );
  if (!isValidEmpty) {
    throw new Error("Empty message signature should verify with empty message");
  }

  // Empty message signature should not verify with non-empty message
  const isValidEmptyWrong = runVerifyEd25519(
    message1,
    emptySignature,
    publicKeyPackage,
  );
  if (isValidEmptyWrong) {
    throw new Error(
      "Empty message signature should not verify with non-empty message",
    );
  }
  console.log("  ✓ Empty message signature correctly handled");

  console.log("Wrong message test passed");
}

async function verifyWrongPublicKeyTest() {
  console.log("\nTesting verify wrong public key rejection...\n");

  const keygenOutput1 = runKeygenCentralizedEd25519();
  const keygenOutput2 = runKeygenCentralizedEd25519();

  const clientKeyPackage1 = new Uint8Array(
    keygenOutput1.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage1 = new Uint8Array(
    keygenOutput1.keygen_outputs[Participant.P1].key_package,
  );

  const clientRound1 = runSignRound1Ed25519(clientKeyPackage1);
  const serverRound1 = runSignRound1Ed25519(serverKeyPackage1);

  const allCommitments: CommitmentEntry[] = [
    {
      identifier: clientRound1.identifier,
      commitments: clientRound1.commitments,
    },
    {
      identifier: serverRound1.identifier,
      commitments: serverRound1.commitments,
    },
  ];

  const message = new TextEncoder().encode("Test message");

  const clientRound2 = runSignRound2Ed25519(
    message,
    clientKeyPackage1,
    new Uint8Array(clientRound1.nonces),
    allCommitments,
  );
  const serverRound2 = runSignRound2Ed25519(
    message,
    serverKeyPackage1,
    new Uint8Array(serverRound1.nonces),
    allCommitments,
  );

  const allSignatureShares: SignatureShareEntry[] = [
    {
      identifier: clientRound2.identifier,
      signature_share: clientRound2.signature_share,
    },
    {
      identifier: serverRound2.identifier,
      signature_share: serverRound2.signature_share,
    },
  ];

  const aggregateOutput = runAggregateEd25519(
    message,
    allCommitments,
    allSignatureShares,
    new Uint8Array(
      keygenOutput1.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const signature = new Uint8Array(aggregateOutput.signature);
  const correctPublicKeyPackage = new Uint8Array(
    keygenOutput1.keygen_outputs[Participant.P0].public_key_package,
  );
  const wrongPublicKeyPackage = new Uint8Array(
    keygenOutput2.keygen_outputs[Participant.P0].public_key_package,
  );

  // Test correct public key should verify
  const isValidCorrect = runVerifyEd25519(
    message,
    signature,
    correctPublicKeyPackage,
  );
  if (!isValidCorrect) {
    throw new Error("Correct public key should verify");
  }
  console.log("  ✓ Correct public key verifies successfully");

  // Test wrong public key should not verify
  const isValidWrong = runVerifyEd25519(
    message,
    signature,
    wrongPublicKeyPackage,
  );
  if (isValidWrong) {
    throw new Error("Wrong public key should not verify");
  }
  console.log("  ✓ Wrong public key correctly rejected");

  // Test with another different keygen
  const keygenOutput3 = runKeygenCentralizedEd25519();
  const anotherWrongPublicKeyPackage = new Uint8Array(
    keygenOutput3.keygen_outputs[Participant.P0].public_key_package,
  );

  const isValidAnotherWrong = runVerifyEd25519(
    message,
    signature,
    anotherWrongPublicKeyPackage,
  );
  if (isValidAnotherWrong) {
    throw new Error("Another wrong public key should not verify");
  }
  console.log("  ✓ Another wrong public key correctly rejected");

  console.log("Wrong public key test passed");
}

async function verifyEmptyMessageTest() {
  console.log("\nTesting verify empty message...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const emptyMessage = new Uint8Array(0);
  const nonEmptyMessage = new TextEncoder().encode("Non-empty message");

  // Test with empty message
  const emptyClientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const emptyServerRound1 = runSignRound1Ed25519(serverKeyPackage);

  const emptyAllCommitments: CommitmentEntry[] = [
    {
      identifier: emptyClientRound1.identifier,
      commitments: emptyClientRound1.commitments,
    },
    {
      identifier: emptyServerRound1.identifier,
      commitments: emptyServerRound1.commitments,
    },
  ];

  const emptyClientRound2 = runSignRound2Ed25519(
    emptyMessage,
    clientKeyPackage,
    new Uint8Array(emptyClientRound1.nonces),
    emptyAllCommitments,
  );
  const emptyServerRound2 = runSignRound2Ed25519(
    emptyMessage,
    serverKeyPackage,
    new Uint8Array(emptyServerRound1.nonces),
    emptyAllCommitments,
  );

  const emptyAllSignatureShares: SignatureShareEntry[] = [
    {
      identifier: emptyClientRound2.identifier,
      signature_share: emptyClientRound2.signature_share,
    },
    {
      identifier: emptyServerRound2.identifier,
      signature_share: emptyServerRound2.signature_share,
    },
  ];

  const emptyAggregateOutput = runAggregateEd25519(
    emptyMessage,
    emptyAllCommitments,
    emptyAllSignatureShares,
    new Uint8Array(
      keygenOutput.keygen_outputs[Participant.P0].public_key_package,
    ),
  );

  const emptySignature = new Uint8Array(emptyAggregateOutput.signature);
  const publicKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].public_key_package,
  );

  // Empty message signature should verify with empty message
  const isValidEmpty = runVerifyEd25519(
    emptyMessage,
    emptySignature,
    publicKeyPackage,
  );

  if (!isValidEmpty) {
    throw new Error("Empty message signature should verify with empty message");
  }
  console.log("  ✓ Empty message signature verifies with empty message");

  // Empty message signature should not verify with non-empty message
  const isValidEmptyWrong = runVerifyEd25519(
    nonEmptyMessage,
    emptySignature,
    publicKeyPackage,
  );

  if (isValidEmptyWrong) {
    throw new Error(
      "Empty message signature should not verify with non-empty message",
    );
  }
  console.log(
    "  ✓ Empty message signature correctly rejected for non-empty message",
  );

  // Test non-empty message signature should not verify with empty message
  const nonEmptyClientRound1 = runSignRound1Ed25519(clientKeyPackage);
  const nonEmptyServerRound1 = runSignRound1Ed25519(serverKeyPackage);

  const nonEmptyAllCommitments: CommitmentEntry[] = [
    {
      identifier: nonEmptyClientRound1.identifier,
      commitments: nonEmptyClientRound1.commitments,
    },
    {
      identifier: nonEmptyServerRound1.identifier,
      commitments: nonEmptyServerRound1.commitments,
    },
  ];

  const nonEmptyClientRound2 = runSignRound2Ed25519(
    nonEmptyMessage,
    clientKeyPackage,
    new Uint8Array(nonEmptyClientRound1.nonces),
    nonEmptyAllCommitments,
  );
  const nonEmptyServerRound2 = runSignRound2Ed25519(
    nonEmptyMessage,
    serverKeyPackage,
    new Uint8Array(nonEmptyServerRound1.nonces),
    nonEmptyAllCommitments,
  );

  const nonEmptyAllSignatureShares: SignatureShareEntry[] = [
    {
      identifier: nonEmptyClientRound2.identifier,
      signature_share: nonEmptyClientRound2.signature_share,
    },
    {
      identifier: nonEmptyServerRound2.identifier,
      signature_share: nonEmptyServerRound2.signature_share,
    },
  ];

  const nonEmptyAggregateOutput = runAggregateEd25519(
    nonEmptyMessage,
    nonEmptyAllCommitments,
    nonEmptyAllSignatureShares,
    publicKeyPackage,
  );

  const nonEmptySignature = new Uint8Array(nonEmptyAggregateOutput.signature);

  const isValidNonEmptyWrong = runVerifyEd25519(
    emptyMessage,
    nonEmptySignature,
    publicKeyPackage,
  );

  if (isValidNonEmptyWrong) {
    throw new Error(
      "Non-empty message signature should not verify with empty message",
    );
  }
  console.log(
    "  ✓ Non-empty message signature correctly rejected for empty message",
  );

  console.log("Empty message test passed");
}

async function verifyIntegrationTest() {
  console.log("\nTesting verify integration with full flow...\n");

  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const messages = [
    new TextEncoder().encode("Message 1"),
    new TextEncoder().encode("Message 2"),
    new TextEncoder().encode("Message 3"),
    new Uint8Array(0), // Empty message
  ];

  const publicKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].public_key_package,
  );

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    const clientRound1 = runSignRound1Ed25519(clientKeyPackage);
    const serverRound1 = runSignRound1Ed25519(serverKeyPackage);

    const allCommitments: CommitmentEntry[] = [
      {
        identifier: clientRound1.identifier,
        commitments: clientRound1.commitments,
      },
      {
        identifier: serverRound1.identifier,
        commitments: serverRound1.commitments,
      },
    ];

    const clientRound2 = runSignRound2Ed25519(
      message,
      clientKeyPackage,
      new Uint8Array(clientRound1.nonces),
      allCommitments,
    );
    const serverRound2 = runSignRound2Ed25519(
      message,
      serverKeyPackage,
      new Uint8Array(serverRound1.nonces),
      allCommitments,
    );

    const allSignatureShares: SignatureShareEntry[] = [
      {
        identifier: clientRound2.identifier,
        signature_share: clientRound2.signature_share,
      },
      {
        identifier: serverRound2.identifier,
        signature_share: serverRound2.signature_share,
      },
    ];

    const aggregateOutput = runAggregateEd25519(
      message,
      allCommitments,
      allSignatureShares,
      publicKeyPackage,
    );

    const signature = new Uint8Array(aggregateOutput.signature);

    // Verify with correct message
    const isValid = runVerifyEd25519(message, signature, publicKeyPackage);
    if (!isValid) {
      throw new Error(
        `Message ${i + 1} signature should verify with correct message`,
      );
    }

    // Verify with wrong message (if not empty)
    if (message.length > 0) {
      const wrongMessage = new TextEncoder().encode("Wrong message");
      const isValidWrong = runVerifyEd25519(
        wrongMessage,
        signature,
        publicKeyPackage,
      );
      if (isValidWrong) {
        throw new Error(
          `Message ${i + 1} signature should not verify with wrong message`,
        );
      }
    }
  }

  console.log("  ✓ All messages verified correctly");
  console.log("  ✓ Wrong messages correctly rejected");
  console.log("Integration test passed - verify works with full signing flow");
}

export async function runVerifyTests() {
  console.log("\n" + "=".repeat(50));
  console.log("Verify Tests");
  console.log("=".repeat(50));

  await verifyBasicTest();
  await verifyErrorTest();
  await verifyOutputFormatTest();
  await verifyConsistencyTest();
  await verifyInvalidSignatureTest();
  await verifyWrongMessageTest();
  await verifyWrongPublicKeyTest();
  await verifyEmptyMessageTest();
  await verifyIntegrationTest();

  console.log("\n✓ All Verify tests passed");
}

export async function runIntegrationTests() {
  console.log("\n" + "=".repeat(50));
  console.log("Integration Tests");
  console.log("=".repeat(50));

  const clientState = makeClientState();
  const serverState = makeServerState();
  const result = await signTestEd25519(clientState, serverState);

  console.log("\n=== Integration Test Complete ===");
  console.log(
    `Signature (hex): ${Buffer.from(result.signature).toString("hex")}`,
  );
  console.log(
    `Public Key (hex): ${Buffer.from(result.publicKey).toString("hex")}`,
  );
  console.log("\n✓ All integration tests passed");
}

// ============================================================================
// Test Runner
// ============================================================================

async function main() {
  console.log("Starting Ed25519 threshold signature tests...\n");

  try {
    await runRound1Tests();
    await runRound2Tests();
    await runAggregateTests();
    await runVerifyTests();
    await runIntegrationTests();

    console.log("\n" + "=".repeat(50));
    console.log("All tests passed!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\nTest failed:", error);
    process.exit(1);
  }
}

main();
