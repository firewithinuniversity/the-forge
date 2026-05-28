"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KanbanBoard from "@/app/components/KanbanBoard";
import Button from "@/app/components/ui/Button";
import Badge from "@/app/components/ui/Badge";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import type { TaskData } from "@/app/components/TaskCard";

interface Phase {
  id: string;
  name: string;
  order: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteData {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  phases: Phase[];
  tasks: TaskData[];
  notes: NoteData[];
}

const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

type Tab = "board" | "list" | "notes";

export default function ProjectDetailClient({ project: initialProject }: { project: ProjectData }) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("board");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [descValue, setDescValue] = useState(project.description || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Save as template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const refreshProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}`);
      if (res.ok) {
        const data = await res.json();
        setProject({
          ...data,
          phases: data.phases.map((p: Phase) => ({ ...p })),
          tasks: data.tasks.map((t: TaskData) => ({ ...t, dueDate: t.dueDate || null })),
          notes: data.notes || [],
        });
      }
    } catch { /* ignore */ }
  }, [project.id]);

  async function saveName() {
    if (!nameValue.trim()) return;
    await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nameValue.trim() }) });
    setEditingName(false);
    refreshProject();
  }

  async function saveDescription() {
    await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: descValue.trim() || null }) });
    setEditingDesc(false);
    refreshProject();
  }

  async function addPhase() {
    if (!newPhaseName.trim()) return;
    const res = await fetch("/api/phases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPhaseName.trim(), projectId: project.id }) });
    if (res.ok) { setNewPhaseName(""); setAddingPhase(false); refreshProject(); }
  }

  async function archiveProject() {
    setArchiving(true);
    try {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      setShowArchiveModal(false);
      router.push("/projects");
    } catch { /* ignore */ }
    finally { setArchiving(false); }
  }

  async function restoreProject() {
    setArchiving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      refreshProject();
      setProject((prev) => ({ ...prev, archived: false }));
    } catch { /* ignore */ }
    finally { setArchiving(false); }
  }

  async function permanentlyDeleteProject() {
    setArchiving(true);
    try {
      await fetch(`/api/projects/${project.id}?permanent=true`, { method: "DELETE" });
      setShowDeleteModal(false);
      router.push("/projects");
    } catch { /* ignore */ }
    finally { setArchiving(false); }
  }

  function openSaveTemplateModal() {
    setTemplateName(project.name + " Template");
    setTemplateDescription(project.description || "");
    setTemplateSaved(false);
    setShowSaveTemplate(true);
  }

  async function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/project-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromProjectId: project.id,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save template");
      setTemplateSaved(true);
    } catch {
      // silently handle
    } finally {
      setSavingTemplate(false);
    }
  }

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#52525B] mb-6">
        <Link href="/projects" className="hover:text-[#A1A1AA] transition-colors">Projects</Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-[#A1A1AA]">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1.5 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(project.name); } }}
                  className={`${inputClasses} text-xl font-bold`} autoFocus />
                <Button size="sm" onClick={saveName}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditingName(false); setNameValue(project.name); }}>Cancel</Button>
              </div>
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA] cursor-pointer hover:text-[#E8501A] transition-colors" onClick={() => setEditingName(true)}>
                {project.name}
              </h1>
            )}
            {editingDesc ? (
              <div className="mt-2 flex items-start gap-2">
                <textarea value={descValue} onChange={(e) => setDescValue(e.target.value)} rows={2} className={`${inputClasses} resize-none`} autoFocus />
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={saveDescription}>Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditingDesc(false); setDescValue(project.description || ""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[#A1A1AA] cursor-pointer hover:text-[#FAFAFA] transition-colors" onClick={() => setEditingDesc(true)}>
                {project.description || "Add a description..."}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={progress === 100 ? "success" : "default"}>{progress}% complete</Badge>
          {project.archived ? (
            <>
              <Button size="sm" onClick={restoreProject} disabled={archiving}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                {archiving ? "Restoring..." : "Restore"}
              </Button>
              <button onClick={() => setShowDeleteModal(true)} className="rounded-lg p-2 text-[#52525B] hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Permanently delete project">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={openSaveTemplateModal}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Save as Template
              </Button>
              <button onClick={() => setShowArchiveModal(true)} className="rounded-lg p-2 text-[#52525B] hover:bg-amber-500/10 hover:text-amber-400 transition-colors" title="Archive project">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Archived Banner */}
      {project.archived && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-400">This project is archived</p>
              <p className="text-xs text-[#A1A1AA]">Archived projects are hidden from the active list. You can restore it at any time.</p>
            </div>
          </div>
          <Button size="sm" onClick={restoreProject} disabled={archiving}>
            {archiving ? "Restoring..." : "Restore Project"}
          </Button>
        </div>
      )}

      {/* Phase Tabs */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <button onClick={() => setActivePhaseId(null)}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activePhaseId === null ? "bg-[#E8501A] text-black" : "text-[#A1A1AA] hover:bg-[#1A1A1E] hover:text-[#FAFAFA]"
          }`}>All Tasks</button>
        {project.phases.map((phase) => (
          <button key={phase.id} onClick={() => setActivePhaseId(phase.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activePhaseId === phase.id ? "bg-[#E8501A] text-black" : "text-[#A1A1AA] hover:bg-[#1A1A1E] hover:text-[#FAFAFA]"
            }`}>{phase.name}</button>
        ))}
        {addingPhase ? (
          <div className="flex items-center gap-2 shrink-0">
            <input type="text" value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addPhase(); if (e.key === "Escape") { setAddingPhase(false); setNewPhaseName(""); } }}
              placeholder="Phase name" className="rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-1.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:outline-none w-36" autoFocus />
            <Button size="sm" onClick={addPhase}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingPhase(false); setNewPhaseName(""); }}>Cancel</Button>
          </div>
        ) : (
          <button onClick={() => setAddingPhase(true)} className="shrink-0 rounded-lg border border-dashed border-[#27272A] px-3 py-2 text-xs text-[#52525B] hover:border-[#3F3F46] hover:text-[#A1A1AA] transition-colors">
            + Add Phase
          </button>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 border-b border-[#27272A] mb-6">
        {([["board", "Board"], ["list", "List"], ["notes", "Notes"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key ? "border-[#E8501A] text-[#FAFAFA]" : "border-transparent text-[#52525B] hover:text-[#A1A1AA]"
            }`}>{label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "board" && (
        <KanbanBoard
          projectId={project.id}
          tasks={project.tasks}
          phases={project.phases.map((p) => ({ id: p.id, name: p.name }))}
          activePhaseId={activePhaseId}
          onRefresh={refreshProject}
        />
      )}

      {activeTab === "list" && (
        <TaskListView tasks={project.tasks} activePhaseId={activePhaseId} />
      )}

      {activeTab === "notes" && (
        <NotesView projectId={project.id} notes={project.notes} onRefresh={refreshProject} />
      )}

      {/* Archive Confirmation Modal */}
      <Modal open={showArchiveModal} onClose={() => setShowArchiveModal(false)} title="Archive Project">
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-400">This will archive &quot;{project.name}&quot;</p>
                <p className="text-xs text-[#A1A1AA] mt-1">The project and all its phases, tasks, and notes will be hidden from the active view. Nothing will be deleted -- you can restore this project at any time from the Archived filter.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowArchiveModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={archiveProject} disabled={archiving}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              {archiving ? "Archiving..." : "Archive Project"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Permanently Delete Project">
        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">This action cannot be undone</p>
                <p className="text-xs text-[#A1A1AA] mt-1">Permanently deleting &quot;{project.name}&quot; will cascade-delete all phases ({project.phases.length}), tasks ({project.tasks.length}), and notes ({project.notes.length}) associated with it. This data cannot be recovered.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={permanentlyDeleteProject} disabled={archiving}>
              {archiving ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save as Template Modal */}
      <Modal open={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="Save as Template">
        {templateSaved ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-400">Template saved</p>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    &quot;{templateName}&quot; has been saved with {project.phases.length} phase{project.phases.length !== 1 ? "s" : ""} and {project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""}.
                    You can find it in the Templates tab on the Projects page.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowSaveTemplate(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveAsTemplate} className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              Save this project&#39;s structure as a reusable template. Phases and tasks will be saved, but task statuses, assignees, and dates will not be included.
            </p>
            <Input
              label="Template name"
              id="tname"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Website Redesign Template"
              autoFocus
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Description</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template..."
                rows={3}
                className="w-full rounded-lg bg-[#0F0F11] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors resize-none"
              />
            </div>
            <div className="rounded-lg bg-[#09090B] border border-[#27272A] px-4 py-3">
              <p className="text-xs text-[#52525B] mb-2">Template will include:</p>
              <div className="flex items-center gap-3">
                <Badge>{project.phases.length} phase{project.phases.length !== 1 ? "s" : ""}</Badge>
                <Badge>{project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""}</Badge>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
              <Button type="submit" disabled={savingTemplate || !templateName.trim()}>
                {savingTemplate ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function TaskListView({ tasks, activePhaseId }: { tasks: TaskData[]; activePhaseId: string | null }) {
  const filtered = activePhaseId ? tasks.filter((t) => t.phaseId === activePhaseId) : tasks;
  const [sortKey, setSortKey] = useState<"title" | "status" | "priority" | "assignee" | "dueDate">("status");

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "title") return a.title.localeCompare(b.title);
    if (sortKey === "priority") {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
    }
    if (sortKey === "assignee") return (a.assignee || "").localeCompare(b.assignee || "");
    if (sortKey === "dueDate") return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
    const order = { todo: 0, in_progress: 1, review: 2, done: 3 };
    return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
  });

  const statusLabel: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };
  const statusStyle: Record<string, string> = {
    todo: "bg-[#27272A] text-[#A1A1AA]",
    in_progress: "bg-blue-500/15 text-blue-400",
    review: "bg-amber-500/15 text-amber-400",
    done: "bg-green-500/15 text-green-400",
  };
  const prioStyle: Record<string, string> = {
    low: "bg-[#27272A] text-[#A1A1AA]",
    medium: "bg-blue-500/15 text-blue-400",
    high: "bg-amber-500/15 text-amber-400",
    urgent: "bg-red-500/15 text-red-400",
  };

  if (filtered.length === 0) return <div className="py-16 text-center text-sm text-[#52525B]">No tasks in this view</div>;

  const headers: { key: typeof sortKey; label: string; width: string }[] = [
    { key: "title", label: "Task", width: "flex-1" },
    { key: "status", label: "Status", width: "w-28" },
    { key: "priority", label: "Priority", width: "w-24" },
    { key: "assignee", label: "Assignee", width: "w-24" },
    { key: "dueDate", label: "Due", width: "w-24" },
  ];

  return (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-[#27272A]">
        {headers.map((h) => (
          <button key={h.key} onClick={() => setSortKey(h.key)}
            className={`${h.width} text-left text-[11px] uppercase tracking-wider font-medium transition-colors ${
              sortKey === h.key ? "text-[#E8501A]" : "text-[#52525B] hover:text-[#A1A1AA]"
            }`}>{h.label}</button>
        ))}
      </div>
      {sorted.map((task) => (
        <div key={task.id} className="flex items-center px-4 py-3 hover:bg-[#1A1A1E] transition-colors border-b border-[#27272A] last:border-b-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#FAFAFA] truncate">{task.title}</p>
          </div>
          <div className="w-28">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[task.status] || ""}`}>
              {statusLabel[task.status] || task.status}
            </span>
          </div>
          <div className="w-24">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${prioStyle[task.priority] || ""}`}>
              {task.priority}
            </span>
          </div>
          <div className="w-24">
            {task.assignee ? (
              <div className="flex items-center gap-1.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${task.assignee === "Brett" ? "bg-blue-600" : "bg-purple-600"}`}>
                  {task.assignee.charAt(0)}
                </div>
                <span className="text-xs text-[#A1A1AA]">{task.assignee}</span>
              </div>
            ) : <span className="text-xs text-[#52525B]">—</span>}
          </div>
          <div className="w-24">
            <span className="text-xs text-[#52525B]">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesView({ projectId, notes, onRefresh }: { projectId: string; notes: { id: string; title: string; content: string; createdAt: string; updatedAt: string }[]; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), content: content.trim(), projectId }) });
      setCreating(false); setTitle(""); setContent(""); onRefresh();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function updateNote(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }) });
      setEditingId(null); onRefresh();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setCreating(true)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Note
        </Button>
      </div>

      {creating && (
        <form onSubmit={createNote} className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-4 space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title (optional)" className="w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:outline-none" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Write your note (Markdown supported)..." className="w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:outline-none resize-none font-mono" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" size="sm" onClick={() => { setCreating(false); setTitle(""); setContent(""); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !content.trim()}>{saving ? "Saving..." : "Save Note"}</Button>
          </div>
        </form>
      )}

      {notes.length === 0 && !creating && (
        <div className="py-16 text-center">
          <p className="text-sm text-[#A1A1AA]">No notes yet</p>
          <p className="text-xs text-[#52525B]">Create a note to capture ideas and context</p>
        </div>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 hover:border-[#3F3F46] transition-colors">
            {editingId === note.id ? (
              <div className="space-y-3">
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none" />
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} className="w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none resize-none font-mono" />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => updateNote(note.id)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {note.title && <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">{note.title}</h3>}
                    <span className="text-[11px] text-[#52525B]">{new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content); }} className="rounded p-1 text-[#52525B] hover:text-[#FAFAFA] hover:bg-[#1A1A1E] transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="rounded p-1 text-[#52525B] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
                <pre className="text-sm text-[#A1A1AA] whitespace-pre-wrap font-sans leading-relaxed">{note.content}</pre>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
