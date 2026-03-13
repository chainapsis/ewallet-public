import {
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
} from "@oko-wallet-api/middleware/auth/auth0_auth/client_id";
import { validateAuth0IdToken } from "@oko-wallet-api/middleware/auth/auth0_auth/validate";

describe("validateAuth0IdToken", () => {
  it("should validate a valid Auth0 ID token", async () => {
    const idToken = "YOUR_AUTH0_ID_TOKEN_HERE";

    const result = await validateAuth0IdToken({
      idToken,
      clientId: AUTH0_CLIENT_ID,
      domain: AUTH0_DOMAIN,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeTruthy();
      expect(result.data.sub).toBeTruthy();
    }
  });
});
