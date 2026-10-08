import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertsTable } from "../AlertsTable";
import { useAlerts } from "@/features/alerts/hooks/use-alerts";
import { useCameras } from "@/features/cameras/hooks/use-cameras";
import type { SpecterAlert } from "@/features/alerts/api/alerts";
import type { CameraDetails } from "@/features/cameras/api/cameras";

// ── Mocks ──────────────────────────────────────────────────────────────────
const visibility = vi.hoisted(() => ({ inView: false }));
vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: vi.fn(), inView: visibility.inView }),
}));
vi.mock("@/features/alerts/hooks/use-alerts",  () => ({ useAlerts:  vi.fn() }));
vi.mock("@/features/cameras/hooks/use-cameras", () => ({ useCameras: vi.fn() }));
vi.mock("@/features/alerts/components/AlertDetails", () => ({
  AlertDetails: ({ initialAlert }: { initialAlert: SpecterAlert }) =>
    <div role="dialog">Selected {initialAlert.id}</div>,
}));

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeAlert(id: string, kind: SpecterAlert["kind"] = "identity_match"): SpecterAlert {
  return {
    id, kind, owner_id: "owner", camera_id: "cam/a", camera_name: "Entrance", track_id: 1,
    object_class: "person", bounding_box: { x: 0, y: 0, width: 0.2, height: 0.3 },
    frame_captured_at: "2026-09-25T12:00:00Z", created_at: "2026-09-25T12:00:00Z", has_snapshot: true,
    snapshot_url: "https://untrusted.invalid/snapshot",
    review: { disposition: "unreviewed", is_acknowledged: false, note: null },
    watchlist_id: "list", watchlist_name: "Staff", watchlist_kind: "watchlist",
    target_id: "target", target_label: `Person ${id}`,
    modality: "face", similarity_ratio: 0.955, margin_ratio: 0.1,
    rule_id: "rule", rule_kind: kind === "rule" ? "line_crossing" : null,
    zone_id: null, dwell_seconds: null, crossing_direction: null,
  };
}

function makeCamera(id: string, name: string): CameraDetails {
  return {
    id, name, source_url: "rtsp://cam", username: null, has_password: false,
    location: "Lobby", created_by: null, watchlist_ids: [], detection_classes: [],
    is_enabled: true, desired_state: "running", live_status: "running",
  };
}

function mockAlerts(overrides = {}) {
  const value = {
    data: { pages: [{ alerts: [makeAlert("a")], next_cursor: null }] },
    isLoading: false, isFetching: false, isError: false, error: null,
    hasNextPage: false, isFetchingNextPage: false, isFetchNextPageError: false,
    fetchNextPage: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  vi.mocked(useAlerts).mockReturnValue(value as unknown as ReturnType<typeof useAlerts>);
  return value;
}

function mockCameras(cameras: CameraDetails[] = []) {
  vi.mocked(useCameras).mockReturnValue({
    data: cameras, isLoading: false, isError: false,
  } as unknown as ReturnType<typeof useCameras>);
}

const mount = (limit?: number) =>
  render(<MemoryRouter><AlertsTable limit={limit} /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  visibility.inView = false;
  mockAlerts();
  mockCameras();
});

// ── Alert rows and pagination ──────────────────────────────────────────────
describe("alert rows and pagination", () => {
  it("deduplicates IDs across pages while rendering identity and rule contracts", () => {
    mockAlerts({
      data: {
        pages: [
          { alerts: [makeAlert("a")],                              next_cursor: "next" },
          { alerts: [makeAlert("a"), makeAlert("b", "rule")], next_cursor: null  },
        ],
      },
    });
    mount();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("2 alerts loaded")).toBeTruthy();
    expect(screen.getByText("95.5%")).toBeTruthy();
    expect(screen.getByText("line crossing")).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: "Entrance" })[0].getAttribute("href"),
    ).toBe("/cameras?camera_id=cam%2Fa");
    fireEvent.click(screen.getAllByRole("link", { name: "Entrance" })[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View alert a" }));
    expect(screen.getByRole("dialog").textContent).toBe("Selected a");
  });

  it("caps preview rows/page size and never auto-paginates a preview", () => {
    visibility.inView = true;
    const current = mockAlerts({
      data: { pages: [{ alerts: [makeAlert("a"), makeAlert("b"), makeAlert("c")], next_cursor: "next" }] },
      hasNextPage: true,
    });
    mount(2);
    expect(useAlerts).toHaveBeenCalledWith({ limit: 2 });
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByRole("form", { name: "Filter alerts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(current.fetchNextPage).not.toHaveBeenCalled();
  });

  it.each([[500, 200], [-1, 1], [2.9, 2]])("bounds preview limit %s to %s", (limit, expected) => {
    mount(limit);
    expect(useAlerts).toHaveBeenCalledWith({ limit: expected });
  });

  it("loads more when visible and idle", async () => {
    visibility.inView = true;
    const current = mockAlerts({ hasNextPage: true });
    mount();
    await waitFor(() => expect(current.fetchNextPage).toHaveBeenCalledTimes(1));
  });

  it("preserves rows and stops automatic pagination after errors, allowing explicit retry", () => {
    visibility.inView = true;
    const current = mockAlerts({
      hasNextPage: true, isError: true, isFetchNextPageError: true,
      error: new Error("Next page unavailable"),
    });
    mount();
    expect(current.fetchNextPage).not.toHaveBeenCalled();
    expect(screen.getByText("Already loaded alerts are still shown.")).toBeTruthy();
    expect(screen.getByText("Person a")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Retry loading more" })[0]);
    expect(current.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(current.refetch).not.toHaveBeenCalled();
  });

  it("does not auto-paginate while another request is in flight", () => {
    visibility.inView = true;
    const current = mockAlerts({ hasNextPage: true, isFetching: true });
    mount();
    expect(current.fetchNextPage).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Refresh" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

// ── Alert filters (new UX) ────────────────────────────────────────────────
describe("server-side alert filters", () => {
  it("applies kind and disposition chips and resets", () => {
    mount();
    // Select "Rule" kind chip
    fireEvent.click(screen.getByRole("button", { name: "Rule" }));
    // Select "False positive" disposition chip
    fireEvent.click(screen.getByRole("button", { name: "False positive" }));
    expect(useAlerts).toHaveBeenLastCalledWith({ limit: 20 });

    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(useAlerts).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "rule", disposition: "false_positive" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useAlerts).toHaveBeenLastCalledWith({ limit: 20 });
  });

  it("applies Last 24 h preset and computes a recent since date", () => {
    const before = Date.now();
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Last 24 h" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    const lastCall = vi.mocked(useAlerts).mock.lastCall?.[0] as { created_since?: string };
    expect(lastCall?.created_since).toBeDefined();
    const sinceMs = new Date(lastCall.created_since!).getTime();
    const expectedMs = before - 24 * 60 * 60 * 1000;
    expect(sinceMs).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(sinceMs).toBeLessThanOrEqual(Date.now());
  });

  it("shows custom date inputs only when Custom… is selected and validates reversed dates", () => {
    mount();
    expect(screen.queryByLabelText("From")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Custom…" }));
    const sinceInput = screen.getByLabelText("From");
    const untilInput = screen.getByLabelText("Until");
    expect(sinceInput).toBeTruthy();

    fireEvent.change(sinceInput, { target: { value: "2026-09-25T10:00" } });
    fireEvent.change(untilInput, { target: { value: "2026-09-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByRole("alert").textContent).toContain("Start date must be before");
    expect(useAlerts).toHaveBeenLastCalledWith({ limit: 20 });
  });

  it("manual camera IDs section: hidden by default, accepts comma-separated IDs and deduplicates", () => {
    mount();
    expect(screen.queryByLabelText("Manual camera IDs")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Advanced: filter by raw camera IDs/i }));
    const input = screen.getByLabelText("Manual camera IDs");
    fireEvent.change(input, { target: { value: " a, b, a, , " } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(useAlerts).toHaveBeenLastCalledWith(
      expect.objectContaining({ camera_id: ["a", "b"] }),
    );
  });

  it("rejects more than 500 camera IDs without replacing applied filters", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Advanced: filter by raw camera IDs/i }));
    const input = screen.getByLabelText("Manual camera IDs");
    const cameras = Array.from({ length: 500 }, (_, i) => `camera-${i}`);
    fireEvent.change(input, { target: { value: cameras.join(",") } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(useAlerts).toHaveBeenLastCalledWith(expect.objectContaining({ camera_id: cameras }));

    fireEvent.change(input, { target: { value: [...cameras, "extra"].join(",") } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByRole("alert").textContent).toContain("no more than 500");
    expect(useAlerts).toHaveBeenLastCalledWith(expect.objectContaining({ camera_id: cameras }));
  });

  it("selects cameras from the multi-select popover and reflects them in the query", async () => {
    mockCameras([makeCamera("cam-1", "Front Door"), makeCamera("cam-2", "Parking")]);
    mount();
    // Open the camera combobox
    fireEvent.click(screen.getByRole("combobox", { name: "Select cameras" }));
    await screen.findByRole("listbox", { name: "Camera list" });
    // Pick "Front Door"
    fireEvent.click(screen.getByRole("option", { name: /Front Door/ }));
    // Close and apply
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(useAlerts).toHaveBeenLastCalledWith(
      expect.objectContaining({ camera_id: ["cam-1"] }),
    );
  });
});