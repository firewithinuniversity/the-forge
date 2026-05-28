/**
 * Shared utility functions and constants for The Forge
 */

// ─── Currency Formatting ───

export function formatCurrency(n: number): string {
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrencyShort(n: number): string {
  return formatCurrency(n);
}

export function formatCurrencyCompact(n: number): string {
  if (Math.abs(n) >= 1000) {
    return (n < 0 ? "-" : "") + "$" + (Math.abs(n) / 1000).toFixed(1) + "k";
  }
  return formatCurrency(n);
}

// ─── Shared CSS Classes ───

export const inputClasses =
  "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

// ─── Date Helpers ───

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("en-US", options || { month: "short", day: "numeric", year: "numeric" });
}

// ─── Status Helpers ───

export const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export const STATUS_COLORS: Record<string, string> = {
  todo: "bg-[#27272A] text-[#A1A1AA]",
  in_progress: "bg-blue-500/15 text-blue-400",
  review: "bg-amber-500/15 text-amber-400",
  done: "bg-green-500/15 text-green-400",
};

// ─── Value Color Helpers ───

export function valueColor(n: number, opts?: { positive?: string; negative?: string; zero?: string }): string {
  const { positive = "text-[#22C55E]", negative = "text-[#EF4444]", zero = "text-[#52525B]" } = opts || {};
  if (n > 0) return positive;
  if (n < 0) return negative;
  return zero;
}
