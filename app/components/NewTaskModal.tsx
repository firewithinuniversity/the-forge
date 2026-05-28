"use client";

import { useState, useEffect } from "react";
import type { TaskData } from "./TaskCard";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface Phase { id: string; name: string; }

interface NewTaskModalProps {
  projectId: string;
  phases: Phase[];
  initialStatus?: string;
  editingTask?: TaskData | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

export default function NewTaskModal({ projectId, phases, initialStatus = "todo", editingTask, onClose, onSaved }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!editingTask;

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || "");
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setAssignee(editingTask.assignee || "");
      setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split("T")[0] : "");
      setStartDate(editingTask.startDate ? new Date(editingTask.startDate).toISOString().split("T")[0] : "");
      setEndDate(editingTask.endDate ? new Date(editingTask.endDate).toISOString().split("T")[0] : "");
      setPhaseId(editingTask.phaseId || "");
    }
  }, [editingTask]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        status, priority,
        assignee: assignee || null,
        dueDate: dueDate || null,
        startDate: startDate || null,
        endDate: endDate || null,
        phaseId: phaseId || null,
        projectId,
      };
      const url = isEditing ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const res = await fetch(url, { method: isEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to save task"); }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!editingTask) return;
    if (!confirm("Delete this task?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      onSaved();
    } catch { setError("Failed to delete task"); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={true} onClose={onClose} title={isEditing ? "Edit Task" : "New Task"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}

        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Title <span className="text-red-400">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} placeholder="What needs to be done?" autoFocus />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClasses} resize-none`} placeholder="Add details..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClasses}>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClasses}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Assignee</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClasses}>
              <option value="">Unassigned</option>
              <option value="Brett">Brett</option>
              <option value="Jude">Jude</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClasses} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClasses} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClasses} />
          </div>
        </div>

        {phases.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Phase</label>
            <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={inputClasses}>
              <option value="">No phase</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            {isEditing && (
              <Button variant="danger" size="sm" type="button" onClick={handleDelete} disabled={saving}>Delete</Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEditing ? "Update" : "Create Task"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
