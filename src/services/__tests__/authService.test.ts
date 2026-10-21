import { describe, expect, it, vi, beforeEach } from "vitest";
import api from "../api";
import {
  loginUser,
  registerUser,
  loginWithGoogle,
  getCurrentUser,
  logoutUser,
  verifyCode,
  resendCode,
} from "../authService";

vi.mock("../api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loginWithGoogle calls /auth/google with idToken and returns response data", async () => {
    const mockData = {
      success: true,
      message: "Google login successful",
      data: {
        token: "fake-jwt-token",
        user: {
          id: "1",
          username: "testuser",
          name: "Test User",
          email: "test@example.com",
          role: "viewer" as const,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      },
    };

    vi.mocked(api.post).mockResolvedValueOnce({ data: mockData });

    const result = await loginWithGoogle("google-sample-id-token");

    expect(api.post).toHaveBeenCalledWith("/auth/google", {
      idToken: "google-sample-id-token",
    });
    expect(result).toEqual(mockData);
  });

  it("loginUser calls /auth/login with credentials", async () => {
    const mockResponse = { success: true, data: { token: "tok", user: {} } };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

    const result = await loginUser({ username: "user", password: "pwd" });
    expect(api.post).toHaveBeenCalledWith("/auth/login", { username: "user", password: "pwd" });
    expect(result).toEqual(mockResponse);
  });

  it("registerUser calls /auth/register with user info", async () => {
    const mockResponse = { success: true, data: { token: "tok", user: {} } };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

    const result = await registerUser({
      username: "user",
      name: "User",
      email: "user@test.com",
      password: "pwd",
    });
    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      username: "user",
      name: "User",
      email: "user@test.com",
      password: "pwd",
    });
    expect(result).toEqual(mockResponse);
  });

  it("getCurrentUser calls GET /auth/me", async () => {
    const mockResponse = { success: true, data: { id: "1", username: "user" } };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse });

    const result = await getCurrentUser();
    expect(api.get).toHaveBeenCalledWith("/auth/me");
    expect(result).toEqual(mockResponse);
  });

  it("logoutUser calls POST /auth/logout", async () => {
    const mockResponse = { success: true };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

    const result = await logoutUser();
    expect(api.post).toHaveBeenCalledWith("/auth/logout");
    expect(result).toEqual(mockResponse);
  });

  it("verifyCode calls POST /auth/verify-code", async () => {
    const mockResponse = { success: true };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

    const result = await verifyCode("test@test.com", "123456");
    expect(api.post).toHaveBeenCalledWith("/auth/verify-code", {
      email: "test@test.com",
      code: "123456",
    });
    expect(result).toEqual(mockResponse);
  });

  it("resendCode calls POST /auth/resend-code", async () => {
    const mockResponse = { success: true, message: "Code sent" };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse });

    const result = await resendCode("test@test.com");
    expect(api.post).toHaveBeenCalledWith("/auth/resend-code", { email: "test@test.com" });
    expect(result).toEqual(mockResponse);
  });
});
