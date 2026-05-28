"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import PageHeader from "../components/ui/PageHeader";

interface CalendarEvent {
  type: "task" | "phase_start" | "phase_end" | "tax" | "recurring" | "distribution" | "meeting" | "note" | "deadline" | "other";
  title: string;
  date: string;
  endDate?: string | null;
  allDay?: boolean;
  color?: string;
  projectId?: string;
  status?: string;
  paid?: boolean;
  calendarEventId?: string;
  description?: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  color: string;
}

type ViewMode = "month" | "week";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting: "#3B82F6",
  note: "#A855F7",
  deadline: "#EF4444",
  other: "#E8501A",
};

function getEventColor(event: CalendarEvent): string {
  if (event.calendarEventId) {
    return event.color || EVENT_TYPE_COLORS[event.type] || "#E8501A";
  }
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
    case "task": return "Task";
    case "phase_start": return "Phase Start";
    case "phase_end": return "Phase End";
    case "tax": return "Tax";
    case "recurring": return "Recurring";
    case "distribution": return "Distribution";
    case "meeting": return "Meeting";
    case "note": return "Note";
    case "deadline": return "Deadline";
    case "other": return "Event";
    default: return "";
  }
}

function getEventIcon(type: string): string {
  switch (type) {
    case "meeting": return "🗓";
    case "note": return "📝";
    case "deadline": return "⏰";
    case "other": return "📌";
    default: return "";
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

function toLocalDatetimeValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
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
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const today = useMemo(() => new Date(), []);

  // Fetch projects for the dropdown
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const opts = (Array.isArray(data) ? data : []).map((p: { id: string; name: string; color: string }) => ({
          id: p.id,
          name: p.name,
          color: p.color,
        }));
        setProjects(opts);
      })
      .catch(() => {});
  }, []);

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

  const handleNewEventOnDate = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
    setEditingEvent(null);
    setShowNewEvent(true);
  }, []);

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setShowNewEvent(true);
  }, []);

  const handleDeleteEvent = useCallback(async (calendarEventId: string) => {
    try {
      const res = await fetch(`/api/calendar-events/${calendarEventId}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvents(month, year);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }, [month, year, fetchEvents]);

  const handleSaveEvent = useCallback(async (data: {
    title: string;
    description: string;
    type: string;
    date: string;
    endDate: string;
    allDay: boolean;
    color: string;
    projectId: string;
    reminderEnabled?: boolean;
    reminderOffset?: number; // minutes before event
  }) => {
    try {
      if (editingEvent?.calendarEventId) {
        // Update existing
        const res = await fetch(`/api/calendar-events/${editingEvent.calendarEventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            description: data.description || null,
            type: data.type,
            date: new Date(data.date).toISOString(),
            endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
            allDay: data.allDay,
            color: data.color,
            projectId: data.projectId || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to update event");
          return;
        }
      } else {
        // Create new
        const res = await fetch("/api/calendar-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            description: data.description || null,
            type: data.type,
            date: new Date(data.date).toISOString(),
            endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
            allDay: data.allDay,
            color: data.color,
            projectId: data.projectId || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to create event");
          return;
        }
      }

      // Create reminder if enabled
      if (data.reminderEnabled && data.reminderOffset != null) {
        const eventDate = new Date(data.date);
        const remindAt = new Date(eventDate.getTime() - data.reminderOffset * 60 * 1000);
        // Only create reminder if remind time is in the future
        if (remindAt.getTime() > Date.now()) {
          const eventTime = eventDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          const reminderMessage = data.description
            ? data.description
            : `${data.type === "meeting" ? "Meeting" : "Event"} starts at ${eventTime}`;
          try {
            await fetch("/api/reminders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `\u{1F5D3} ${data.title}`,
                message: reminderMessage,
                remindAt: remindAt.toISOString(),
                link: "/calendar",
              }),
            });
          } catch (reminderErr) {
            console.error("Failed to create reminder:", reminderErr);
          }
        }
      }

      setShowNewEvent(false);
      setEditingEvent(null);
      fetchEvents(month, year);
    } catch (err) {
      console.error("Failed to save event:", err);
    }
  }, [editingEvent, month, year, fetchEvents]);

  // Build month grid
  const monthGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      cells.push({ date: d, inMonth: false });
    }

    for (let i = 1; i <= totalDays; i++) {
      cells.push({ date: new Date(year, month - 1, i), inMonth: true });
    }

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
        description="Deadlines, milestones, meetings, and notes in one place"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingEvent(null);
                setShowNewEvent(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#E8501A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#F06A30] transition-colors active:scale-[0.97]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Event
            </button>
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
              onAddEvent={handleNewEventOnDate}
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
        {selectedDate && !showNewEvent && (
          <div className="w-80 shrink-0">
            <DetailPanel
              dateKey={selectedDate}
              events={selectedEvents}
              onClose={() => setSelectedDate(null)}
              onAddEvent={() => handleNewEventOnDate(selectedDate)}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </div>
        )}

        {/* New / Edit event form */}
        {showNewEvent && (
          <div className="w-80 shrink-0">
            <EventForm
              initialDate={selectedDate}
              editingEvent={editingEvent}
              projects={projects}
              onSave={handleSaveEvent}
              onCancel={() => {
                setShowNewEvent(false);
                setEditingEvent(null);
              }}
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
          Tax / Deadlines
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
          Recurring Expenses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
          Distributions
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
          Meetings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#A855F7]" />
          Notes
        </span>
      </div>
    </div>
  );
}

/* ─── Event Form ───────────────────────────────────────────────────────── */

function EventForm({
  initialDate,
  editingEvent,
  projects,
  onSave,
  onCancel,
}: {
  initialDate: string | null;
  editingEvent: CalendarEvent | null;
  projects: ProjectOption[];
  onSave: (data: {
    title: string;
    description: string;
    type: string;
    date: string;
    endDate: string;
    allDay: boolean;
    color: string;
    projectId: string;
    reminderEnabled?: boolean;
    reminderOffset?: number;
  }) => void;
  onCancel: () => void;
}) {
  const defaultDate = useMemo(() => {
    if (editingEvent) {
      return toLocalDatetimeValue(new Date(editingEvent.date));
    }
    if (initialDate) {
      const [y, m, d] = initialDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d, 9, 0);
      return toLocalDatetimeValue(dt);
    }
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return toLocalDatetimeValue(now);
  }, [initialDate, editingEvent]);

  const defaultEndDate = useMemo(() => {
    if (editingEvent?.endDate) {
      return toLocalDatetimeValue(new Date(editingEvent.endDate));
    }
    return "";
  }, [editingEvent]);

  const [title, setTitle] = useState(editingEvent?.title || "");
  const [description, setDescription] = useState(editingEvent?.description || "");
  const [type, setType] = useState(editingEvent?.type || "meeting");
  const [date, setDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [allDay, setAllDay] = useState(editingEvent?.allDay || false);
  const [color, setColor] = useState(editingEvent?.color || EVENT_TYPE_COLORS[editingEvent?.type || "meeting"] || "#3B82F6");
  const [projectId, setProjectId] = useState(editingEvent?.projectId || "");
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(15); // minutes before

  // Determine if event date is in the future (for showing reminder option)
  const eventDateInFuture = useMemo(() => {
    if (!date) return false;
    const eventDate = new Date(date);
    return eventDate.getTime() > Date.now();
  }, [date]);

  // Update color when type changes (only for new events)
  useEffect(() => {
    if (!editingEvent) {
      setColor(EVENT_TYPE_COLORS[type] || "#E8501A");
    }
  }, [type, editingEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description,
      type,
      date,
      endDate,
      allDay,
      color,
      projectId,
      reminderEnabled: reminderEnabled && eventDateInFuture,
      reminderOffset,
    });
    setSaving(false);
  };

  const isEditing = !!editingEvent?.calendarEventId;

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#0F0F11] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
        <h3 className="text-sm font-medium text-[#FAFAFA]">
          {isEditing ? "Edit Event" : "New Event"}
        </h3>
        <button
          onClick={onCancel}
          className="text-[#52525B] hover:text-[#A1A1AA] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {/* Type selector */}
        <div className="grid grid-cols-4 gap-1.5">
          {(["meeting", "note", "deadline", "other"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-medium transition-all ${
                type === t
                  ? "border-[#E8501A] bg-[#E8501A]/10 text-[#FAFAFA]"
                  : "border-[#27272A] text-[#52525B] hover:border-[#3F3F46] hover:text-[#A1A1AA]"
              }`}
            >
              <span className="text-sm">{getEventIcon(t)}</span>
              <span className="capitalize">{t === "other" ? "Other" : t}</span>
            </button>
          ))}
        </div>

        {/* Title */}
        <div>
          <input
            type="text"
            placeholder={type === "meeting" ? "Meeting title..." : type === "note" ? "Note title..." : "Event title..."}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:outline-none transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* All day toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A] focus:ring-offset-0"
          />
          <span className="text-xs text-[#A1A1AA]">All day</span>
        </label>

        {/* Date / Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1">
              {allDay ? "Date" : "Start"}
            </label>
            <input
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? date.split("T")[0] : date}
              onChange={(e) => setDate(allDay ? `${e.target.value}T09:00` : e.target.value)}
              required
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none transition-colors [color-scheme:dark]"
            />
          </div>
          {!allDay && (
            <div>
              <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1">
                End
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none transition-colors [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {/* Project link */}
        <div>
          <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1">
            Project (optional)
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none transition-colors [color-scheme:dark]"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1">
            Color
          </label>
          <div className="flex gap-2">
            {["#3B82F6", "#A855F7", "#EF4444", "#E8501A", "#22C55E", "#F59E0B", "#EC4899", "#E8A020"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition-all ${
                  color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Reminder */}
        {eventDateInFuture && (
          <div className="rounded-lg border border-[#27272A] p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#27272A] bg-[#09090B] text-[#E8501A] focus:ring-[#E8501A] focus:ring-offset-0"
              />
              <span className="text-xs text-[#A1A1AA] flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                Set reminder
              </span>
            </label>
            {reminderEnabled && (
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "15m before", value: 15 },
                  { label: "1h before", value: 60 },
                  { label: "1d before", value: 1440 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReminderOffset(opt.value)}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      reminderOffset === opt.value
                        ? "bg-[#E8501A]/15 text-[#E8501A] border border-[#E8501A]/40"
                        : "bg-[#1A1A1E] text-[#52525B] border border-[#27272A] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#3F3F46] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!title.trim() || !date || saving}
          className="w-full rounded-lg bg-[#E8501A] px-3 py-2 text-sm font-medium text-white hover:bg-[#F06A30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          {saving ? "Saving..." : isEditing ? "Update Event" : "Add Event"}
        </button>
      </form>
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
  onAddEvent,
}: {
  cells: { date: Date; inMonth: boolean }[];
  eventsByDate: Record<string, CalendarEvent[]>;
  today: Date;
  currentMonth: number;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  onAddEvent: (dateKey: string) => void;
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
            <div
              key={i}
              className={`group relative min-h-[90px] border-b border-r border-[#27272A]/50 p-1.5 text-left transition-colors hover:bg-[#1A1A1E]/50 ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isSelected ? "bg-[#1A1A1E]" : ""}`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSelectDate(key)}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-[#E8501A] text-white font-semibold"
                      : isCurrentMonth
                      ? "text-[#FAFAFA]"
                      : "text-[#52525B]"
                  }`}
                >
                  {cell.date.getDate()}
                </button>
                {isCurrentMonth && (
                  <button
                    onClick={() => onAddEvent(key)}
                    className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-[#52525B] hover:text-[#E8501A] hover:bg-[#E8501A]/10 transition-all"
                    title="Add event"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Event dots/pills */}
              <div className="mt-1 flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((event, j) => (
                  <button
                    key={j}
                    onClick={() => onSelectDate(key)}
                    className="truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium text-left"
                    style={{
                      backgroundColor: `${getEventColor(event)}20`,
                      color: getEventColor(event),
                      opacity: getEventOpacity(event),
                    }}
                    title={event.title}
                  >
                    {event.calendarEventId && <span className="mr-0.5">{getEventIcon(event.type)}</span>}
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-[#52525B] px-1">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
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
                  const href = event.calendarEventId ? null : getEventHref(event);
                  const content = (
                    <div
                      className="rounded-lg px-2 py-1.5 text-xs transition-colors hover:brightness-110 cursor-pointer"
                      style={{
                        backgroundColor: `${getEventColor(event)}15`,
                        borderLeft: `3px solid ${getEventColor(event)}`,
                        opacity: getEventOpacity(event),
                      }}
                      onClick={!href ? () => onSelectDate(key) : undefined}
                    >
                      <div className="font-medium truncate" style={{ color: getEventColor(event) }}>
                        {event.calendarEventId && <span className="mr-0.5">{getEventIcon(event.type)}</span>}
                        {event.title}
                      </div>
                      <div className="text-[10px] text-[#52525B] mt-0.5">
                        {getEventLabel(event)}
                        {event.type === "task" && event.status === "done" && " (done)"}
                        {event.type === "tax" && event.paid && " (paid)"}
                        {event.endDate && !event.allDay && (
                          <span className="ml-1">
                            {new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {" - "}
                            {new Date(event.endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
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
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}: {
  dateKey: string;
  events: CalendarEvent[];
  onClose: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (calendarEventId: string) => void;
}) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Inline reminder state for detail panel
  const [reminderEventId, setReminderEventId] = useState<string | null>(null);
  const [reminderSaving, setReminderSaving] = useState(false);

  const handleQuickReminder = useCallback(async (event: CalendarEvent, offsetMinutes: number) => {
    const eventDate = new Date(event.date);
    const remindAt = new Date(eventDate.getTime() - offsetMinutes * 60 * 1000);
    if (remindAt.getTime() <= Date.now()) {
      setReminderEventId(null);
      return;
    }
    setReminderSaving(true);
    try {
      const eventTime = eventDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const message = event.description
        ? event.description
        : `${event.type === "meeting" ? "Meeting" : "Event"} starts at ${eventTime}`;
      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `\u{1F5D3} ${event.title}`,
          message,
          remindAt: remindAt.toISOString(),
          link: "/calendar",
        }),
      });
      setReminderEventId(null);
    } catch (err) {
      console.error("Failed to create reminder:", err);
    } finally {
      setReminderSaving(false);
    }
  }, []);

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#0F0F11] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
        <h3 className="text-sm font-medium text-[#FAFAFA]">{formatted}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddEvent}
            className="flex h-6 w-6 items-center justify-center rounded text-[#52525B] hover:text-[#E8501A] hover:bg-[#E8501A]/10 transition-colors"
            title="Add event"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-[#52525B] hover:text-[#A1A1AA] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#52525B] mb-3">No events on this day</p>
            <button
              onClick={onAddEvent}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:border-[#E8501A] hover:text-[#E8501A] transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add meeting or note
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => {
              const href = event.calendarEventId ? null : getEventHref(event);
              const isCustom = !!event.calendarEventId;

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
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#FAFAFA] truncate">
                        {isCustom && <span className="mr-1">{getEventIcon(event.type)}</span>}
                        {event.title}
                      </div>
                      {event.description && (
                        <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{event.description}</p>
                      )}
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
                        {isCustom && event.endDate && !event.allDay && (
                          <span className="text-[10px] text-[#52525B]">
                            {new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {" - "}
                            {new Date(event.endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                        {isCustom && event.allDay && (
                          <span className="text-[10px] text-[#52525B]">All day</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isCustom && (
                        <>
                          {new Date(event.date).getTime() > Date.now() && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setReminderEventId(
                                  reminderEventId === event.calendarEventId ? null : event.calendarEventId!
                                );
                              }}
                              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                                reminderEventId === event.calendarEventId
                                  ? "text-[#E8501A] bg-[#E8501A]/10"
                                  : "text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#E8501A]/10"
                              }`}
                              title="Set reminder"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditEvent(event); }}
                            className="flex h-6 w-6 items-center justify-center rounded text-[#52525B] hover:text-[#FAFAFA] hover:bg-[#1A1A1E] transition-colors"
                            title="Edit"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm("Delete this event?")) {
                                onDeleteEvent(event.calendarEventId!);
                              }
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-[#52525B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                            title="Delete"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </>
                      )}
                      {href && (
                        <svg className="h-3.5 w-3.5 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {/* Inline reminder picker */}
                  {isCustom && reminderEventId === event.calendarEventId && (
                    <div className="mt-2 pt-2 border-t border-[#27272A]/50">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[#52525B] mr-0.5">Remind:</span>
                        {[
                          { label: "15m", value: 15 },
                          { label: "1hr", value: 60 },
                          { label: "1 day", value: 1440 },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickReminder(event, opt.value);
                            }}
                            disabled={reminderSaving}
                            className="rounded px-2 py-0.5 text-[10px] font-medium bg-[#1A1A1E] text-[#A1A1AA] border border-[#27272A] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] transition-colors disabled:opacity-50"
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setReminderEventId(null);
                          }}
                          className="text-[10px] text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] ml-auto transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
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
