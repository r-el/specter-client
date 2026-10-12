import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLiveIceServers } from "@/features/live/api/live";
import { startWebrtcSession } from "../webrtc-session";

vi.mock("@/features/live/api/live", async (original) => ({
  ...await original<typeof import("@/features/live/api/live")>(),
  getLiveIceServers: vi.fn(),
}));

const mockSocket = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn((event: string, cb: (...args: any[]) => void) => {
    if (event === "connect") {
      cb();
    }
  }),
  off: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

class FakeRTCPeerConnection {
  iceServers: any[];
  connectionState = "new";
  ontrack: ((event: any) => void) | null = null;
  onicecandidate: ((event: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  close = vi.fn();
  addTransceiver = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ sdp: "v=0\r\no=mock ...", type: "offer" });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);

  constructor(config: any) {
    this.iceServers = config?.iceServers ?? [];
  }
}

describe("startWebrtcSession", () => {
  let video: HTMLVideoElement;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("RTCPeerConnection", FakeRTCPeerConnection);
    vi.mocked(getLiveIceServers).mockResolvedValue([
      { urls: "stun:turn.cloudflare.com:3478" },
      {
        urls: ["turn:turn.cloudflare.com:3478?transport=udp"],
        username: "test-cf-user",
        credential: "test-cf-token",
      },
    ]);
    video = document.createElement("video");
  });

  afterEach(() => {
    dispose?.();
    vi.unstubAllGlobals();
  });

  it("fetches Cloudflare ICE servers and negotiates offer over socket", async () => {
    const onState = vi.fn();
    const onFailure = vi.fn();

    dispose = startWebrtcSession("cam-1", video, onState, onFailure);

    await vi.waitFor(() => {
      expect(getLiveIceServers).toHaveBeenCalledWith("cam-1", expect.any(AbortSignal));
    });

    await vi.waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "webrtc:offer",
        expect.objectContaining({
          cameraId: "cam-1",
          sdp: "v=0\r\no=mock ...",
          correlationId: expect.any(String),
        }),
      );
    });

    expect(onState).toHaveBeenCalledWith(
      expect.objectContaining({ phase: "connecting" }),
    );
  });

  it("cleans up peer connection and socket on dispose", async () => {
    const onState = vi.fn();
    const onFailure = vi.fn();

    dispose = startWebrtcSession("cam-1", video, onState, onFailure);

    await vi.waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith("webrtc:offer", expect.anything());
    });

    dispose();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
