import { io, type Socket } from "socket.io-client";
import { getLiveIceServers, liveFailure, type LiveFailure } from "../api/live";
import type { PlaybackState } from "./mse-session";

const STALL_TIMEOUT_MS = 15000;

/** Starts a WebRTC live video session using Socket.IO signaling and Cloudflare TURN. */
export function startWebrtcSession(
  cameraId: string,
  video: HTMLVideoElement,
  onState: (state: PlaybackState) => void,
  onFailure: (failure: LiveFailure) => void,
): () => void {
  const controller = new AbortController();
  const correlationId = `${cameraId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let disposed = false;
  let pc: RTCPeerConnection | undefined;
  let socket: Socket | undefined;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  function fail(message: string, retryable = true) {
    if (disposed) return;
    onState({ phase: "failed", message });
    onFailure({ message, retryable });
    dispose();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    clearTimeout(stallTimer);

    if (socket) {
      socket.off("webrtc:answer");
      socket.off("webrtc:ice_candidate");
      socket.disconnect();
    }

    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }

    if (video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  }

  async function initialize() {
    onState({ phase: "connecting", message: "Connecting WebRTC (Cloudflare TURN)…" });

    stallTimer = setTimeout(() => {
      fail("WebRTC connection timed out. Camera stream may be unavailable.");
    }, STALL_TIMEOUT_MS);

    try {
      // 1. Fetch ICE servers (STUN & Cloudflare TURN)
      const iceServers = await getLiveIceServers(cameraId, controller.signal);
      if (disposed) return;

      // 2. Initialize RTCPeerConnection
      pc = new RTCPeerConnection({ iceServers });

      pc.ontrack = (event) => {
        if (disposed) return;
        clearTimeout(stallTimer);
        video.srcObject = event.streams[0];
        video.play().catch(() => {
          // Autoplay policy may require user interaction
        });
        onState({ phase: "playing", message: "Live video · WebRTC (Cloudflare)" });
      };

      pc.onconnectionstatechange = () => {
        if (disposed || !pc) return;
        if (pc.connectionState === "connected") {
          clearTimeout(stallTimer);
          onState({ phase: "playing", message: "Live video · WebRTC (Cloudflare)" });
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          fail("WebRTC media link dropped.", true);
        }
      };

      // 3. Connect to signaling socket
      const token = localStorage.getItem("token") ?? "";
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:12113";
      socket = io(baseUrl, {
        auth: { token: `Bearer ${token}` },
        transports: ["websocket", "polling"],
      });

      const pendingCandidates: RTCIceCandidateInit[] = [];
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        if (socket?.connected) {
          socket.emit("webrtc:ice_candidate", {
            cameraId,
            candidate: event.candidate,
            correlationId,
          });
        } else {
          pendingCandidates.push(event.candidate.toJSON());
        }
      };

      socket.on("webrtc:answer", async (payload: { cameraId: string; sdp: string; correlationId: string }) => {
        if (disposed || !pc || payload.correlationId !== correlationId) return;
        try {
          await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
        } catch (err) {
          fail(`Failed to apply WebRTC answer: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      socket.on("webrtc:ice_candidate", async (payload: { cameraId: string; candidate: unknown; correlationId: string }) => {
        if (disposed || !pc || payload.correlationId !== correlationId) return;
        try {
          if (payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate as RTCIceCandidateInit));
          }
        } catch {
          // ICE candidate error non-fatal
        }
      });

      // 4. Create offer and send to agent
      pc.addTransceiver("video", { direction: "recvonly" });
      const offer = await pc.createOffer();
      if (disposed) return;
      await pc.setLocalDescription(offer);

      const sendOffer = () => {
        if (disposed || !offer.sdp) return;
        socket?.emit("webrtc:offer", {
          cameraId,
          sdp: offer.sdp,
          correlationId,
        });
        while (pendingCandidates.length > 0) {
          const candidate = pendingCandidates.shift();
          socket?.emit("webrtc:ice_candidate", {
            cameraId,
            candidate,
            correlationId,
          });
        }
      };

      if (socket.connected) {
        sendOffer();
      } else {
        socket.once("connect", sendOffer);
      }
    } catch (error) {
      if (!disposed) {
        fail(liveFailure(error).message, true);
      }
    }
  }

  void initialize();
  return dispose;
}
