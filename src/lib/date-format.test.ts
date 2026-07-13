import { afterEach, describe, expect, it, vi } from "vitest"
import { formatUtcDate, serializeUtcTimestamp } from "@/lib/date-format"

describe("deterministic UTC date formatting", () => {
  afterEach(() => vi.restoreAllMocks())

  it("always formats the same timestamp with the stable DD.MM.YYYY shape", () => {
    const timestamp = "2026-07-14T20:45:30.000Z"

    expect(formatUtcDate(timestamp)).toBe("14.07.2026")
    expect(formatUtcDate(new Date(timestamp))).toBe("14.07.2026")
  })

  it("uses UTC when the source timestamp includes another timezone", () => {
    expect(formatUtcDate("2026-07-14T23:30:00-04:00")).toBe("15.07.2026")
  })

  it("does not depend on runtime locale formatting", () => {
    vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(() => {
      throw new Error("Locale formatting must not be used")
    })

    expect(formatUtcDate("2026-07-14T00:00:00.000Z")).toBe("14.07.2026")
  })

  it.each(["", "not-a-date", new Date(Number.NaN)])(
    "handles an invalid date safely: %#",
    (value) => {
      expect(formatUtcDate(value)).toBe("—")
    }
  )

  it("serializes persisted timestamps to deterministic UTC ISO strings", () => {
    expect(serializeUtcTimestamp(new Date("2026-07-14T23:30:00+03:00"))).toBe(
      "2026-07-14T20:30:00.000Z"
    )
    expect(serializeUtcTimestamp(new Date(Number.NaN))).toBe("")
  })
})
