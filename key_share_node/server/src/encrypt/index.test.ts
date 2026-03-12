import { decryptDataAsync, encryptDataAsync } from "./index";

describe("Encryption/Decryption Tests", () => {
  const testPassword = "test_password_123";
  const testData = "This is sensitive data that needs to be encrypted";

  describe("Basic encryption/decryption functionality", () => {
    it("should encrypt and decrypt data", async () => {
      const encrypted = await encryptDataAsync(testData, testPassword);
      const decrypted = await decryptDataAsync(encrypted, testPassword);

      expect(decrypted).toBe(testData);
    });
  });

  describe("Different data types", () => {
    const testCases = [
      { name: "empty string", data: "" },
      {
        name: "JSON object",
        data: JSON.stringify({ key: "value", nested: { array: [1, 2, 3] } }),
      },
      { name: "special characters", data: "!@#$%^&*()_+-=[]{}|;:',.<>?/`~" },
      { name: "unicode characters", data: "안녕하세요 こんにちは 你好 🚀" },
      { name: "long text", data: "a".repeat(10000) },
    ];

    testCases.forEach(({ name, data }) => {
      it(`should handle ${name}`, async () => {
        const encrypted = await encryptDataAsync(data, testPassword);
        const decrypted = await decryptDataAsync(encrypted, testPassword);

        expect(decrypted).toBe(data);
      });
    });
  });

  describe("Error handling", () => {
    it("should throw error with wrong password", async () => {
      const encrypted = await encryptDataAsync(testData, testPassword);

      await expect(
        decryptDataAsync(encrypted, "wrong_password"),
      ).rejects.toThrow();
    });

    it("should throw error with invalid encrypted data", async () => {
      await expect(
        decryptDataAsync("invalid_base64_data", testPassword),
      ).rejects.toThrow();
    });

    it("should throw error with corrupted encrypted data", async () => {
      const encrypted = await encryptDataAsync(testData, testPassword);
      const corrupted = encrypted.slice(0, -5) + "xxxxx";

      await expect(decryptDataAsync(corrupted, testPassword)).rejects.toThrow();
    });
  });

  describe("Different passwords", () => {
    const passwords = [
      "short",
      "a".repeat(100),
      "パスワード123!@#",
      "pass with spaces",
    ];

    passwords.forEach((password) => {
      it(`should work with password: "${password.substring(0, 20)}..."`, async () => {
        const encrypted = await encryptDataAsync(testData, password);
        const decrypted = await decryptDataAsync(encrypted, password);
        expect(decrypted).toBe(testData);
      });
    });
  });

  describe("Encryption uniqueness", () => {
    it("should generate different ciphertext for same data", async () => {
      const encrypted1 = await encryptDataAsync(testData, testPassword);
      const encrypted2 = await encryptDataAsync(testData, testPassword);

      expect(encrypted1).not.toBe(encrypted2);

      expect(await decryptDataAsync(encrypted1, testPassword)).toBe(testData);
      expect(await decryptDataAsync(encrypted2, testPassword)).toBe(testData);
    });
  });
});
