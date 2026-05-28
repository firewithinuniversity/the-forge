"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import PageHeader from "../components/ui/PageHeader";

interface CalendarEvent {
  type: "task" | "phase_start" | "phase_end" | "tax" | "recurring" | "distribution";
  title: string;
  date: string;
  color?: string;
  projectId?: string;
  status?: string;
  paid?: boolean;
}

type ViewMode = "month" | "week";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getEventColor(event: CalendarEvent): string {
  switch (event.type) {
    case "task":
      return event.color || "#E8A020";
    case "phase_start":
    case "phase_end":
      return event.color || "#E8A020";
    case "tax":
      return "#EF4444";
    case "recurring":
      return "#F59E0B";
    case "distribution":
      return "#22C55E";
    default:
      return "#A1A1AA";
  }
}

function getEventOpacity(event: CalendarEvent): number {
  if (event.type === "phase_start" || event.type === "phase_end") return 0.6;
  if (event.type === "task" && event.status === "done") return 0.5;
  if (event.type === "tax" && event.paid) return 0.5;
  return 1;
}

function getEventLabel(event: CalendarEvent): string {
  switch (event.type) {
    case "task":
      return "Task";
    case "phase_start":
      return "Phase Start";
    case "phase_end":
      return "Phase End";
    case "tax":
      return "Tax";
    case "recurring":
      return "Recurring";
    case "distribution":
      return "Distribution";
    default:
      return "";
  }
}

function getEventHref(event: CalendarEvent): string | null {
  switch (event.type) {
    case "task":
      return event.projectId ? `/projects/${event.projectId}` : null;
    case "phase_start":
    case "phase_end":
      return event.projectId ? `/projects/${event.projectId}` : null;
    case "tax":
      return "/finance/tax";
    case "recurring":
      return "/finance/recurring";
    case "distribution":
      return "/finance/distributions";
    default:
      return null;
  }
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CalendarClientProps {
  initialEvents: CalendarEvent[];
  initialMonth: number;
  initialYear: number;
}

export default function CalendarClient({ initialEvents, initialMonth, initialYear }: CalendarClientProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [view, setView] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const today = useMemo(() => new Date(), []);

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      const d = new Date(event.date);
      const key = formatDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  const fetchEvents = useCallback(async (m: number, y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${m}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePrev = useCallback(() => {
    if (view === "month") {
      const newMonth = month === 1 ? 12 : month - 1;
      const newYear = month === 1 ? year - 1 : year;
      setMonth(newMonth);
      setYear(newYear);
      setSelectedDate(null);
      fetchEvents(newMonth, newYear);
    } else {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() - 7);
      setWeekStart(newStart);
      // Fetch for the month this week falls in
      const midWeek = new Date(newStart);
      midWeek.setDate(midWeek.getDate() + 3);
      const wm = midWeek.getMonth() + 1;
      const wy = midWeek.getFullYear();
      if (wm !== month || wy !== year) {
        setMonth(wm);
        setYear(wy);
        fetchEvents(wm, wy);
      }
    }
  }, [view, month, year, weekStart, fetchEvents]);

  const handleNext = useCallback(() => {
    if (view === "month") {
      const newMonth = month === 12 ? 1 : month + 1;
      const newYear = month === 12 ? year + 1 : year;
      setMonth(newMonth);
      setYear(newYear);
      setSelectedDate(null);
      fetchEvents(newMonth, newYear);
    } else {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() + 7);
      setWeekStart(newStart);
      const midWeek = new Date(newStart);
      midWeek.setDate(midWeek.getDate() + 3);
      const wm = midWeek.getMonth() + 1;
      const wy = midWeek.getFullYear();
      if (wm !== month || wy !== year) {
        setMonth(wm);
        setYear(wy);
        fetchEvents(wm, wy);
      }
    }
  }, [view, month, year, weekStart, fetchEvents]);

  const handleToday = useCallback(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    setMonth(m);
    setYear(y);
    setSelectedDate(null);
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    setWeekStart(start);
    if (m !== month || y !== year) {
      fetchEvents(m, y);
    }
  }, [month, year, fetchEvents]);

  // Build month grid
  const monthGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      cells.push({ date: d, inMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push({ date: new Date(year, month - 1, i), inMonth: true });
    }

    // Trailing days to fill 6 rows if needed, always at least fill current row
    while (cells.length % 7 !== 0) {
      const lastDate = cells[cells.length - 1].date;
      const next = new Date(lastDate);
      next.setDate(next.getDate() + 1);
      cells.push({ date: next, inMonth: false });
    }

    return cells;
  }, [month, year]);

  // Build week view days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Calendar"
        description="All deadlines, milestones, and financial events in one place"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-[#27272A] overflow-hidden">
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "month"
                    ? "bg-[#1A1A1E] text-[#FAFAFA]"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1E]/50"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "week"
                    ? "bg-[#1A1A1E] text-[#FAFAFA]"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1E]/50"
                }`}
              >
                Week
              </button>
            </div>
          </div>
        }
      />

      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-lg font-medium text-[#FAFAFA] min-w-[180px] text-center">
            {view === "month"
              ? `${MONTH_NAMES[month - 1]} ${year}`
              : `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          </h2>
          <button
            onClick={handleNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={handleToday}
            className="ml-2 rounded-lg border border-[#27272A] px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA] transition-colors"
          >
            Today
          </button>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#52525B]">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#27272A] border-t-[#E8501A]" />
            Loading...
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          {view === "month" ? (
            <MonthView
              cells={monthGrid}
              eventsByDate={eventsByDate}
              today={today}
              currentMonth={month}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <WeekView
              days={weekDays}
              eventsByDate={eventsByDate}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedDate && (
          <div className="w-80 shrink-0">
            <DetailPanel
              dateKey={selectedDate}
              events={selectedEvents}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[#A1A1AA]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E8A020]" />
          Tasks / Phases
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
          Tax Payments
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
          Recurring Expenses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
          Distributions
        </span>
      </div>
    </div>
  );
}

/* ─── Month View ────────────────────────────────────────────────────────── */

function MonthView({
  cells,
  eventsByDate,
  today,
  currentMonth,
  selectedDate,
  onSelectDate,
}: {
  cells: { date: Date; inMonth: boolean }[];
  eventsByDate: Record<string, CalendarEvent[]>;
  today: Date;
  currentMonth: number;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#27272A] overflow-hidden bg-[#0F0F11]">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#27272A]">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="px-2 py-2.5 text-center text-xs font-medium text-[#52525B] uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const key = formatDateKey(cell.date);
          const dayEvents = eventsByDate[key] || [];
          const isToday = isSameDay(cell.date, today);
          const isSelected = selectedDate === key;
          const isCurrentMonth = cell.date.getMonth() + 1 === currentMonth;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(key)}
              className={`relative min-h-[90px] border-b border-r border-[#27272A]/50 p-1.5 text-left transition-colors hover:bg-[#1A1A1E]/50 ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isSelected ? "bg-[#1A1A1E]" : ""}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-[#E8501A] text-white font-semibold"
                    : isCurrentMonth
                    ? "text-[#FAFAFA]"
                    : "text-[#52525B]"
                }`}
              >
                {cell.date.getDate()}
              </span>

              {/* Event dots/pills */}
              <div className="mt-1 flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((event, j) => (
                  <div
                    key={j}
                    className="truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium"
                    style={{
                      backgroundColor: `${getEventColor(event)}20`,
                      color: getEventColor(event),
                      opacity: getEventOpacity(event),
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-[#52525B] px-1">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Week View ─────────────────────────────────────────────────────────── */

function WeekView({
  days,
  eventsByDate,
  today,
  selectedDate,
  onSelectDate,
}: {
  days: Date[];
  eventsByDate: Record<string, CalendarEvent[]>;
  today: Date;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#27272A] overflow-hidden bg-[#0F0F11]">
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const key = formatDateKey(day);
          const dayEvents = eventsByDate[key] || [];
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate === key;

          return (
            <div
              key={i}
              className={`border-r border-[#27272A]/50 last:border-r-0 ${
                isSelected ? "bg-[#1A1A1E]" : ""
              }`}
            >
              {/* Day header */}
              <button
                onClick={() => onSelectDate(key)}
                className={`w-full px-3 py-3 text-center border-b border-[#27272A] hover:bg-[#1A1A1E]/50 transition-colors ${
                  isToday ? "border-b-2 border-b-[#E8501A]" : ""
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-[#52525B] font-medium">
                  {DAYS_OF_WEEK[i]}
                </div>
                <div
                  className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? "bg-[#E8501A] text-white font-semibold"
                      : "text-[#FAFAFA]"
                  }`}
                >
                  {day.getDate()}
                </div>
              </button>

              {/* Events */}
              <div className="p-2 min-h-[200px] space-y-1.5">
                {dayEvents.map((event, j) => {
                  const href = getEventHref(event);
                  const content = (
                    <div
                      className="rounded-lg px-2 py-1.5 text-xs transition-colors hover:brightness-110"
                      style={{
                        backgroundColor: `${getEventColor(event)}15`,
                        borderLeft: `3px solid ${getEventColor(event)}`,
                        opacity: getEventOpacity(event),
                      }}
                    >
                      <div className="font-medium truncate" style={{ color: getEventColor(event) }}>
                        {event.title}
                      </div>
                      <div className="text-[10px] text-[#52525B] mt-0.5">
                        {getEventLabel(event)}
                        {event.type === "task" && event.status === "done" && " (done)"}
                        {event.type === "tax" && event.paid && " (paid)"}
                      </div>
                    </div>
                  );

                  return href ? (
                    <Link key={j} href={href}>{content}</Link>
                  ) : (
                    <div key={j}>{content}</div>
                  );
                })}
                {dayEvents.length === 0 && (
                  <div className="text-[10px] text-[#52525B]/50 text-center pt-4">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Detail Panel ──────────────────────────────────────────────────────── */

function DetailPanel({
  dateKey,
  events,
  onClose,
}: {
  dateKey: string;
  events: CalendarEvent[];
  onClose: () => void;
}) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#0F0F11] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
        <h3 className="text-sm font-medium text-[#FAFAFA]">{formatted}</h3>
        <button
          onClick={onClose}
          className="text-[#52525B] hover:text-[#A1A1AA] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {events.length === 0 ? (
          <p className="text-sm text-[#52525B]">No events on this day</p>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => {
              const href = getEventHref(event);
              const content = (
                <div
                  className="rounded-lg px-3 py-2.5 transition-colors hover:brightness-110"
                  style={{
                    backgroundColor: `${getEventColor(event)}10`,
                    borderLeft: `3px solid ${getEventColor(event)}`,
                    opacity: getEventOpacity(event),
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#FAFAFA] truncate">
                        {event.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${getEventColor(event)}20`,
                            color: getEventColor(event),
                          }}
                        >
                          {getEventLabel(event)}
                        </span>
                        {event.type === "task" && event.status && (
                          <span className="text-[10px] text-[#52525B] capitalize">
                            {event.status.replace("_", " ")}
                          </span>
                        )}
                        {event.type === "tax" && (
                          <span className={`text-[10px] ${event.paid ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                            {event.paid ? "Paid" : "Unpaid"}
                          </span>
                        )}
                      </div>
                    </div>
                    {href && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </div>
                </div>
              );

              return href ? (
                <Link key={i} href={href}>{content}</Link>
              ) : (
                <div key={i}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
