import { afterEach, describe, expect, it, vi } from "vitest";

const auth = {
  accessToken: "fresh-access-token",
  expiresInSeconds: 900,
  user: {
    id: 1,
    email: "leo@example.com",
    displayName: "Leo",
    role: "STUDENT" as const,
    mustChangePassword: false,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("authentication recovery", () => {
  it("restores an authenticated session from the refresh cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(auth), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("@/services/api");

    await expect(api.restoreSession()).resolves.toEqual(auth);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/auth/refresh");
  });

  it("coalesces parallel 401 recovery into one refresh request", async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/refresh")) {
        refreshCalls += 1;
        return new Response(JSON.stringify(auth), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      protectedCalls += 1;
      const bearer = new Headers(init?.headers).get("Authorization");
      if (!bearer) return new Response("{}", { status: 401 });
      return new Response(JSON.stringify({ ...auth.user, createdAt: "2026-01-01T00:00:00Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("@/services/api");

    const [first, second] = await Promise.all([api.getMe(), api.getMe()]);

    expect(first.id).toBe(1);
    expect(second.id).toBe(1);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(4);
  });
});
