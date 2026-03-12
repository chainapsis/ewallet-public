import type {
  TECDSAClientState,
  TECDSAServerState,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";
import { ethers } from "ethers";
import { computePublicKey } from "ethers/lib/utils";

import { runKeygenClientCentralized, runKeygenCombineShares } from "../client";
import { makeClientState, makeServerState } from "../state";

async function keygen2Test(
  clientState: TECDSAClientState,
  serverState: TECDSAServerState,
) {
  const keygenOutputs = runKeygenClientCentralized();
  clientState.keygenOutput = keygenOutputs.keygen_outputs[Participant.P0];
  serverState.keygenOutput = keygenOutputs.keygen_outputs[Participant.P1];

  const wallet = new ethers.Wallet(
    Buffer.from(keygenOutputs.private_key, "hex"),
  );
  const pubkeyFromPrivateKey = computePublicKey(
    wallet._signingKey().publicKey,
    true,
  ).slice(2);

  if (
    clientState.keygenOutput.public_key ===
      serverState.keygenOutput.public_key &&
    clientState.keygenOutput.public_key.toLowerCase() ===
      pubkeyFromPrivateKey.toLowerCase()
  ) {
    console.log(
      `keygen success. public key: ${clientState.keygenOutput.public_key}`,
    );
  } else {
    throw new Error("keygen failed. public keys do not match");
  }

  const combined = runKeygenCombineShares({
    shares: {
      [Participant.P0]: clientState.keygenOutput.private_share,
      [Participant.P1]: serverState.keygenOutput.private_share,
    },
  });

  const combinedWallet = new ethers.Wallet(Buffer.from(combined, "hex"));
  const pubkeyFromCombined = computePublicKey(
    combinedWallet._signingKey().publicKey,
    true,
  ).slice(2);

  if (
    combined === keygenOutputs.private_key &&
    clientState.keygenOutput.public_key.toLowerCase() ===
      pubkeyFromCombined.toLowerCase()
  ) {
    console.log(`combined: ${combined}, public key: ${pubkeyFromCombined}`);
  } else {
    throw new Error("combine failed. combined do not match");
  }
}

describe("keygen_centralized_1", () => {
  it("test1", async () => {
    const clientState = makeClientState();
    const serverState = makeServerState();

    await keygen2Test(clientState, serverState);
  });
});
