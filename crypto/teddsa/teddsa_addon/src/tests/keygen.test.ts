import { Participant } from "@oko-wallet/teddsa-interface";

import {
  extractKeyPackageSharesEd25519,
  reconstructKeyPackageEd25519,
  reconstructPublicKeyPackageEd25519,
  runKeygenCentralizedEd25519,
  runKeygenImportEd25519,
} from "../server";

export async function keygenCentralizedTest() {
  console.log("Testing centralized keygen...\n");

  // Generate new key
  const keygenOutput = runKeygenCentralizedEd25519();

  // Validate output structure
  if (
    !keygenOutput.keygen_outputs ||
    keygenOutput.keygen_outputs.length !== 2
  ) {
    throw new Error("Expected 2 keygen outputs for 2-of-2 threshold");
  }

  if (!keygenOutput.public_key || keygenOutput.public_key.length !== 32) {
    throw new Error("Expected 32-byte Ed25519 public key");
  }

  if (!keygenOutput.private_key || keygenOutput.private_key.length !== 32) {
    throw new Error("Expected 32-byte Ed25519 private key");
  }

  const clientOutput = keygenOutput.keygen_outputs[Participant.P0];
  const serverOutput = keygenOutput.keygen_outputs[Participant.P1];

  // Validate client output
  if (!clientOutput.key_package || clientOutput.key_package.length === 0) {
    throw new Error("Client key_package is empty");
  }
  if (
    !clientOutput.public_key_package ||
    clientOutput.public_key_package.length === 0
  ) {
    throw new Error("Client public_key_package is empty");
  }
  if (!clientOutput.identifier || clientOutput.identifier.length === 0) {
    throw new Error("Client identifier is empty");
  }

  // Validate server output
  if (!serverOutput.key_package || serverOutput.key_package.length === 0) {
    throw new Error("Server key_package is empty");
  }
  if (
    !serverOutput.public_key_package ||
    serverOutput.public_key_package.length === 0
  ) {
    throw new Error("Server public_key_package is empty");
  }
  if (!serverOutput.identifier || serverOutput.identifier.length === 0) {
    throw new Error("Server identifier is empty");
  }

  // Public key packages should be the same for both parties
  const clientPkgHex = Buffer.from(clientOutput.public_key_package).toString(
    "hex",
  );
  const serverPkgHex = Buffer.from(serverOutput.public_key_package).toString(
    "hex",
  );
  if (clientPkgHex !== serverPkgHex) {
    throw new Error("Public key packages should match between parties");
  }

  // Identifiers should be different
  const clientIdHex = Buffer.from(clientOutput.identifier).toString("hex");
  const serverIdHex = Buffer.from(serverOutput.identifier).toString("hex");
  if (clientIdHex === serverIdHex) {
    throw new Error("Participant identifiers should be different");
  }

  console.log("Centralized keygen validation passed!");
  console.log(
    `  Public key: ${Buffer.from(keygenOutput.public_key).toString("hex")}`,
  );
  console.log(`  Client identifier: ${clientIdHex}`);
  console.log(`  Server identifier: ${serverIdHex}`);
  console.log(`  Key package size: ${clientOutput.key_package.length} bytes`);
  console.log(
    `  Public key package size: ${clientOutput.public_key_package.length} bytes`,
  );

  return keygenOutput;
}

export async function keygenImportTest() {
  console.log("\nTesting import keygen...\n");

  // Generate a test secret key (32 bytes)
  const secretKey = new Uint8Array(32);
  for (let i = 0; i < 16; i++) {
    secretKey[i] = i + 1;
  }

  // Import the key
  const keygenOutput = runKeygenImportEd25519(secretKey);

  // Validate output structure
  if (
    !keygenOutput.keygen_outputs ||
    keygenOutput.keygen_outputs.length !== 2
  ) {
    throw new Error("Expected 2 keygen outputs for 2-of-2 threshold");
  }

  if (!keygenOutput.public_key || keygenOutput.public_key.length !== 32) {
    throw new Error("Expected 32-byte Ed25519 public key");
  }

  // The returned private key should match the input
  const returnedPrivateKey = Buffer.from(keygenOutput.private_key).toString(
    "hex",
  );
  const inputPrivateKey = Buffer.from(secretKey).toString("hex");
  if (returnedPrivateKey !== inputPrivateKey) {
    throw new Error("Returned private key should match input");
  }

  // Import same key again - should get same public key
  const keygenOutput2 = runKeygenImportEd25519(secretKey);
  const pubKey1 = Buffer.from(keygenOutput.public_key).toString("hex");
  const pubKey2 = Buffer.from(keygenOutput2.public_key).toString("hex");
  if (pubKey1 !== pubKey2) {
    throw new Error("Same secret key should produce same public key");
  }

  console.log("Import keygen validation passed!");
  console.log(`  Public key: ${pubKey1}`);
  console.log(`  Private key matches input: yes`);
  console.log(`  Deterministic: yes`);

  return keygenOutput;
}

export async function keygenCentralizedRandomnessTest() {
  console.log("\nTesting centralized keygen randomness...\n");

  // Generate multiple keys and verify they are different
  const keygen1 = runKeygenCentralizedEd25519();
  const keygen2 = runKeygenCentralizedEd25519();
  const keygen3 = runKeygenCentralizedEd25519();

  const pubKey1 = Buffer.from(keygen1.public_key).toString("hex");
  const pubKey2 = Buffer.from(keygen2.public_key).toString("hex");
  const pubKey3 = Buffer.from(keygen3.public_key).toString("hex");

  // All public keys should be different (very high probability)
  if (pubKey1 === pubKey2 || pubKey1 === pubKey3 || pubKey2 === pubKey3) {
    throw new Error(
      "Centralized keygen should produce different keys each time",
    );
  }

  console.log("Randomness test passed - all keys are different");
  return { keygen1, keygen2, keygen3 };
}

export async function keygenImportDeterministicTest() {
  console.log("\nTesting import keygen determinism...\n");

  const secretKey = new Uint8Array(32);
  for (let i = 0; i < 16; i++) {
    secretKey[i] = i + 1;
  }

  const keygen1 = runKeygenImportEd25519(secretKey);
  const keygen2 = runKeygenImportEd25519(secretKey);
  const keygen3 = runKeygenImportEd25519(secretKey);

  const pubKey1 = Buffer.from(keygen1.public_key).toString("hex");
  const pubKey2 = Buffer.from(keygen2.public_key).toString("hex");
  const pubKey3 = Buffer.from(keygen3.public_key).toString("hex");

  if (pubKey1 !== pubKey2 || pubKey2 !== pubKey3) {
    throw new Error("Import keygen public key should be deterministic");
  }

  const id1P0 = Buffer.from(
    keygen1.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const id2P0 = Buffer.from(
    keygen2.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const id1P1 = Buffer.from(
    keygen1.keygen_outputs[Participant.P1].identifier,
  ).toString("hex");
  const id2P1 = Buffer.from(
    keygen2.keygen_outputs[Participant.P1].identifier,
  ).toString("hex");

  if (id1P0.length !== id2P0.length || id1P1.length !== id2P1.length) {
    throw new Error("Identifier lengths should be consistent");
  }

  console.log("Determinism test passed - public keys are identical");
  return { keygen1, keygen2, keygen3 };
}

export async function keygenImportErrorTest() {
  console.log("\nTesting import keygen error cases...\n");

  const invalidLengths = [0, 1, 31, 33, 64];
  for (const length of invalidLengths) {
    const invalidKey = new Uint8Array(length);
    try {
      runKeygenImportEd25519(invalidKey);
      throw new Error(
        `Expected error for ${length}-byte key, but operation succeeded`,
      );
    } catch (error: any) {
      if (
        !error.message?.includes("32 bytes") &&
        !error.message?.includes("InvalidArg")
      ) {
        throw new Error(
          `Unexpected error for ${length}-byte key: ${error.message}`,
        );
      }
      console.log(`  ✓ Correctly rejected ${length}-byte key`);
    }
  }

  console.log("Error handling test passed");
}

export async function keygenImportEdgeCasesTest() {
  console.log("\nTesting import keygen edge cases...\n");

  const allZeros = new Uint8Array(32);
  try {
    const keygenZeros = runKeygenImportEd25519(allZeros);
    if (keygenZeros.public_key.length !== 32) {
      throw new Error("All-zeros key should produce valid output");
    }
    console.log("  ✓ All-zeros key handled");
  } catch (error: any) {
    if (
      error.message?.includes("Invalid secret key") ||
      error.message?.includes("scalar")
    ) {
      console.log("  ✓ All-zeros key correctly rejected (invalid scalar)");
    } else {
      throw error;
    }
  }

  const allOnes = new Uint8Array(32);
  allOnes.fill(0xff);
  try {
    const keygenOnes = runKeygenImportEd25519(allOnes);
    if (keygenOnes.public_key.length !== 32) {
      throw new Error("All-ones key should produce valid output");
    }
    console.log("  ✓ All-ones key handled");
  } catch (error: any) {
    if (
      error.message?.includes("Invalid secret key") ||
      error.message?.includes("scalar")
    ) {
      console.log("  ✓ All-ones key correctly rejected (invalid scalar)");
    } else {
      throw error;
    }
  }

  const alternating = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    alternating[i] = i % 2 === 0 ? 0xaa : 0x55;
  }
  try {
    const keygenAlt = runKeygenImportEd25519(alternating);
    if (keygenAlt.public_key.length !== 32) {
      throw new Error("Alternating pattern key should produce valid output");
    }
    console.log("  ✓ Alternating pattern key handled");
  } catch (error: any) {
    if (
      error.message?.includes("Invalid secret key") ||
      error.message?.includes("scalar")
    ) {
      console.log(
        "  ✓ Alternating pattern key correctly rejected (invalid scalar)",
      );
    } else {
      throw error;
    }
  }

  const validKey = new Uint8Array(32);
  for (let i = 0; i < 16; i++) {
    validKey[i] = i + 1;
  }
  const keygenValid = runKeygenImportEd25519(validKey);
  if (keygenValid.public_key.length !== 32) {
    throw new Error("Valid key pattern should produce valid output");
  }
  console.log("  ✓ Valid key pattern handled");

  console.log("Edge cases test passed");
}

export async function keygenCentralizedConsistencyTest() {
  console.log("\nTesting centralized keygen consistency...\n");

  const keygen = runKeygenCentralizedEd25519();

  const privateKeyHex = Buffer.from(keygen.private_key).toString("hex");
  const expectedZeros = "0".repeat(64);
  if (privateKeyHex !== expectedZeros) {
    throw new Error(
      `Centralized keygen private_key should be all zeros, got: ${privateKeyHex}`,
    );
  }
  console.log("  ✓ Private key is correctly set to zeros");

  const clientKeyPackage = Buffer.from(
    keygen.keygen_outputs[Participant.P0].key_package,
  ).toString("hex");
  const serverKeyPackage = Buffer.from(
    keygen.keygen_outputs[Participant.P1].key_package,
  ).toString("hex");
  if (clientKeyPackage === serverKeyPackage) {
    throw new Error("Key packages should be different between participants");
  }
  console.log("  ✓ Key packages are different between participants");

  const keygen2 = runKeygenCentralizedEd25519();
  const id1P0 = Buffer.from(
    keygen.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const id2P0 = Buffer.from(
    keygen2.keygen_outputs[Participant.P0].identifier,
  ).toString("hex");
  const id1P1 = Buffer.from(
    keygen.keygen_outputs[Participant.P1].identifier,
  ).toString("hex");
  const id2P1 = Buffer.from(
    keygen2.keygen_outputs[Participant.P1].identifier,
  ).toString("hex");

  if (id1P0 === id1P1) {
    throw new Error("P0 and P1 identifiers should be different");
  }
  if (id1P0.length !== id2P0.length || id1P1.length !== id2P1.length) {
    throw new Error("Identifier lengths should be consistent");
  }
  console.log("  ✓ Identifiers are consistent");

  console.log("Consistency test passed");
}

export async function extractKeyPackageSharesTest() {
  console.log("\nTesting extractKeyPackageSharesEd25519...\n");

  // Generate a key_package first
  const keygenOutput = runKeygenCentralizedEd25519();
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  // Extract shares from client key_package
  const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);

  // Validate output structure
  if (!clientShares.signing_share || clientShares.signing_share.length !== 32) {
    throw new Error(
      `Expected 32-byte signing_share, got ${clientShares.signing_share?.length ?? 0} bytes`,
    );
  }

  if (
    !clientShares.verifying_share ||
    clientShares.verifying_share.length !== 32
  ) {
    throw new Error(
      `Expected 32-byte verifying_share, got ${clientShares.verifying_share?.length ?? 0} bytes`,
    );
  }

  console.log("  ✓ Client shares extracted successfully");
  console.log(`  ✓ Signing share: ${clientShares.signing_share.length} bytes`);
  console.log(
    `  ✓ Verifying share: ${clientShares.verifying_share.length} bytes`,
  );

  // Extract shares from server key_package
  const serverShares = extractKeyPackageSharesEd25519(serverKeyPackage);

  // Validate server shares
  if (!serverShares.signing_share || serverShares.signing_share.length !== 32) {
    throw new Error(
      `Expected 32-byte signing_share, got ${serverShares.signing_share?.length ?? 0} bytes`,
    );
  }

  if (
    !serverShares.verifying_share ||
    serverShares.verifying_share.length !== 32
  ) {
    throw new Error(
      `Expected 32-byte verifying_share, got ${serverShares.verifying_share?.length ?? 0} bytes`,
    );
  }

  console.log("  ✓ Server shares extracted successfully");

  // Verify that client and server shares are different
  const clientSigningShareHex = Buffer.from(
    clientShares.signing_share,
  ).toString("hex");
  const serverSigningShareHex = Buffer.from(
    serverShares.signing_share,
  ).toString("hex");
  if (clientSigningShareHex === serverSigningShareHex) {
    throw new Error("Client and server signing shares should be different");
  }

  const clientVerifyingShareHex = Buffer.from(
    clientShares.verifying_share,
  ).toString("hex");
  const serverVerifyingShareHex = Buffer.from(
    serverShares.verifying_share,
  ).toString("hex");
  if (clientVerifyingShareHex === serverVerifyingShareHex) {
    throw new Error("Client and server verifying shares should be different");
  }

  console.log("  ✓ Client and server shares are different");

  // Test with invalid key_package
  try {
    const invalidKeyPackage = new Uint8Array(32).fill(0xff);
    extractKeyPackageSharesEd25519(invalidKeyPackage);
    throw new Error("Should have thrown an error for invalid key_package");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize")
    ) {
      throw new Error(
        `Unexpected error for invalid key_package: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid key_package correctly rejected");
  }

  // Test consistency: extract from same key_package multiple times
  const shares1 = extractKeyPackageSharesEd25519(clientKeyPackage);
  const shares2 = extractKeyPackageSharesEd25519(clientKeyPackage);

  const signingShare1Hex = Buffer.from(shares1.signing_share).toString("hex");
  const signingShare2Hex = Buffer.from(shares2.signing_share).toString("hex");
  if (signingShare1Hex !== signingShare2Hex) {
    throw new Error("Extraction should be deterministic");
  }

  const verifyingShare1Hex = Buffer.from(shares1.verifying_share).toString(
    "hex",
  );
  const verifyingShare2Hex = Buffer.from(shares2.verifying_share).toString(
    "hex",
  );
  if (verifyingShare1Hex !== verifyingShare2Hex) {
    throw new Error("Extraction should be deterministic");
  }

  console.log("  ✓ Extraction is deterministic");

  console.log("\nExtract key package shares test passed");
}

export async function reconstructPublicKeyPackageTest() {
  console.log("\nTesting reconstructPublicKeyPackageEd25519...\n");

  // Generate a keygen output to get the original public_key_package
  const keygenOutput = runKeygenCentralizedEd25519();
  const originalPublicKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].public_key_package,
  );

  // Extract verifying_shares and identifiers from key_packages
  const clientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const serverKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
  const serverShares = extractKeyPackageSharesEd25519(serverKeyPackage);

  const clientIdentifier = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].identifier,
  );
  const serverIdentifier = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].identifier,
  );
  const verifyingKey = new Uint8Array(keygenOutput.public_key);

  // Reconstruct public_key_package
  const reconstructedPublicKeyPackage = reconstructPublicKeyPackageEd25519(
    new Uint8Array(clientShares.verifying_share),
    clientIdentifier,
    new Uint8Array(serverShares.verifying_share),
    serverIdentifier,
    verifyingKey,
  );

  // Validate output structure
  if (
    !reconstructedPublicKeyPackage ||
    reconstructedPublicKeyPackage.length === 0
  ) {
    throw new Error("Reconstructed public_key_package is empty");
  }

  console.log(
    `  ✓ Public key package reconstructed: ${reconstructedPublicKeyPackage.length} bytes`,
  );

  // Compare with original public_key_package
  const originalHex = Buffer.from(originalPublicKeyPackage).toString("hex");
  const reconstructedHex = Buffer.from(reconstructedPublicKeyPackage).toString(
    "hex",
  );

  if (originalHex !== reconstructedHex) {
    throw new Error(
      "Reconstructed public_key_package should match original public_key_package",
    );
  }

  console.log("  ✓ Reconstructed public_key_package matches original");

  // Test consistency: reconstruct multiple times should produce same result
  const reconstructed1 = reconstructPublicKeyPackageEd25519(
    new Uint8Array(clientShares.verifying_share),
    clientIdentifier,
    new Uint8Array(serverShares.verifying_share),
    serverIdentifier,
    verifyingKey,
  );
  const reconstructed2 = reconstructPublicKeyPackageEd25519(
    new Uint8Array(clientShares.verifying_share),
    clientIdentifier,
    new Uint8Array(serverShares.verifying_share),
    serverIdentifier,
    verifyingKey,
  );

  const reconstructed1Hex = Buffer.from(reconstructed1).toString("hex");
  const reconstructed2Hex = Buffer.from(reconstructed2).toString("hex");

  if (reconstructed1Hex !== reconstructed2Hex) {
    throw new Error("Reconstruction should be deterministic");
  }

  console.log("  ✓ Reconstruction is deterministic");

  // Test with invalid verifying_share (wrong length)
  try {
    const invalidVerifyingShare = new Uint8Array(31).fill(0xff);
    reconstructPublicKeyPackageEd25519(
      invalidVerifyingShare,
      clientIdentifier,
      new Uint8Array(serverShares.verifying_share),
      serverIdentifier,
      verifyingKey,
    );
    throw new Error("Should have thrown an error for invalid verifying_share");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize") &&
      !error.message?.includes("Invalid")
    ) {
      throw new Error(
        `Unexpected error for invalid verifying_share: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid verifying_share correctly rejected");
  }

  // Test with invalid identifier (wrong length)
  try {
    const invalidIdentifier = new Uint8Array(31).fill(0xff);
    reconstructPublicKeyPackageEd25519(
      new Uint8Array(clientShares.verifying_share),
      invalidIdentifier,
      new Uint8Array(serverShares.verifying_share),
      serverIdentifier,
      verifyingKey,
    );
    throw new Error("Should have thrown an error for invalid identifier");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize") &&
      !error.message?.includes("Invalid")
    ) {
      throw new Error(
        `Unexpected error for invalid identifier: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid identifier correctly rejected");
  }

  // Test with invalid verifying_key (wrong length)
  try {
    const invalidVerifyingKey = new Uint8Array(31).fill(0xff);
    reconstructPublicKeyPackageEd25519(
      new Uint8Array(clientShares.verifying_share),
      clientIdentifier,
      new Uint8Array(serverShares.verifying_share),
      serverIdentifier,
      invalidVerifyingKey,
    );
    throw new Error("Should have thrown an error for invalid verifying_key");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize") &&
      !error.message?.includes("Invalid")
    ) {
      throw new Error(
        `Unexpected error for invalid verifying_key: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid verifying_key correctly rejected");
  }

  // Test with swapped identifiers (should produce same result since BTreeMap orders by identifier)
  const swappedPublicKeyPackage = reconstructPublicKeyPackageEd25519(
    new Uint8Array(serverShares.verifying_share),
    serverIdentifier,
    new Uint8Array(clientShares.verifying_share),
    clientIdentifier,
    verifyingKey,
  );

  const swappedHex = Buffer.from(swappedPublicKeyPackage).toString("hex");
  if (swappedHex !== originalHex) {
    throw new Error(
      "Swapped identifiers should produce same public_key_package (BTreeMap orders by identifier)",
    );
  }

  console.log(
    "  ✓ Swapped identifiers produce same package (BTreeMap ordering)",
  );

  console.log("\nReconstruct public key package test passed");
}

export async function reconstructKeyPackageTest() {
  console.log("\nTesting reconstructKeyPackageEd25519...\n");

  // Generate a keygen output to get the original key_package
  const keygenOutput = runKeygenCentralizedEd25519();
  const originalClientKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].key_package,
  );
  const originalServerKeyPackage = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].key_package,
  );

  // Extract shares from key_packages
  const clientShares = extractKeyPackageSharesEd25519(originalClientKeyPackage);
  const serverShares = extractKeyPackageSharesEd25519(originalServerKeyPackage);

  const clientIdentifier = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P0].identifier,
  );
  const serverIdentifier = new Uint8Array(
    keygenOutput.keygen_outputs[Participant.P1].identifier,
  );
  const verifyingKey = new Uint8Array(keygenOutput.public_key);
  const minSigners = 2;

  // Reconstruct client key_package
  const reconstructedClientKeyPackage = reconstructKeyPackageEd25519(
    new Uint8Array(clientShares.signing_share),
    new Uint8Array(clientShares.verifying_share),
    clientIdentifier,
    verifyingKey,
    minSigners,
  );

  // Validate output structure
  if (
    !reconstructedClientKeyPackage ||
    reconstructedClientKeyPackage.length === 0
  ) {
    throw new Error("Reconstructed client key_package is empty");
  }

  console.log(
    `  ✓ Client key package reconstructed: ${reconstructedClientKeyPackage.length} bytes`,
  );

  // Compare with original client key_package
  const originalClientHex = Buffer.from(originalClientKeyPackage).toString(
    "hex",
  );
  const reconstructedClientHex = Buffer.from(
    reconstructedClientKeyPackage,
  ).toString("hex");

  if (originalClientHex !== reconstructedClientHex) {
    throw new Error(
      "Reconstructed client key_package should match original client key_package",
    );
  }

  console.log("  ✓ Reconstructed client key_package matches original");

  // Reconstruct server key_package
  const reconstructedServerKeyPackage = reconstructKeyPackageEd25519(
    new Uint8Array(serverShares.signing_share),
    new Uint8Array(serverShares.verifying_share),
    serverIdentifier,
    verifyingKey,
    minSigners,
  );

  // Validate server key_package
  if (
    !reconstructedServerKeyPackage ||
    reconstructedServerKeyPackage.length === 0
  ) {
    throw new Error("Reconstructed server key_package is empty");
  }

  const originalServerHex = Buffer.from(originalServerKeyPackage).toString(
    "hex",
  );
  const reconstructedServerHex = Buffer.from(
    reconstructedServerKeyPackage,
  ).toString("hex");

  if (originalServerHex !== reconstructedServerHex) {
    throw new Error(
      "Reconstructed server key_package should match original server key_package",
    );
  }

  console.log("  ✓ Reconstructed server key_package matches original");

  // Verify client and server key_packages are different
  if (reconstructedClientHex === reconstructedServerHex) {
    throw new Error(
      "Client and server key_packages should be different (different identifiers and shares)",
    );
  }

  console.log("  ✓ Client and server key_packages are different");

  // Test consistency: reconstruct multiple times should produce same result
  const reconstructed1 = reconstructKeyPackageEd25519(
    new Uint8Array(clientShares.signing_share),
    new Uint8Array(clientShares.verifying_share),
    clientIdentifier,
    verifyingKey,
    minSigners,
  );
  const reconstructed2 = reconstructKeyPackageEd25519(
    new Uint8Array(clientShares.signing_share),
    new Uint8Array(clientShares.verifying_share),
    clientIdentifier,
    verifyingKey,
    minSigners,
  );

  const reconstructed1Hex = Buffer.from(reconstructed1).toString("hex");
  const reconstructed2Hex = Buffer.from(reconstructed2).toString("hex");

  if (reconstructed1Hex !== reconstructed2Hex) {
    throw new Error("Reconstruction should be deterministic");
  }

  console.log("  ✓ Reconstruction is deterministic");

  // Test with invalid signing_share (wrong length)
  try {
    const invalidSigningShare = new Uint8Array(31).fill(0xff);
    reconstructKeyPackageEd25519(
      invalidSigningShare,
      new Uint8Array(clientShares.verifying_share),
      clientIdentifier,
      verifyingKey,
      minSigners,
    );
    throw new Error("Should have thrown an error for invalid signing_share");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize") &&
      !error.message?.includes("Invalid")
    ) {
      throw new Error(
        `Unexpected error for invalid signing_share: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid signing_share correctly rejected");
  }

  // Test with invalid verifying_share (wrong length)
  try {
    const invalidVerifyingShare = new Uint8Array(31).fill(0xff);
    reconstructKeyPackageEd25519(
      new Uint8Array(clientShares.signing_share),
      invalidVerifyingShare,
      clientIdentifier,
      verifyingKey,
      minSigners,
    );
    throw new Error("Should have thrown an error for invalid verifying_share");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize") &&
      !error.message?.includes("Invalid")
    ) {
      throw new Error(
        `Unexpected error for invalid verifying_share: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid verifying_share correctly rejected");
  }

  // Test with invalid identifier (wrong length)
  try {
    const invalidIdentifier = new Uint8Array(31).fill(0xff);
    reconstructKeyPackageEd25519(
      new Uint8Array(clientShares.signing_share),
      new Uint8Array(clientShares.verifying_share),
      invalidIdentifier,
      verifyingKey,
      minSigners,
    );
    throw new Error("Should have thrown an error for invalid identifier");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize") &&
      !error.message?.includes("Invalid")
    ) {
      throw new Error(
        `Unexpected error for invalid identifier: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid identifier correctly rejected");
  }

  // Test with invalid verifying_key (wrong length)
  try {
    const invalidVerifyingKey = new Uint8Array(31).fill(0xff);
    reconstructKeyPackageEd25519(
      new Uint8Array(clientShares.signing_share),
      new Uint8Array(clientShares.verifying_share),
      clientIdentifier,
      invalidVerifyingKey,
      minSigners,
    );
    throw new Error("Should have thrown an error for invalid verifying_key");
  } catch (error: any) {
    if (
      !error.message?.includes("deserialize") &&
      !error.message?.includes("Failed to deserialize") &&
      !error.message?.includes("Invalid")
    ) {
      throw new Error(
        `Unexpected error for invalid verifying_key: ${error.message}`,
      );
    }
    console.log("  ✓ Invalid verifying_key correctly rejected");
  }

  const mismatchedKeyPackage = reconstructKeyPackageEd25519(
    new Uint8Array(clientShares.signing_share),
    new Uint8Array(clientShares.verifying_share),
    serverIdentifier, // Using server identifier with client shares
    verifyingKey,
    minSigners,
  );

  if (mismatchedKeyPackage.length === 0) {
    throw new Error(
      "Mismatched components should still produce valid key_package",
    );
  }

  const mismatchedHex = Buffer.from(mismatchedKeyPackage).toString("hex");
  if (mismatchedHex === originalClientHex) {
    throw new Error(
      "Mismatched identifier should produce different key_package",
    );
  }

  console.log("  ✓ Mismatched components produce different key_package");

  console.log("\nReconstruct key package test passed");
}

// Run the tests
async function main() {
  console.log("Starting Ed25519 keygen tests...\n");
  console.log("=".repeat(50));

  try {
    await keygenCentralizedTest();
    await keygenImportTest();
    await keygenCentralizedRandomnessTest();
    await keygenImportDeterministicTest();
    await keygenImportErrorTest();
    await keygenImportEdgeCasesTest();
    await keygenCentralizedConsistencyTest();
    await extractKeyPackageSharesTest();
    await reconstructKeyPackageTest();
    await reconstructPublicKeyPackageTest();

    console.log("\n" + "=".repeat(50));
    console.log("All keygen tests passed!");
  } catch (error) {
    console.error("\nTest failed:", error);
    process.exit(1);
  }
}

main();
