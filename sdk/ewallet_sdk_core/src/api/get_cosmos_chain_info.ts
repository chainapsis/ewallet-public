// import type { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
//
// export async function getCosmosChainInfo(this: KeplrEWallet) {
//   try {
//     const res = await this.sendMsgToIframe({
//       msg_type: "get_cosmos_chain_info",
//       payload: null,
//     });
//
//     if (res.msg_type === "get_cosmos_chain_info_ack") {
//       return res.payload;
//     }
//
//     return null;
//   } catch (error) {
//     console.error("[core] getCosmosChainInfo failed with error:", error);
//     return null;
//   }
// }
