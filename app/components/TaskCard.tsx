"use client";

import { useState } from "react";

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  order: number;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  assignee: string | null;
  phaseId: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskCardProps {
  task: TaskData;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onEdit: (task: TaskData) => void;
}

const PRIORITY_STYLES: Record<string, { classes: string; label: string }> = {
  low: { classes: "bg-[#27272A] text-[#A1A1AA]", label: "Low" },
  medium: { classes: "bg-blue-500/15 text-blue-400", label: "Med" },
  high: { classes: "bg-amber-500/15 text-amber-400", label: "High" },
  urgent: { classes: "bg-red-500/15 text-red-400", label: "Urgent" },
};

const STATUS_OPTIONS = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

function formatDueDate(dateStr: string): { text: string; className: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (diffDays < 0) return { text: formatted, className: "text-red-400" };
  if (diffDays <= 2) return { text: formatted, className: "text-amber-400" };
  return { text: formatted, className: "text-[#52525B]" };
}

export default function TaskCard({ task, onStatusChange, onEdit }: TaskCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

  return (
    <div
      className="group rounded-lg bg-[#0F0F11] border border-[#27272A] p-3 hover:border-[#3F3F46] transition-colors duration-150 cursor-pointer"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-[#FAFAFA] leading-snug flex-1">{task.title}</h4>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priority.classes}`}>
          {priority.label}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-[#A1A1AA] mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                task.assignee === "Brett" ? "bg-blue-600" : "bg-purple-600"
              }`}
              title={task.assignee}
            >
              {task.assignee.charAt(0)}
            </div>
          )}
          {task.dueDate && (
            <span className={`text-[11px] ${formatDueDate(task.dueDate).className}`}>
              {formatDueDate(task.dueDate).text}
            </span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-[#1A1A1E] text-[#52525B] hover:text-[#FAFAFA]"
            title="Move task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowStatusMenu(false); }} />
              <div className="absolute right-0 bottom-full mb-1 z-20 w-36 rounded-lg border border-[#27272A] bg-[#1A1A1E] shadow-xl overflow-hidden">
                {STATUS_OPTIONS.filter((s) => s.value !== task.status).map((s) => (
                  <button
                    key={s.value}
                    className="w-full text-left px-3 py-2 text-xs text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
                    onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, s.value); setShowStatusMenu(false); }}
                  >
                    Move to {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
