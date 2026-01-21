import { describe, expect, it } from "vitest";
import { navigationForRole } from "@/components/layout/AppShell";

describe("role navigation", () => {
  it("keeps administration links away from students", () => {
    const paths = navigationForRole("STUDENT").map((item) => item.to);
    expect(paths).toContain("/bookings");
    expect(paths).not.toContain("/users");
    expect(paths).not.toContain("/approvals");
  });

  it("gives administrators all operational sections", () => {
    const paths = navigationForRole("ADMIN").map((item) => item.to);
    expect(paths).toEqual(
      expect.arrayContaining(["/users", "/approvals", "/routines", "/classrooms", "/resources"]),
    );
  });

  it("restricts temporary-password accounts to profile settings", () => {
    expect(navigationForRole("ADMIN", true).map((item) => item.to)).toEqual(["/profile"]);
  });
});
