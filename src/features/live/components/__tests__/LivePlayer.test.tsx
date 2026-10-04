import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getLiveFrame } from "@/features/live/api/live";
import { startMseSession } from "../../lib/mse-session";
import { LivePlayer } from "../LivePlayer";

vi.mock("../../lib/mse-session", () => ({ startMseSession: vi.fn() }));
vi.mock("@/features/live/api/live", async (original) => ({
  ...await original<typeof import("@/features/live/api/live")>(), getLiveFrame: vi.fn(),
}));

const stops: ReturnType<typeof vi.fn>[] = [];
const revoke = vi.fn();
const decode = vi.fn<() => Promise<void>>();
let imageNumber = 0;
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  stops.length = 0;
  imageNumber = 0;
  decode.mockResolvedValue();
  vi.mocked(startMseSession).mockImplementation(() => {
    const stop = vi.fn();
    stops.push(stop);
    return stop;
  });
  vi.mocked(getLiveFrame).mockResolvedValue(new Blob(["synthetic-jpeg"], { type: "image/jpeg" }));
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => `blob:frame-${++imageNumber}`);
    static revokeObjectURL = revoke;
  });
  vi.stubGlobal("Image", class { src = ""; decode = decode; });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function failSession(index: number, retryable: boolean) {
  await act(async () => {
    vi.mocked(startMseSession).mock.calls[index][3]({ message: "Synthetic stream failure", retryable });
  });
}

it("failed MSE falls back to labelled JPEGs, revokes replaced images and cleans up", async () => {
  const { unmount } = render(<LivePlayer cameraId="cam-1" cameraName="Entrance" />);
  await failSession(0, false);
  expect(screen.getByText("JPEG snapshots — not live video")).toBeTruthy();
  expect(screen.getByRole("img", { name: /Latest JPEG snapshot from Entrance/ }).getAttribute("src")).toBe("blob:frame-1");
  expect(screen.getByText(/not continuous video/)).toBeTruthy();
  const signal = vi.mocked(getLiveFrame).mock.calls[0][1];
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(screen.getByRole("img").getAttribute("src")).toBe("blob:frame-2");
  expect(revoke).toHaveBeenCalledWith("blob:frame-1");
  unmount();
  expect(signal.aborted).toBe(true);
  expect(revoke).toHaveBeenCalledWith("blob:frame-2");
  expect(stops[0]).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("retries use separate sessions at 1/2/4 seconds, then fall back after three retries", async () => {
  const { unmount } = render(<LivePlayer cameraId="cam-1" cameraName="Entrance" />);
  for (let index = 0; index < 3; index += 1) {
    await failSession(index, true);
    expect(getLiveFrame).not.toHaveBeenCalled();
    const delay = 1000 * 2 ** index;
    await act(async () => { await vi.advanceTimersByTimeAsync(delay - 1); });
    expect(startMseSession).toHaveBeenCalledTimes(index + 1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(startMseSession).toHaveBeenCalledTimes(index + 2);
    expect(stops[index]).toHaveBeenCalledOnce();
  }
  await failSession(3, true);
  expect(screen.getByText("JPEG snapshots — not live video")).toBeTruthy();
  expect(getLiveFrame).toHaveBeenCalledOnce();
  unmount();
});

it("labels connection and playback states accurately", async () => {
  render(<LivePlayer cameraId="cam-1" cameraName="Entrance" />);
  expect(screen.getByText("Connecting to live video")).toBeTruthy();

  await act(async () => {
    vi.mocked(startMseSession).mock.calls[0][2]({ phase: "buffering", message: "Waiting for video" });
  });
  expect(screen.getByText("Buffering live video")).toBeTruthy();

  await act(async () => {
    vi.mocked(startMseSession).mock.calls[0][2]({ phase: "playing", message: "Playback started" });
  });
  expect(screen.getByText("Live video")).toBeTruthy();

  await act(async () => {
    vi.mocked(startMseSession).mock.calls[0][2]({ phase: "paused", message: "Playback paused" });
  });
  expect(screen.getByText("Video paused")).toBeTruthy();

  await act(async () => {
    vi.mocked(startMseSession).mock.calls[0][2]({ phase: "retrying", message: "Retrying shortly" });
  });
  expect(screen.getByText("Reconnecting to live video")).toBeTruthy();
});

it("manual snapshot mode stops video, and Try live video cancels snapshots and reconnects", async () => {
  const { unmount } = render(<LivePlayer cameraId="cam-1" cameraName="Entrance" />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Use snapshots" })); });
  expect(stops[0]).toHaveBeenCalledOnce();
  const signal = vi.mocked(getLiveFrame).mock.calls[0][1];
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Try live video" })); });
  expect(signal.aborted).toBe(true);
  expect(revoke).toHaveBeenCalledWith("blob:frame-1");
  expect(startMseSession).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("img")).toBeNull();
  unmount();
});

it("snapshot polling waits for decode; unmount revokes a pending image without later updates", async () => {
  let finishDecode!: () => void;
  decode.mockReturnValue(new Promise<void>((resolve) => { finishDecode = resolve; }));
  const { unmount } = render(<LivePlayer cameraId="cam-1" cameraName="Entrance" />);
  await failSession(0, false);
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(getLiveFrame).toHaveBeenCalledOnce();
  expect(screen.queryByRole("img")).toBeNull();
  unmount();
  expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:frame-1");
  await act(async () => { finishDecode(); });
  expect(vi.getTimerCount()).toBe(0);
});

it("failed snapshot decode revokes its URL and permits a manual snapshot retry", async () => {
  decode.mockRejectedValueOnce(new Error("invalid JPEG"));
  const { unmount } = render(<LivePlayer cameraId="cam-1" cameraName="Entrance" />);
  await failSession(0, false);
  expect(screen.getByText("Snapshot unavailable")).toBeTruthy();
  expect(revoke).toHaveBeenCalledWith("blob:frame-1");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry snapshots" })); });
  expect(screen.getByRole("img").getAttribute("src")).toBe("blob:frame-2");
  unmount();
});

it("StrictMode cleanup prevents old session callbacks from reviving retries", async () => {
  const { unmount } = render(<StrictMode><LivePlayer cameraId="cam-1" cameraName="Entrance" /></StrictMode>);
  expect(startMseSession).toHaveBeenCalledTimes(2);
  expect(stops[0]).toHaveBeenCalledOnce();
  await failSession(0, true);
  await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
  expect(startMseSession).toHaveBeenCalledTimes(2);
  expect(getLiveFrame).not.toHaveBeenCalled();
  await failSession(1, true);
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
  expect(startMseSession).toHaveBeenCalledTimes(2);
  expect(stops[1]).toHaveBeenCalledOnce();
});