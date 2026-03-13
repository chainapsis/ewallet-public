import {
  decryptWithEcdheKey,
  deriveSessionKey,
  encryptWithEcdheKey,
  generateEddsaKeypair,
} from "@oko-wallet/crypto-js/browser";

async function test1() {
  const aliceKeypairResult = generateEddsaKeypair();
  if (!aliceKeypairResult.success) {
    console.error("Failed to generate keypair", aliceKeypairResult.err);
    return;
  }
  const aliceKeypair = aliceKeypairResult.data;

  const bobKeypairResult = generateEddsaKeypair();
  if (!bobKeypairResult.success) {
    console.error("Failed to generate keypair", bobKeypairResult.err);
    return;
  }
  const bobKeypair = bobKeypairResult.data;

  const sessionKeyResult1 = deriveSessionKey(
    aliceKeypair.privateKey,
    bobKeypair.publicKey,
    "oko-v1",
  );
  if (!sessionKeyResult1.success) {
    console.error("Failed to derive session key", sessionKeyResult1.err);
    return;
  }
  const sessionKey1 = sessionKeyResult1.data;
  console.log("sessionKey1", sessionKey1.key.toHex());

  const sessionKeyResult2 = deriveSessionKey(
    bobKeypair.privateKey,
    aliceKeypair.publicKey,
    "oko-v1",
  );
  if (!sessionKeyResult2.success) {
    console.error("Failed to derive session key", sessionKeyResult2.err);
    return;
  }
  const sessionKey2 = sessionKeyResult2.data;
  console.log("sessionKey2", sessionKey2.key.toHex());

  if (!sessionKey1.key.equals(sessionKey2.key)) {
    console.error("Session keys are not equal");
    return;
  }

  const plaintext = new TextEncoder().encode("Hello, world!");

  const encrypted = await encryptWithEcdheKey(plaintext, sessionKey1);
  console.log("encrypted", encrypted);
  if (!encrypted.success) {
    console.error("Encryption failed", encrypted.err);
    return;
  }

  const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey1);
  console.log("decrypted", decrypted);
  if (!decrypted.success) {
    console.error("Decryption failed", decrypted.err);
    return;
  }

  if (decrypted.data.toHex() !== Buffer.from(plaintext).toString("hex")) {
    console.error("Decrypted data is not equal to plaintext");
    return;
  }
  console.log("Decrypted data is equal to plaintext");
}

test1().then();
