import { describe, expect, it } from "vitest"
import { isDashboardRouteActive } from "./DashboardNavigation"

describe("dashboard navigation matching", () => {
  it("matches exact routes and nested route segments", () => {
    expect(isDashboardRouteActive("/dashboard/projects", "/dashboard/projects")).toBe(true)
    expect(isDashboardRouteActive("/dashboard/projects/active", "/dashboard/projects")).toBe(true)
  })

  it("does not match routes that only share a string prefix", () => {
    expect(isDashboardRouteActive("/dashboard/projects-archive", "/dashboard/projects")).toBe(false)
    expect(isDashboardRouteActive("/dashboard/analytics-old", "/dashboard/analytics")).toBe(false)
  })

  it("keeps overview active only on the dashboard root", () => {
    expect(isDashboardRouteActive("/dashboard", "/dashboard")).toBe(true)
    expect(isDashboardRouteActive("/dashboard/projects", "/dashboard")).toBe(false)
  })
})
