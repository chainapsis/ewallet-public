import {
  computeAddress,
  recoverAddress,
  serialize,
  type UnsignedTransaction,
} from "@ethersproject/transactions";
import type {
  TECDSAClientState,
  TECDSAServerState,
} from "@oko-wallet/tecdsa-interface";
import { arrayify, computePublicKey, keccak256 } from "ethers/lib/utils";

import { runSignClientStep1V2, runSignClientStep2 } from "../client";
import { runSignServerStep1V2, runSignServerStep2 } from "../server";
import { fullSignatureToEvmSig } from "./eth_tx_sign.test";

const tx: UnsignedTransaction = {
  chainId: 11155111, //  ChainID.SEPOLIA,
  nonce: 0,
  gasPrice: 1000000000,
  gasLimit: 1000000,
  to: "0x7a30Ca3D9F407fe9503655450cd008958f80e053",
  value: 0,
  data: "0x",
};

export function signTest2(
  clientState: TECDSAClientState,
  serverState: TECDSAServerState,
) {
  const msgHash = keccak256(serialize(tx));
  const msgHashBytes = arrayify(msgHash);

  // client execute step1
  const signClientStep1Result = runSignClientStep1V2(
    msgHashBytes,
    clientState.presignOutput!,
  );
  clientState.signState = signClientStep1Result.st_0;

  // client -> server call step1
  // server msg receive
  serverState.signMessages = signClientStep1Result.msgs_1;
  const signServerStep1Result = runSignServerStep1V2(
    msgHashBytes,
    serverState.presignOutput!,
  );
  serverState.signState = signServerStep1Result.st_1;

  // server -> client res step1
  clientState.signMessages = signServerStep1Result.msgs_0;

  // client execute step2
  const fullSignature0 = runSignClientStep2(
    clientState.signState,
    clientState.signMessages,
    clientState.presignOutput!,
  );

  // client -> server call step2
  const fullSignature2 = runSignServerStep2(
    serverState.signState,
    serverState.signMessages,
    serverState.presignOutput!,
  );

  if (
    fullSignature0.sig.big_r === fullSignature2.sig.big_r &&
    fullSignature0.sig.s === fullSignature2.sig.s
  ) {
    console.log(
      `sign success. big_r: ${fullSignature0.sig.big_r}, s: ${fullSignature0.sig.s}`,
    );
  } else {
    throw new Error("sign failed. big_r or s do not match");
  }

  const { r, s, v } = fullSignatureToEvmSig(fullSignature0, 11155111);

  const pk = recoverAddress(msgHashBytes, { r, s, v });
  console.log("pk1", pk);

  let compressedPub = clientState.keygenOutput!.public_key;
  if (!compressedPub.startsWith("0x")) {
    compressedPub = "0x" + compressedPub;
  }
  const uncompressed = computePublicKey(compressedPub, false);
  const ethAddress = computeAddress(uncompressed);
  console.log("pk2", ethAddress);
}
