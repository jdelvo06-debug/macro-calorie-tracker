import { describe, expect, it } from "vitest";

import {
  addDays,
  isDateKey,
  parseDateKey,
  toDateKey,
  toFriendlyDate,
} from "./date";

describe("date utilities", () => {
  it("formats date keys using the provided timezone instead of UTC", () => {
    const value = new Date("2026-04-12T04:30:00Z");

    expect(toDateKey(value, "America/Chicago")).toBe("2026-04-11");
    expect(toDateKey(value, "UTC")).toBe("2026-04-12");
  });

  it("adds days without drifting across timezone edges", () => {
    expect(addDays("2026-04-11", 1)).toBe("2026-04-12");
    expect(addDays("2026-04-11", -2)).toBe("2026-04-09");
  });

  it("accepts only canonical date keys", () => {
    expect(isDateKey("2026-04-11")).toBe(true);
    expect(isDateKey("2026-4-11")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
  });

  it("parses canonical date keys and rejects invalid ones", () => {
    expect(parseDateKey("2026-04-11")).toEqual(new Date("2026-04-11T12:00:00"));
    expect(parseDateKey("bad-date")).toBeNull();
  });

  it("formats friendly labels from date keys", () => {
    expect(toFriendlyDate("2026-04-11")).toBe("Saturday, Apr 11");
  });
});
