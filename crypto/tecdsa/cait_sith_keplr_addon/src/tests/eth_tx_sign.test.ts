import {
  computeAddress,
  recoverAddress,
  serialize,
  type UnsignedTransaction,
} from "@ethersproject/transactions";
import type {
  SignOutput,
  TECDSAClientState,
  TECDSAServerState,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";
import { BigNumber } from "ethers";
import {
  arrayify,
  computePublicKey,
  hexZeroPad,
  keccak256,
} from "ethers/lib/utils";

import {
  runKeygenClientCentralized,
  runPresignClientStep1,
  runPresignClientStep2,
  runPresignClientStep3,
  runSignClientStep1V2,
  runSignClientStep2,
} from "../client";
import {
  runPresignServerStep1,
  runPresignServerStep2,
  runPresignServerStep3,
  runSignServerStep1V2,
  runSignServerStep2,
  runTriplesServerStep1,
} from "../server";

const tx: UnsignedTransaction = {
  chainId: 11155111, //  ChainID.SEPOLIA,
  nonce: 0,
  gasPrice: 1000000000,
  gasLimit: 1000000,
  to: "0x7a30Ca3D9F407fe9503655450cd008958f80e053",
  value: 0,
  data: "0x",
};

export function fullSignatureToEvmSig(
  signOutput: SignOutput,
  chainId?: number,
): { r: string; s: string; v: number } {
  const { sig, is_high } = signOutput;

  // 1) Decompress R
  const bigRHex = sig.big_r.startsWith("0x") ? sig.big_r : "0x" + sig.big_r;
  const uncompressed = computePublicKey(bigRHex, false);

  // 2) Extract x and y
  const xHex = "0x" + uncompressed.slice(4, 68);
  const yHex = "0x" + uncompressed.slice(68, 132);

  // 3) Pad x to 32 bytes → r
  const r = hexZeroPad(xHex, 32);

  // 4) Determine v from y parity (odd = 28, even = 27)
  const yBN = BigNumber.from(yHex);
  const isYOdd = yBN.mod(2).eq(1);
  let v = isYOdd ? 28 : 27;

  // 5) Flip v if s was normalized (low-s rule)
  if (is_high) {
    v = v === 27 ? 28 : 27;
  }

  // 6) Apply EIP-155 if chainId is given
  if (chainId != null) {
    v += chainId * 2 + 8;
  }

  // 7) Pad s to 32 bytes
  const sHex = "0x" + sig.s.replace(/^0x/, "");
  const s = hexZeroPad(sHex, 32);

  return { r, s, v };
}

export async function signTest3(
  clientState: TECDSAClientState,
  serverState: TECDSAServerState,
) {
  // clientState.keygenOutput0 = {
  //   private_share:
  //     'AD5EFF4DD60859519BA4F5ED9D3F8BB6AB4190B7009EA81C1D2E5C6661AA9FC9',
  //   public_key:
  //     '020DE7F3613E7C0FEA7A15332625DEDDF430E01AB6B9081FCB9BFA78B3E38E5984',
  // };
  // clientState.keygenOutput1 = {
  //   private_share:
  //     '6717848B9F17B02F0B61EE2A02EE17970CFE1C6E7A28D2FE1FAB6A6F7447F781',
  //   public_key:
  //     '020DE7F3613E7C0FEA7A15332625DEDDF430E01AB6B9081FCB9BFA78B3E38E5984',
  // };
  // serverState.keygenOutput = {
  //   // 33 bytes(sss) -> 32bytes(cait-sith)
  //   private_share:
  //     '20D009C96827070C7B1EE666689CA3776EBAA825F3B2FDE02228787886E54F39',
  //   public_key:
  //     '020DE7F3613E7C0FEA7A15332625DEDDF430E01AB6B9081FCB9BFA78B3E38E5984',
  // };

  const keygenOutputs = runKeygenClientCentralized();
  clientState.keygenOutput = keygenOutputs.keygen_outputs[Participant.P0];
  serverState.keygenOutput = keygenOutputs.keygen_outputs[Participant.P1];

  const triplesResult = runTriplesServerStep1();
  clientState.triple0Pub = triplesResult.pub0;
  clientState.triple1Pub = triplesResult.pub1;
  clientState.triple0Share0 = triplesResult.shares0[0];
  clientState.triple1Share1 = triplesResult.shares1[0];
  serverState.triple0Pub = triplesResult.pub0;
  serverState.triple1Pub = triplesResult.pub1;
  serverState.triple0Share = triplesResult.shares0[1];
  serverState.triple1Share = triplesResult.shares1[1];

  // client execute step1
  const presignClientStep1Result = runPresignClientStep1(
    clientState.triple0Pub!,
    clientState.triple1Pub!,
    clientState.triple0Share0!,
    clientState.triple1Share1!,
    clientState.keygenOutput!,
  );
  clientState.presignState = presignClientStep1Result.st_0;

  // client -> server call step1
  // server msg receive
  serverState.presignMessages = presignClientStep1Result.msgs_1;
  const presignServerStep1Result = runPresignServerStep1(
    serverState.triple0Pub!,
    serverState.triple1Pub!,
    serverState.triple0Share!,
    serverState.triple1Share!,
    serverState.keygenOutput!,
  );
  serverState.presignState = presignServerStep1Result.state;

  // server -> client res step1
  clientState.presignMessages = presignServerStep1Result.msgs0;

  // client execute step2
  const presignClientStep2Result = runPresignClientStep2(
    clientState.presignState,
  );
  clientState.presignState = presignClientStep2Result.st_0;

  // client -> server call step2
  // server msg receive
  serverState.presignMessages.wait_1[0] =
    presignClientStep2Result.msgs_1.wait_1[0];
  const presignServerStep2Result = runPresignServerStep2(
    serverState.presignState,
  );
  serverState.presignState = presignServerStep2Result.state;

  // server -> client res step2
  clientState.presignMessages.wait_1[1] =
    presignServerStep2Result.msgs0.wait_1[1];

  // client execute step3
  const presignOutput0 = runPresignClientStep3(
    clientState.presignState,
    clientState.presignMessages,
  );
  clientState.presignOutput = presignOutput0;

  // client -> server call step3
  const presignOutput2 = runPresignServerStep3(
    serverState.presignState,
    serverState.presignMessages,
  );
  serverState.presignOutput = presignOutput2;

  if (presignOutput0.big_r === presignOutput2.big_r) {
    console.log(`presign success. big_r: ${presignOutput0.big_r}`);
  } else {
    throw new Error("presign failed. big_r do not match");
  }

  const msgHash = keccak256(serialize(tx)); // 0xasdfasdfa
  const msgHashBytes = arrayify(msgHash); // ??

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
  const sig0 = runSignClientStep2(
    clientState.signState,
    clientState.signMessages,
    clientState.presignOutput!,
  );
  const { sig: fullSignature0 } = sig0;

  // client -> server call step2
  const sig2 = runSignServerStep2(
    serverState.signState,
    serverState.signMessages,
    serverState.presignOutput!,
  );
  const { sig: fullSignature2 } = sig2;

  if (
    fullSignature0.big_r === fullSignature2.big_r &&
    fullSignature0.s === fullSignature2.s
  ) {
    console.log(
      `sign success. big_r: ${fullSignature0.big_r}, s: ${fullSignature0.s}`,
    );
  } else {
    throw new Error("sign failed. big_r or s do not match");
  }

  const { r, s, v } = fullSignatureToEvmSig(sig0, 11155111);
  const addressBySig = recoverAddress(msgHashBytes, { r, s, v });

  const compressedPub = "0x" + clientState.keygenOutput.public_key;
  const uncompressed = computePublicKey(compressedPub, false);
  const addressByPubkey = computeAddress(uncompressed);

  if (addressBySig.toLowerCase() === addressByPubkey.toLowerCase()) {
    console.log(
      `verify success. addressBySig: ${addressBySig}, addressByPubkey: ${addressByPubkey}`,
    );
  } else {
    throw new Error("verify failed. address do not match");
  }
}

// describe('eth_tx_sign_1', () => {
//   it('test1', async () => {
//     const clientState = makeClientState();
//     const serverState = makeServerState();

//     await signTest3(clientState, serverState);
//   });
// });
