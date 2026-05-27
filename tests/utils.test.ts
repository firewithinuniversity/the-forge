import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatCurrency,
  formatCurrencyShort,
  formatCurrencyCompact,
  timeAgo,
  valueColor,
} from "@/lib/utils";

// ─── formatCurrency ───

describe("formatCurrency", () => {
  it("formats a positive number with two decimals", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a negative number with a leading minus sign", () => {
    expect(formatCurrency(-42)).toBe("-$42.00");
  });

  it("formats a large number with commas", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
  });

  it("handles small decimals", () => {
    expect(formatCurrency(0.1)).toBe("$0.10");
  });
});

// ─── formatCurrencyShort ───

describe("formatCurrencyShort", () => {
  it("delegates to formatCurrency for positive numbers", () => {
    expect(formatCurrencyShort(500)).toBe(formatCurrency(500));
  });

  it("delegates to formatCurrency for negative numbers", () => {
    expect(formatCurrencyShort(-500)).toBe(formatCurrency(-500));
  });

  it("delegates to formatCurrency for zero", () => {
    expect(formatCurrencyShort(0)).toBe(formatCurrency(0));
  });
});

// ─── formatCurrencyCompact ───

describe("formatCurrencyCompact", () => {
  it("formats numbers under 1000 with full currency format", () => {
    expect(formatCurrencyCompact(999)).toBe("$999.00");
  });

  it("formats exactly 1000 in compact form", () => {
    expect(formatCurrencyCompact(1000)).toBe("$1.0k");
  });

  it("formats large numbers in compact form", () => {
    expect(formatCurrencyCompact(2500)).toBe("$2.5k");
  });

  it("formats negative numbers over 1000 in compact form", () => {
    expect(formatCurrencyCompact(-1500)).toBe("-$1.5k");
  });

  it("formats negative numbers under 1000 with full currency format", () => {
    expect(formatCurrencyCompact(-500)).toBe("-$500.00");
  });

  it("formats zero with full currency format", () => {
    expect(formatCurrencyCompact(0)).toBe("$0.00");
  });

  it("formats very large numbers in compact form", () => {
    expect(formatCurrencyCompact(150000)).toBe("$150.0k");
  });
});

// ─── timeAgo ───

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than a minute ago', () => {
    const now = new Date("2025-06-01T12:00:00Z");
    vi.setSystemTime(now);
    const thirtySecondsAgo = new Date("2025-06-01T11:59:30Z").toISOString();
    expect(timeAgo(thirtySecondsAgo)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = new Date("2025-06-01T12:00:00Z");
    vi.setSystemTime(now);
    const fiveMinutesAgo = new Date("2025-06-01T11:55:00Z").toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const now = new Date("2025-06-01T12:00:00Z");
    vi.setSystemTime(now);
    const threeHoursAgo = new Date("2025-06-01T09:00:00Z").toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const now = new Date("2025-06-01T12:00:00Z");
    vi.setSystemTime(now);
    const twoDaysAgo = new Date("2025-05-30T12:00:00Z").toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("returns 1m ago at exactly 60 seconds", () => {
    const now = new Date("2025-06-01T12:00:00Z");
    vi.setSystemTime(now);
    const oneMinuteAgo = new Date("2025-06-01T11:59:00Z").toISOString();
    expect(timeAgo(oneMinuteAgo)).toBe("1m ago");
  });
});

// ─── valueColor ───

describe("valueColor", () => {
  it("returns green class for positive numbers", () => {
    expect(valueColor(100)).toBe("text-[#22C55E]");
  });

  it("returns red class for negative numbers", () => {
    expect(valueColor(-50)).toBe("text-[#EF4444]");
  });

  it("returns gray class for zero", () => {
    expect(valueColor(0)).toBe("text-[#606070]");
  });

  it("accepts custom positive color", () => {
    expect(valueColor(10, { positive: "text-emerald-500" })).toBe("text-emerald-500");
  });

  it("accepts custom negative color", () => {
    expect(valueColor(-10, { negative: "text-rose-500" })).toBe("text-rose-500");
  });

  it("accepts custom zero color", () => {
    expect(valueColor(0, { zero: "text-neutral-400" })).toBe("text-neutral-400");
  });

  it("uses defaults for unspecified custom opts", () => {
    expect(valueColor(5, { negative: "custom" })).toBe("text-[#22C55E]");
    expect(valueColor(-5, { positive: "custom" })).toBe("text-[#EF4444]");
  });
});
