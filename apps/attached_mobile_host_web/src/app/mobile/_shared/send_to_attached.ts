import { ATTACHED_ORIGIN } from "./build_iframe_src";

/**
 * Send a message to the attached iframe via `MessageChannel` and wait for
 * the ack response. Returns a promise that resolves with the ack data.
 */
export function sendToAttached<TAck>(
  iframe: HTMLIFrameElement,
  msg: { target: string; msg_type: string; payload: unknown },
  timeoutMs = 300_000,
): Promise<TAck> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${msg.msg_type} response`));
    }, timeoutMs);

    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data as TAck);
    };

    iframe.contentWindow!.postMessage(msg, ATTACHED_ORIGIN, [channel.port2]);
  });
}
