import { describe, expect, it } from "vitest";
import { cameraFormSchema } from "../schemas";

describe("cameraFormSchema", () => {
  const validCamera = {
    name: "Front Yard Camera",
    source_url: "rtsp://camera.local:554/stream1",
    location: "Main Gate",
    watchlist_ids: ["wl-1"],
    detection_classes: ["person", "car"],
  };

  it("validates valid camera inputs", () => {
    const result = cameraFormSchema.safeParse(validCamera);
    expect(result.success).toBe(true);
  });

  it("rejects URLs with credentials embedded", () => {
    const result = cameraFormSchema.safeParse({
      ...validCamera,
      source_url: "rtsp://admin:pass@camera.local:554/stream1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Remove credentials from the URL");
    }
  });

  it("rejects non-RTSP/HTTP protocols like ftp://", () => {
    const result = cameraFormSchema.safeParse({
      ...validCamera,
      source_url: "ftp://camera.local/stream",
    });
    expect(result.success).toBe(false);
  });

  it("accepts local FFmpeg sources", () => {
    const result = cameraFormSchema.safeParse({
      ...validCamera,
      source_url: "ffmpeg:/dev/video0#video=h264",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = cameraFormSchema.safeParse({
      ...validCamera,
      name: "   ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Camera name is required");
    }
  });

  it("enforces watchlist limit", () => {
    const result = cameraFormSchema.safeParse({
      ...validCamera,
      watchlist_ids: Array.from({ length: 51 }, (_, i) => `wl-${i}`),
    });
    expect(result.success).toBe(false);
  });
});
