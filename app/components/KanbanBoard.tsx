"use client";

import { useState, useCallback } from "react";
import TaskCard, { type TaskData } from "./TaskCard";
import NewTaskModal from "./NewTaskModal";

interface Phase { id: string; name: string; }

interface KanbanBoardProps {
  projectId: string;
  tasks: TaskData[];
  phases: Phase[];
  activePhaseId: string | null;
  onRefresh: () => void;
}

const COLUMNS = [
  { status: "todo", label: "Todo", dot: "bg-[#52525B]", border: "border-t-[#52525B]" },
  { status: "in_progress", label: "In Progress", dot: "bg-blue-500", border: "border-t-blue-500" },
  { status: "review", label: "Review", dot: "bg-amber-500", border: "border-t-amber-500" },
  { status: "done", label: "Done", dot: "bg-green-500", border: "border-t-green-500" },
];

export default function KanbanBoard({ projectId, tasks, phases, activePhaseId, onRefresh }: KanbanBoardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState("todo");
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);

  const filteredTasks = activePhaseId === null ? tasks : tasks.filter((t) => t.phaseId === activePhaseId);

  const tasksByStatus = (status: string) =>
    filteredTasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) onRefresh();
    } catch { /* ignore */ }
  }, [onRefresh]);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-x-visible sm:pb-0">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.status);
          return (
            <div key={col.status} className={`rounded-xl bg-[#09090B] border border-[#27272A] border-t-2 ${col.border} min-h-[200px] min-w-[260px] sm:min-w-0 shrink-0 sm:shrink`}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <h3 className="text-sm font-semibold text-[#FAFAFA]">{col.label}</h3>
                  <span className="rounded-full bg-[#1A1A1E] px-2 py-0.5 text-[11px] font-medium text-[#A1A1AA]">{colTasks.length}</span>
                </div>
                <button
                  onClick={() => { setEditingTask(null); setModalInitialStatus(col.status); setModalOpen(true); }}
                  className="rounded-md p-1 text-[#52525B] hover:bg-[#1A1A1E] hover:text-[#E8501A] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-2 px-3 pb-3">
                {colTasks.length === 0 && <div className="py-8 text-center text-xs text-[#52525B]">No tasks</div>}
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onEdit={(t) => { setEditingTask(t); setModalInitialStatus(t.status); setModalOpen(true); }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <NewTaskModal
          projectId={projectId}
          phases={phases}
          initialStatus={modalInitialStatus}
          editingTask={editingTask}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
          onSaved={() => { setModalOpen(false); setEditingTask(null); onRefresh(); }}
        />
      )}
    </>
  );
}
