import { publicKeyToAddress, serializeSignature } from "viem/accounts";
import { encodeEthereumSignature } from "./utils";
import { recoverAddress, recoverPublicKey } from "viem";

describe("encodeEthereumSignature", () => {
  it("should encode the signature correctly", async () => {
    const compressedPublicKey =
      "0268d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4";
    const addressWithCompressedPublicKey = publicKeyToAddress(
      `0x${compressedPublicKey}`,
    );

    const uncompressedPublicKey =
      "0468d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4d4b640ac857c7a6ca794625bd0422b9d7ec90a7e2974ca949eca507ba4719f56";
    const addressWithUncompressedPublicKey = publicKeyToAddress(
      `0x${uncompressedPublicKey}`,
    );

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

    const recoveredAddress = await recoverAddress({
      hash: `0x${msgHash}`,
      signature: serializedSignature,
    });
    console.log("Recovered address:", recoveredAddress);

    const recoveredPublicKey = await recoverPublicKey({
      hash: `0x${msgHash}`,
      signature: serializedSignature,
    });
    console.log("Recovered public key:", recoveredPublicKey);

    // TODO: check why the displayed public key is compressed though the recovered public key is uncompressed
    expect(recoveredAddress).toBe(addressWithUncompressedPublicKey);
    expect(recoveredPublicKey.toLowerCase()).toBe(
      `0x${uncompressedPublicKey}`.toLowerCase(),
    );
  });
});
