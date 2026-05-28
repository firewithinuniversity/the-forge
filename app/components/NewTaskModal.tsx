"use client";

import { useState, useEffect, useCallback } from "react";
import type { TaskData } from "./TaskCard";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface Phase { id: string; name: string; }

interface SubtaskData {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  taskId: string;
  createdAt: string;
}

interface CommentData {
  id: string;
  content: string;
  author: string;
  taskId: string;
  createdAt: string;
}

interface NewTaskModalProps {
  projectId: string;
  phases: Phase[];
  initialStatus?: string;
  editingTask?: TaskData | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

type DetailTab = "subtasks" | "comments";

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

  // Subtask + comment state
  const [detailTab, setDetailTab] = useState<DetailTab>("subtasks");
  const [subtasks, setSubtasks] = useState<SubtaskData[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Brett");
  const [loadingDetails, setLoadingDetails] = useState(false);

  const isEditing = !!editingTask;

  const fetchSubtasks = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (res.ok) setSubtasks(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchComments = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch { /* ignore */ }
  }, []);

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

      // Fetch subtasks and comments
      setLoadingDetails(true);
      Promise.all([fetchSubtasks(editingTask.id), fetchComments(editingTask.id)])
        .finally(() => setLoadingDetails(false));
    }
  }, [editingTask, fetchSubtasks, fetchComments]);

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

  // ── Subtask handlers ─────────────────────────────────────────────
  async function addSubtask() {
    if (!editingTask || !newSubtaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      if (res.ok) {
        setNewSubtaskTitle("");
        fetchSubtasks(editingTask.id);
      }
    } catch { /* ignore */ }
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    if (!editingTask) return;
    try {
      await fetch(`/api/tasks/${editingTask.id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      fetchSubtasks(editingTask.id);
    } catch { /* ignore */ }
  }

  async function deleteSubtask(subtaskId: string) {
    if (!editingTask) return;
    try {
      await fetch(`/api/tasks/${editingTask.id}/subtasks/${subtaskId}`, { method: "DELETE" });
      fetchSubtasks(editingTask.id);
    } catch { /* ignore */ }
  }

  // ── Comment handlers ─────────────────────────────────────────────
  async function addComment() {
    if (!editingTask || !newComment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim(), author: commentAuthor }),
      });
      if (res.ok) {
        setNewComment("");
        fetchComments(editingTask.id);
      }
    } catch { /* ignore */ }
  }

  async function deleteComment(commentId: string) {
    if (!editingTask) return;
    try {
      await fetch(`/api/tasks/${editingTask.id}/comments/${commentId}`, { method: "DELETE" });
      fetchComments(editingTask.id);
    } catch { /* ignore */ }
  }

  return (
    <Modal open={true} onClose={onClose} title={isEditing ? "Edit Task" : "New Task"} maxWidth="sm:max-w-2xl">
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

        {/* ── Subtasks & Comments section (edit mode only) ──────────── */}
        {isEditing && (
          <div className="border-t border-[#27272A] pt-4 mt-4">
            {/* Tab switcher */}
            <div className="flex items-center gap-1 mb-3">
              <button
                type="button"
                onClick={() => setDetailTab("subtasks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  detailTab === "subtasks"
                    ? "bg-[#E8501A]/15 text-[#E8501A]"
                    : "text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E]"
                }`}
              >
                Subtasks
                {subtasks.length > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("comments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  detailTab === "comments"
                    ? "bg-[#E8501A]/15 text-[#E8501A]"
                    : "text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E]"
                }`}
              >
                Comments
                {comments.length > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">{comments.length}</span>
                )}
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-6 text-center text-xs text-[#52525B]">Loading...</div>
            ) : detailTab === "subtasks" ? (
              /* ── Subtasks panel ──────────────────────────────────── */
              <div className="space-y-2">
                {subtasks.length === 0 && (
                  <p className="text-xs text-[#52525B] py-2">No subtasks yet. Break this task into smaller steps.</p>
                )}
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 group/st animate-fade-in"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubtask(st.id, st.completed)}
                      className={`shrink-0 h-4.5 w-4.5 rounded border transition-colors flex items-center justify-center ${
                        st.completed
                          ? "bg-[#E8501A] border-[#E8501A]"
                          : "border-[#3F3F46] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#E8501A]"
                      }`}
                    >
                      {st.completed && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm transition-colors ${
                      st.completed ? "text-[#52525B] line-through" : "text-[#FAFAFA]"
                    }`}>
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubtask(st.id)}
                      className="opacity-0 group-hover/st:opacity-100 shrink-0 rounded p-0.5 text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-red-400 transition-all"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {/* Add subtask input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                    placeholder="Add a subtask..."
                    className="flex-1 rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-1.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors"
                  />
                  <Button type="button" size="sm" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>Add</Button>
                </div>
              </div>
            ) : (
              /* ── Comments panel ──────────────────────────────────── */
              <div className="space-y-3">
                {comments.length === 0 && (
                  <p className="text-xs text-[#52525B] py-2">No comments yet. Start a conversation about this task.</p>
                )}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 animate-fade-in group/cm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            c.author === "Brett" ? "bg-blue-600" : "bg-purple-600"
                          }`}>
                            {c.author.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-[#FAFAFA]">{c.author}</span>
                          <span className="text-[10px] text-[#52525B]">
                            {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" "}
                            {new Date(c.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteComment(c.id)}
                          className="opacity-0 group-hover/cm:opacity-100 shrink-0 rounded p-0.5 text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-red-400 transition-all"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-[#A1A1AA] whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
                {/* Add comment form */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      className="rounded-lg bg-[#09090B] border border-[#27272A] px-2 py-1.5 text-xs text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none transition-colors"
                    >
                      <option value="Brett">Brett</option>
                      <option value="Jude">Jude</option>
                    </select>
                    <span className="text-[10px] text-[#52525B]">posting as</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          addComment();
                        }
                      }}
                      placeholder="Write a comment..."
                      rows={2}
                      className="flex-1 rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-1.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors resize-none"
                    />
                    <Button type="button" size="sm" onClick={addComment} disabled={!newComment.trim()}>Post</Button>
                  </div>
                  <p className="text-[10px] text-[#52525B]">Ctrl+Enter to post</p>
                </div>
              </div>
            )}
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
