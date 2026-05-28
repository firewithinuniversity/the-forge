"use client";

import { useState, useMemo } from "react";
import PageHeader from "../components/ui/PageHeader";

interface TimelineTask {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  phaseId: string | null;
  assignee: string | null;
}

interface TimelinePhase {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

interface TimelineProject {
  id: string;
  name: string;
  color: string;
  phases: TimelinePhase[];
  tasks: TimelineTask[];
}

type ZoomLevel = "week" | "month" | "quarter";

const STATUS_COLORS: Record<string, string> = {
  todo: "#52525B",
  in_progress: "#3B82F6",
  review: "#F59E0B",
  done: "#22C55E",
};

export default function TimelineClient({ projects }: { projects: TimelineProject[] }) {
  const [zoom, setZoom] = useState<ZoomLevel>("month");

  const { dateRange, columns, dayWidth } = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date, cols: { label: string; date: Date; isToday?: boolean }[];
    const dw = zoom === "week" ? 40 : zoom === "month" ? 14 : 5;

    if (zoom === "week") {
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      end = new Date(start);
      end.setDate(end.getDate() + 28);
      cols = [];
      const d = new Date(start);
      while (d <= end) {
        const isToday = d.toDateString() === now.toDateString();
        cols.push({ label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), date: new Date(d), isToday });
        d.setDate(d.getDate() + 1);
      }
    } else if (zoom === "month") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 4, 0);
      cols = [];
      const d = new Date(start);
      while (d <= end) {
        const isToday = d.toDateString() === now.toDateString();
        cols.push({ label: d.getDate() === 1 ? d.toLocaleDateString("en-US", { month: "short" }) : "", date: new Date(d), isToday });
        d.setDate(d.getDate() + 1);
      }
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      cols = [];
      const d = new Date(start);
      while (d <= end) {
        const isToday = d.toDateString() === now.toDateString();
        cols.push({ label: d.getDate() === 1 ? d.toLocaleDateString("en-US", { month: "short" }) : "", date: new Date(d), isToday });
        d.setDate(d.getDate() + 1);
      }
    }

    return { dateRange: { start, end }, columns: cols, dayWidth: dw };
  }, [zoom]);

  const totalWidth = columns.length * dayWidth;

  function getBarStyle(start: string | null, end: string | null) {
    if (!start && !end) return null;
    const s = start ? new Date(start) : new Date();
    const e = end ? new Date(end) : new Date(s.getTime() + 86400000);
    const rangeStart = dateRange.start.getTime();
    const left = Math.max(0, ((s.getTime() - rangeStart) / 86400000) * dayWidth);
    const width = Math.max(dayWidth, ((e.getTime() - s.getTime()) / 86400000) * dayWidth);
    return { left, width };
  }

  const todayOffset = ((Date.now() - dateRange.start.getTime()) / 86400000) * dayWidth;

  const tasksWithDates = projects.flatMap((p) => p.tasks.filter((t) => t.startDate || t.endDate));

  return (
    <div className="px-6 py-8 max-w-full mx-auto">
      <PageHeader
        title="Timeline"
        description="Project and task schedule overview"
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-[#0F0F11] border border-[#27272A] p-1">
            {(["week", "month", "quarter"] as const).map((z) => (
              <button key={z} onClick={() => setZoom(z)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  zoom === z ? "bg-[#E8501A] text-black" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}>{z.charAt(0).toUpperCase() + z.slice(1)}</button>
            ))}
          </div>
        }
      />

      {tasksWithDates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#27272A] py-16 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1E] mb-3 text-[#52525B]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M2.25 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v11.25m-19.5 0A2.25 2.25 0 0 0 4.5 21h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v-2.25" />
            </svg>
          </div>
          <p className="text-sm text-[#A1A1AA]">No scheduled items</p>
          <p className="text-xs text-[#52525B]">Add start/end dates to tasks to see them here</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: totalWidth + 200 }}>
              {/* Header row with date columns */}
              <div className="flex border-b border-[#27272A]">
                <div className="w-[200px] shrink-0 px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-[#52525B] border-r border-[#27272A]">
                  Project / Task
                </div>
                <div className="relative flex-1" style={{ width: totalWidth }}>
                  <div className="flex">
                    {columns.filter((c) => c.label).map((col, i) => (
                      <div key={i} className="text-[11px] text-[#52525B] py-3 px-1 border-r border-[#27272A]/50"
                        style={{ position: "absolute", left: columns.indexOf(col) * dayWidth }}>
                        {col.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project swimlanes */}
              {projects.filter((p) => p.tasks.some((t) => t.startDate || t.endDate)).map((project) => (
                <div key={project.id}>
                  {/* Project header */}
                  <div className="flex border-b border-[#27272A] bg-[#09090B]/50">
                    <div className="w-[200px] shrink-0 px-4 py-2.5 flex items-center gap-2 border-r border-[#27272A]">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="text-sm font-medium text-[#FAFAFA] truncate">{project.name}</span>
                    </div>
                    <div className="relative flex-1" style={{ width: totalWidth, height: 36 }}>
                      {/* Today line */}
                      {todayOffset > 0 && todayOffset < totalWidth && (
                        <div className="absolute top-0 bottom-0 w-px bg-[#E8501A]/50 z-10" style={{ left: todayOffset }} />
                      )}
                    </div>
                  </div>

                  {/* Task rows */}
                  {project.tasks.filter((t) => t.startDate || t.endDate).map((task) => {
                    const bar = getBarStyle(task.startDate, task.endDate);
                    if (!bar) return null;
                    return (
                      <div key={task.id} className="flex border-b border-[#27272A]/50 hover:bg-[#1A1A1E]/50 transition-colors">
                        <div className="w-[200px] shrink-0 px-4 py-2 pl-8 border-r border-[#27272A]">
                          <span className="text-xs text-[#A1A1AA] truncate block">{task.title}</span>
                        </div>
                        <div className="relative flex-1" style={{ width: totalWidth, height: 32 }}>
                          <div
                            className="absolute top-1.5 h-5 rounded-md flex items-center px-2 text-[10px] font-medium text-white truncate"
                            style={{
                              left: bar.left,
                              width: Math.min(bar.width, totalWidth - bar.left),
                              backgroundColor: STATUS_COLORS[task.status] || "#52525B",
                              opacity: 0.85,
                            }}
                          >
                            {bar.width > 60 ? task.title : ""}
                          </div>
                          {todayOffset > 0 && todayOffset < totalWidth && (
                            <div className="absolute top-0 bottom-0 w-px bg-[#E8501A]/30" style={{ left: todayOffset }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-[#27272A]">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-[#52525B] capitalize">{status.replace("_", " ")}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-4">
              <div className="h-4 w-px bg-[#E8501A]" />
              <span className="text-[11px] text-[#52525B]">Today</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
