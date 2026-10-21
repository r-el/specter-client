/**
 * Utility for gathering ICE candidates before sending a WebRTC offer.
 * Optimized for WHEP / vanilla SDP signaling through Cloudflare TURN.
 */

const DEFAULT_ICE_GATHERING_TIMEOUT_MS = 1500;
const RELAY_FAST_PATH_TIMEOUT_MS = 250;

/** Determines whether an ICE candidate string represents a TURN relay candidate. */
export function isRelayCandidate(candidate: string | undefined): boolean {
  return typeof candidate === "string" && candidate.includes("typ relay");
}

/**
 * Waits for ICE candidates (especially Cloudflare TURN relay) to be gathered before sending offer.
 * Terminates early when gathering completes, an end-of-candidates null is received,
 * or 250ms after receiving a TURN relay candidate.
 */
export async function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = DEFAULT_ICE_GATHERING_TIMEOUT_MS,
): Promise<void> {
  if (pc.iceGatheringState === "complete" || typeof pc.addEventListener !== "function") {
    return;
  }

  return new Promise<void>((resolve) => {
    let resolved = false;
    let relayTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(overallTimeout);
      clearTimeout(relayTimer);
      pc.removeEventListener?.("icegatheringstatechange", onStateChange);
      pc.removeEventListener?.("icecandidate", onCandidate);
      resolve();
    };

    const overallTimeout = setTimeout(cleanup, timeoutMs);

    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        cleanup();
      }
    };

    const onCandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) {
        cleanup();
        return;
      }
      if (isRelayCandidate(event.candidate.candidate)) {
        if (!relayTimer) {
          relayTimer = setTimeout(cleanup, RELAY_FAST_PATH_TIMEOUT_MS);
        }
      }
    };

    pc.addEventListener("icegatheringstatechange", onStateChange);
    pc.addEventListener("icecandidate", onCandidate);
  });
}
