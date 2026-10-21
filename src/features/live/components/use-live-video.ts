import { useCallback, useEffect, useRef, useState } from "react";
import { startMseSession } from "../lib/mse-session";
import { startWebrtcSession } from "../lib/webrtc-session";
import type { PlaybackState } from "../lib/mse-session";

const MAX_RETRIES = 3;

export function useLiveVideo(cameraId: string, enabled: boolean, preferWebrtc = false) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PlaybackState>({ phase: "connecting", message: "Connecting…" });
  const retry = useCallback(() => {
    setState({ phase: "connecting", message: "Connecting with a new live ticket…" });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    let cancelled = false;
    let retries = 0;
    let useMseFallback = false;
    let stopSession: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      stopSession?.();
      const useWebrtc = preferWebrtc && !useMseFallback;
      const startSession = useWebrtc ? startWebrtcSession : startMseSession;
      stopSession = startSession(cameraId, video!, (next) => {
        if (!cancelled) setState(next);
      }, (failure) => {
        if (cancelled) return;
        // Handle WebRTC failure with 1 retry before MSE fallback
        if (useWebrtc) {
          if (failure.retryable && retries < 1) {
            retries += 1;
            setState({
              phase: "retrying",
              message: `${failure.message} Retrying WebRTC (1/1)…`,
            });
            timer = setTimeout(connect, 1000);
            return;
          }
          useMseFallback = true;
          setState({
            phase: "retrying",
            message: "WebRTC stream unavailable; falling back to MSE…",
          });
          connect();
          return;
        }

        // If we already fell back from WebRTC to MSE, do not wait through 3 retries; fail immediately to JPEG snapshots
        if (useMseFallback) {
          setState({ phase: "failed", message: failure.message });
          return;
        }

        if (failure.retryable && retries < MAX_RETRIES) {
          const delay = 1000 * 2 ** retries;
          retries += 1;
          setState({ phase: "retrying", message: `${failure.message} Retry ${retries}/${MAX_RETRIES} in ${delay / 1000}s…` });
          timer = setTimeout(connect, delay);
        } else {
          setState({ phase: "failed", message: failure.message });
        }
      });
    }

    connect();
    return () => {
      // Each effect owns its cancellation flag: StrictMode's second setup cannot revive the first.
      cancelled = true;
      clearTimeout(timer);
      stopSession?.();
    };
  }, [cameraId, enabled, attempt, preferWebrtc]);

  return { videoRef, state, retry };
}
