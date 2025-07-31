import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export async function getPublicKey(this: CosmosEWallet): Promise<Uint8Array> {
  try {
    const pubKey = await this.eWallet.getPublicKey();
    if (pubKey === null) {
      throw new Error("Failed to get public key");
      // return { success: false, err: "Failed to get public key" };
    }

    return Buffer.from(pubKey, "hex");
    // return { success: true, data: Buffer.from(pubKey, "hex") };
  } catch (error: any) {
    console.error("[cosmos] getPublicKey failed with error:", error);
    throw error;
    // return { success: false, err: error.toString() };
  }
}
