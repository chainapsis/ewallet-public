import type { Result } from "@oko-wallet/stdlib-js";

import { OKO_IFRAME_ID } from "@oko-wallet-sdk-core/iframe";
import type {
  OkoWalletState,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";
import { registerMsgListener } from "@oko-wallet-sdk-core/window_msg/listener";

export async function lazyInit(
  okoWallet: OkoWalletWebInterface,
): Promise<Result<OkoWalletState, string>> {
  await waitUntilDocumentLoad();

  const el = document.getElementById(OKO_IFRAME_ID);
  if (el === null) {
    return {
      success: false,
      err: "iframe not exists even after oko wallet initialization",
    };
  }

  const checkURLRes = await checkURL(okoWallet.sdkEndpoint);
  if (!checkURLRes.success) {
    return checkURLRes;
  }

  const registerRes = await registerMsgListener(okoWallet);
  if (registerRes.success) {
    const initResult = registerRes.data;
    const { email, public_key, name, auth_type } = initResult;

    okoWallet.state = {
      email,
      publicKey: public_key,
      name,
      authType: auth_type,
    };

    if (email && public_key) {
      okoWallet.eventEmitter.emit({
        type: "CORE__accountsChanged",
        email: email,
        publicKey: public_key,
        name,
        authType: auth_type,
      });
    }

    return { success: true, data: okoWallet.state };
  } else {
    return {
      success: false,
      err: "msg listener register fail",
    };
  }
}

async function checkURL(url: string): Promise<Result<string, string>> {
  try {
    const response = await fetch(url, { mode: "no-cors" });
    if (!response.ok) {
      return { success: true, data: url };
    } else {
      return {
        success: false,
        err: `SDK endpoint, resp contains err, url: ${url}`,
      };
    }
  } catch (err: any) {
    console.error("[oko] check url fail, url: %s", url);

    return { success: false, err: `check url fail, ${err.toString()}` };
  }
}

// Wait for the document to load then give the processor one-tick to load
// iframe
async function waitUntilDocumentLoad() {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      Promise.resolve().then(() => {
        resolve(0);
      });
    } else {
      window.addEventListener("load", () => {
        Promise.resolve().then(() => {
          resolve(0);
        });
      });
    }
  });
}
