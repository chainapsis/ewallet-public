import { type StdSignDoc, serializeSignDoc } from "@cosmjs/amino";
import { makeSignBytes } from "@cosmjs/proto-signing";
import type { StdSignature } from "@keplr-wallet/types";
import { sha256 } from "@noble/hashes/sha2";
import { keccak_256 } from "@noble/hashes/sha3";
import type { MakeSigError } from "@oko-wallet/oko-sdk-core";
import { encodeCosmosSignature } from "@oko-wallet/oko-sdk-cosmos";
import type { Result } from "@oko-wallet/stdlib-js";
import type { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

import { useAppState } from "@oko-wallet-attached/store/app";
import { makeSignature } from "@oko-wallet-attached/web3/sig";

export async function makeCosmosSignature(
  hostOrigin: string,
  signDoc: SignDoc | StdSignDoc,
  digestMethod: "sha256" | "keccak256",
  getIsAborted: () => boolean,
): Promise<Result<StdSignature, MakeSigError>> {
  const signDocBytes =
    "account_number" in signDoc
      ? serializeSignDoc(signDoc)
      : makeSignBytes(signDoc);

  const hashedMessage =
    digestMethod === "keccak256"
      ? keccak_256(signDocBytes)
      : digestMethod === "sha256"
        ? sha256(signDocBytes)
        : signDocBytes.slice();

  const signOutputRes = await makeSignature(
    hostOrigin,
    hashedMessage,
    getIsAborted,
  );
  if (!signOutputRes.success) {
    return { success: false, err: signOutputRes.err };
  }

  const signOutput = signOutputRes.data;

  const wallet = useAppState.getState().getWallet(hostOrigin);
  if (!wallet) {
    return { success: false, err: { type: "wallet_not_found" } };
  }

  const publicKey = Buffer.from(wallet.publicKey, "hex");
  const signature = encodeCosmosSignature(signOutput, publicKey);
  return { success: true, data: signature };
}

// export function verifyCosmosSig(
//   sig: StdSignature,
//   // chainInfo: ChainInfo,
//   bech32PrefixAccAddr: string,
//   signer: string,
//   data: string | Uint8Array,
// ) {
//   // const bech32PrefixAccAddr = chainInfo.bech32Config!.bech32PrefixAccAddr;
//   // const bech32PrefixAccAddr = "cosmos";
//
//   // Convert signature from base64 to Uint8Array
//   if (sig.signature === undefined) {
//     throw new Error('STDSignature not contains "signature" property');
//   }
//   const signatureBytes = fromBase64(sig.signature);
//
//   // Get public key from signature.pub_key
//   let pubKeyBytes: Uint8Array;
//   if (sig.pub_key?.value) {
//     pubKeyBytes = fromBase64(sig.pub_key.value);
//   } else {
//     throw new Error("Public key not found in signature");
//   }
//
//   // Determine algorithm based on signature type
//   const algo =
//     sig.pub_key?.type === "ethsecp256k1/PubKey" ? "ethsecp256k1" : "secp256k1";
//
//   const isVerified = verifyADR36Amino(
//     bech32PrefixAccAddr,
//     signer,
//     data,
//     pubKeyBytes,
//     signatureBytes,
//     algo,
//   );
//
//   return isVerified;
// }
//
// export function verifyADR36Amino(
//   bech32PrefixAccAddr: string,
//   signer: string,
//   data: string | Uint8Array,
//   pubKey: Uint8Array,
//   signature: Uint8Array,
//   algo: "secp256k1" | "ethsecp256k1" = "secp256k1",
// ): boolean {
//   const signDoc = makeADR36AminoSignDoc(signer, data);
//
//   console.log(22, signDoc);
//
//   return verifyADR36AminoSignDoc(
//     bech32PrefixAccAddr,
//     signDoc,
//     pubKey,
//     signature,
//     algo,
//   );
// }
//
// export function checkAndValidateADR36AminoSignDoc(
//   signDoc: StdSignDoc,
//   bech32PrefixAccAddr?: string,
// ): boolean {
//   const hasOnlyMsgSignData = (() => {
//     if (
//       signDoc &&
//       signDoc.msgs &&
//       Array.isArray(signDoc.msgs) &&
//       signDoc.msgs.length === 1
//     ) {
//       const msg = signDoc.msgs[0];
//       return msg.type === "sign/MsgSignData";
//     } else {
//       return false;
//     }
//   })();
//
//   if (!hasOnlyMsgSignData) {
//     return false;
//   }
//
//   if (signDoc.chain_id !== "") {
//     throw new Error("Chain id should be empty string for ADR-36 signing");
//   }
//
//   if (signDoc.memo !== "") {
//     throw new Error("Memo should be empty string for ADR-36 signing");
//   }
//
//   if (signDoc.account_number !== "0") {
//     throw new Error('Account number should be "0" for ADR-36 signing');
//   }
//
//   if (signDoc.sequence !== "0") {
//     throw new Error('Sequence should be "0" for ADR-36 signing');
//   }
//
//   if (signDoc.fee.gas !== "0") {
//     throw new Error('Gas should be "0" for ADR-36 signing');
//   }
//
//   if (signDoc.fee.amount.length !== 0) {
//     throw new Error("Fee amount should be empty array for ADR-36 signing");
//   }
//
//   const msg = signDoc.msgs[0];
//   if (msg.type !== "sign/MsgSignData") {
//     throw new Error(`Invalid type of ADR-36 sign msg: ${msg.type}`);
//   }
//   if (!msg.value) {
//     throw new Error("Empty value in the msg");
//   }
//   const signer = msg.value.signer;
//   if (!signer) {
//     throw new Error("Empty signer in the ADR-36 msg");
//   }
//
//   if (bech32PrefixAccAddr) {
//     // Basic validation - check if signer starts with the expected prefix
//     if (!signer.startsWith(bech32PrefixAccAddr)) {
//       throw new Error(`Invalid signer prefix: expected ${bech32PrefixAccAddr}`);
//     }
//   }
//
//   const data = msg.value.data;
//   if (!data) {
//     throw new Error("Empty data in the ADR-36 msg");
//   }
//   const rawData = Buffer.from(data, "base64");
//   // Validate the data is encoded as base64.
//   if (rawData.toString("base64") !== data) {
//     throw new Error("Data is not encoded by base64");
//   }
//   if (rawData.length === 0) {
//     throw new Error("Empty data in the ADR-36 msg");
//   }
//
//   return true;
// }
//
// export function verifyADR36AminoSignDoc(
//   bech32PrefixAccAddr: string,
//   signDoc: StdSignDoc,
//   pubKey: Uint8Array,
//   signature: Uint8Array,
//   algo: "secp256k1" | "ethsecp256k1" = "secp256k1",
// ): boolean {
//   if (!checkAndValidateADR36AminoSignDoc(signDoc, bech32PrefixAccAddr)) {
//     throw new Error("Invalid sign doc for ADR-36");
//   }
//
//   const expectedSigner = (() => {
//     if (algo === "ethsecp256k1") {
//       return getBech32Address(getEthAddress(pubKey), bech32PrefixAccAddr);
//     }
//     return getBech32Address(getCosmosAddress(pubKey), bech32PrefixAccAddr);
//   })();
//   const signer = signDoc.msgs[0].value.signer;
//   if (expectedSigner !== signer) {
//     throw new Error("Unmatched signer");
//   }
//
//   const msg = serializeSignDoc(signDoc);
//
//   const messageHash = (() => {
//     if (algo === "ethsecp256k1") {
//       return keccak_256(msg);
//     }
//     return sha256(msg);
//   })();
//
//   // Signature should be 64 bytes (32 bytes r + 32 bytes s)
//   if (signature.length !== 64) {
//     throw new Error(`Invalid length of signature: ${signature.length}`);
//   }
//
//   console.log("verify, msg hash", messageHash);
//
//   console.log("verify, signature", signature);
//
//   console.log("verify, pubkey", pubKey);
//
//   return secp256k1.verify(signature, messageHash, pubKey);
// }
//
// export function makeADR36AminoSignDoc(
//   signer: string,
//   data: string | Uint8Array,
// ): StdSignDoc {
//   const base64Data =
//     typeof data === "string"
//       ? Buffer.from(data).toString("base64")
//       : Buffer.from(data).toString("base64");
//
//   return {
//     chain_id: "",
//     account_number: "0",
//     sequence: "0",
//     fee: {
//       gas: "0",
//       amount: [],
//     },
//     msgs: [
//       {
//         type: "sign/MsgSignData",
//         value: {
//           signer,
//           data: base64Data,
//         },
//       },
//     ],
//     memo: "",
//   };
// }
