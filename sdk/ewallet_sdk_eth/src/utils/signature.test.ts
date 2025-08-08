import { serializeSignature } from "viem/accounts";
import { recoverPublicKey } from "viem";

import { publicKeyToEthereumAddress } from "./utils";
import { encodeEthereumSignature } from "./signature";

describe("encodeEthereumSignature", () => {
  it("should encode the signature correctly", async () => {
    const compressedPublicKey =
      "0268d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4";
    const address = publicKeyToEthereumAddress(`0x${compressedPublicKey}`);

    const msgHash =
      "d7ed35dd0510a611f63230dabd98e34dcfca9fda4e086083a0741e50a247249d"; // hashMessage("hello world!")

    const signOutput = {
      sig: {
        big_r:
          "0220FF16EBC6DA287D0C059F809A9F4AC23BC238CF17F4D2F361FBFEFE9ECC0A46",
        s: "59AE4813A391DBA17C3509DA80AF0AA866D16406075202654DD3A17E912C19DF",
      },
      is_high: true,
    };

    const signature = encodeEthereumSignature(signOutput);

    expect(signature).toHaveProperty("r");
    expect(signature).toHaveProperty("s");
    expect(signature).toHaveProperty("v");
    expect(signature.r).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(signature.s).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(typeof signature.v).toBe("bigint");

    const serializedSignature = serializeSignature(signature);

    // recovered public key should be uncompressed
    const recoveredPublicKey = await recoverPublicKey({
      hash: `0x${msgHash}`,
      signature: serializedSignature,
    });

    // 0x04 is the prefix for uncompressed public key
    // length is 128 because it's 64 bytes (32 bytes for x and 32 bytes for y) without hex prefix 0x04
    expect(recoveredPublicKey).toMatch(/^0x04[0-9a-fA-F]{128}$/);

    const recoveredAddress = publicKeyToEthereumAddress(recoveredPublicKey);

    expect(recoveredAddress).toBe(address);
  });
});
