import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../AuthContext";
import * as authService from "../../services/authService";

vi.mock("../../services/authService");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe("AuthContext - loginWithGoogle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("successfully logs in with Google idToken", async () => {
    const mockUser = {
      id: "u-123",
      username: "guser",
      name: "Google User",
      email: "guser@example.com",
      role: "viewer" as const,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };

    vi.mocked(authService.loginWithGoogle).mockResolvedValueOnce({
      success: true,
      data: {
        token: "sample-jwt",
        user: mockUser,
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let response: { success: boolean; error?: string } | undefined;
    await act(async () => {
      response = await result.current.loginWithGoogle("valid-id-token");
    });

    expect(response?.success).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem("token")).toBe("sample-jwt");
    expect(localStorage.getItem("user")).toBe(JSON.stringify(mockUser));
  });

  it("handles failure when loginWithGoogle returns success: false", async () => {
    vi.mocked(authService.loginWithGoogle).mockResolvedValueOnce({
      success: false,
      error: "Google token invalid",
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    let response: { success: boolean; error?: string } | undefined;
    await act(async () => {
      response = await result.current.loginWithGoogle("invalid-id-token");
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe("Google token invalid");
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("token")).toBeNull();
  });
});
