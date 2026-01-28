/**
 * Event Broadcaster - Broadcasts provider events to all tabs
 */

export type ProviderEvent = "chainChanged" | "accountsChanged" | "connect" | "disconnect";

/**
 * Broadcast an event to all tabs with content scripts
 */
export async function broadcastEvent(
  event: ProviderEvent,
  payload: unknown
): Promise<void> {
  console.debug("[oko-bg] Broadcasting event:", event, payload);

  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "PROVIDER_EVENT",
          event,
          payload,
        });
      } catch {
        // Tab might not have content script, ignore
      }
    }
  }
}
