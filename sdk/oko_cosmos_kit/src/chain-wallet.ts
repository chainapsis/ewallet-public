import { ChainWalletBase, State } from "@cosmos-kit/core";

import type { OkoMainWallet } from "./main-wallet";

export class OkoChainWallet extends ChainWalletBase {
  async update() {
    // If MainWallet's client is undefined and state is Init, force re-initialization
    const mainWallet = this.mainWallet as OkoMainWallet;
    if (
      mainWallet &&
      !mainWallet.client &&
      mainWallet.clientMutable?.state === State.Init
    ) {
      await mainWallet.initClient();
    }

    await super.update();
  }
}
