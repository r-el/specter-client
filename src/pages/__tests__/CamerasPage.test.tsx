import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuth } from "@/context/AuthContext";
import { useCameras } from "@/features/cameras/hooks/use-cameras";
import type { CameraDetails } from "@/features/cameras/api/cameras";
import { camera } from "@/test/camera-fixtures";
import CamerasPage from "../CamerasPage";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/features/cameras/hooks/use-cameras", () => ({ useCameras: vi.fn() }));
vi.mock("@/features/cameras/components/CameraCard", () => ({
  CameraCard: ({ camera: item }: { camera: CameraDetails }) => <div>{item.name}</div>,
}));
vi.mock("@/features/cameras/components/CameraEditor", () => ({ CameraEditor: () => null }));

const rows: CameraDetails[] = [
  camera,
  { ...camera, id: "cam-2", name: "Parking", location: "Garage", live_status: "running" },
  { ...camera, id: "cam-3", name: "Loading bay", location: null, live_status: null },
];

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { role: "admin" } } as never);
  vi.mocked(useCameras).mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  } as never);
});
afterEach(() => cleanup());

it("searches by camera name or location, filters status, and clears unmatched filters", () => {
  render(<CamerasPage />);
  expect(screen.getByText("Entrance")).toBeTruthy();
  expect(screen.getByText("Parking")).toBeTruthy();
  expect(screen.getByText("Loading bay")).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Search cameras"), { target: { value: "garage" } });
  expect(screen.getByText("Parking")).toBeTruthy();
  expect(screen.queryByText("Entrance")).toBeNull();
  expect(screen.queryByText("Loading bay")).toBeNull();

  fireEvent.change(screen.getByLabelText("Search cameras"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "unknown" } });
  expect(screen.getByText("Loading bay")).toBeTruthy();
  expect(screen.queryByText("Parking")).toBeNull();

  fireEvent.change(screen.getByLabelText("Search cameras"), { target: { value: "missing" } });
  expect(screen.getByText("No cameras match these filters.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByText("Entrance")).toBeTruthy();
  expect(screen.getByText("Showing 3 of 3 cameras.")).toBeTruthy();
});
