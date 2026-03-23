import { generatePassword } from "./password";

describe("generatePassword", () => {
  it("returns a 20-character password by default", () => {
    const password = generatePassword();

    expect(password).toHaveLength(20);
  });

  it("always includes lowercase, uppercase, and numeric characters", () => {
    const password = generatePassword();

    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/\d/);
  });
});
