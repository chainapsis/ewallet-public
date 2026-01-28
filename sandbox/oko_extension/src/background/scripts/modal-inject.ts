/**
 * Modal injection script - executed via chrome.scripting.executeScript
 *
 * This script is injected into oko_attached pages to handle modal communication
 * when CSP restrictions prevent inline scripts.
 */

/**
 * Script to inject into MAIN world for modal handling
 */
export function modalInjectScript(
  hostOrigin: string,
  requestId: string,
  modalType: string,
  modalId: string,
  modalData: unknown,
  apiKey: string | undefined
): void {
  const STORAGE_KEY = "oko-wallet-app-2";
  const urlParams = new URLSearchParams(window.location.search);
  const alreadyReloaded = urlParams.get("_oko_reloaded") === "true";

  // Set api_key in localStorage and reload if needed
  if (apiKey && !alreadyReloaded) {
    try {
      const existingData = localStorage.getItem(STORAGE_KEY);
      const storeData = existingData
        ? JSON.parse(existingData)
        : { state: { perOrigin: {} }, version: 0 };

      if (!storeData.state) storeData.state = { perOrigin: {} };
      if (!storeData.state.perOrigin) storeData.state.perOrigin = {};
      if (!storeData.state.perOrigin[hostOrigin])
        storeData.state.perOrigin[hostOrigin] = {};

      storeData.state.perOrigin[hostOrigin].apiKey = apiKey;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));

      // Reload so zustand picks up the api_key during hydration
      urlParams.set("_oko_reloaded", "true");
      window.location.search = urlParams.toString();
      return;
    } catch (e) {
      console.error("[oko-modal] Failed to set api_key:", e);
    }
  }

  // Mock window.parent for top-level window
  const mockParent = {
    postMessage: (
      data: unknown,
      _targetOrigin: string,
      transfer?: Transferable[]
    ) => {
      const msg = data as { msg_type?: string };

      if (
        msg?.msg_type === "open_modal_ack" ||
        msg?.msg_type === "close_modal"
      ) {
        window.postMessage(
          { __oko_extension_response__: true, requestId, data },
          "*"
        );
      }

      // Acknowledge init messages via transferred port
      if (transfer?.[0] && msg?.msg_type === "init") {
        (transfer[0] as MessagePort).postMessage({
          target: "oko_attached",
          msg_type: "init_ack",
          payload: { success: true, data: null },
        });
      }
    },
  };

  if (window === window.top) {
    try {
      Object.defineProperty(window, "parent", {
        get: () => mockParent,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
  }

  // Wait for oko_attached to be ready, then send open_modal via MessageChannel
  setTimeout(() => {
    const channel = new MessageChannel();

    channel.port1.onmessage = (event: MessageEvent) => {
      const response = event.data;
      if (
        response?.msg_type === "open_modal_ack" ||
        response?.msg_type === "close_modal"
      ) {
        window.postMessage(
          { __oko_extension_response__: true, requestId, data: response },
          "*"
        );
      }
    };

    // Fix origin in modalData to use hostOrigin (extension origin)
    let fixedModalData = modalData;
    if (modalData && typeof modalData === "object") {
      const data = modalData as Record<string, unknown>;
      if (data.payload && typeof data.payload === "object") {
        const payload = data.payload as Record<string, unknown>;
        if (payload.origin) {
          fixedModalData = {
            ...data,
            payload: { ...payload, origin: hostOrigin },
          };
        }
      }
    }

    window.postMessage(
      {
        source: "oko_sdk",
        target: "oko_attached",
        msg_type: "open_modal",
        payload: { modal_type: modalType, modal_id: modalId, data: fixedModalData },
      },
      "*",
      [channel.port2]
    );
  }, 2000);

  // Backup: listen for responses via regular postMessage
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (
      msg?.target === "oko_sdk" &&
      (msg?.msg_type === "open_modal_ack" || msg?.msg_type === "close_modal")
    ) {
      window.postMessage(
        { __oko_extension_response__: true, requestId, data: msg },
        "*"
      );
    }
  });
}

/**
 * Script for relaying messages to MAIN world
 */
export function relayToMainWorldScript(msgData: unknown): void {
  const event = new MessageEvent("message", {
    data: msgData,
    origin: window.location.origin,
    source: window.parent,
  });
  window.dispatchEvent(event);
}
