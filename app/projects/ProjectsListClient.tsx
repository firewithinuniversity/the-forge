"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";

interface ProjectCard {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  statusCounts: { todo: number; in_progress: number; review: number; done: number };
  totalTasks: number;
  progress: number;
  phaseName: string | null;
}

export default function ProjectsListClient({ projects }: { projects: ProjectCard[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortBy, setSortBy] = useState("updated");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#E8501A");
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const colors = [
    "#E8501A", "#EF4444", "#F97316", "#22C55E",
    "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
    "#E8501A", "#F43F5E",
  ];

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter === "active") list = list.filter((p) => !p.archived);
    else if (statusFilter === "archived") list = list.filter((p) => p.archived);
    else if (statusFilter === "completed") list = list.filter((p) => p.progress === 100);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "created") list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === "progress") list = [...list].sort((a, b) => b.progress - a.progress);
    else list = [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return list;
  }, [projects, search, statusFilter, sortBy]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      setShowCreate(false);
      setName("");
      setDescription("");
      setColor("#E8501A");
      router.refresh();
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(e: React.MouseEvent, projectId: string) {
    e.preventDefault(); // prevent Link navigation
    e.stopPropagation();
    setRestoringId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) throw new Error("Failed to restore project");
      router.refresh();
    } catch {
      // silently handle
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        description={`${projects.filter((p) => !p.archived).length} active projects`}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={[
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All" },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          options={[
            { value: "updated", label: "Last Updated" },
            { value: "created", label: "Created Date" },
            { value: "name", label: "Name" },
            { value: "progress", label: "Progress" },
          ]}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        />
      </div>

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#27272A] py-16 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1E] mb-3 text-[#52525B]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <p className="text-sm text-[#A1A1AA]">No projects found</p>
          <p className="text-xs text-[#52525B]">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`group rounded-xl bg-[#0F0F11] border p-5 transition-colors duration-150 ${
                project.archived
                  ? "border-[#27272A]/60 opacity-60 hover:opacity-80 hover:border-[#3F3F46]"
                  : "border-[#27272A] hover:border-[#3F3F46]"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.archived ? "#52525B" : project.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-[#FAFAFA] group-hover:text-[#E8501A] transition-colors truncate">
                      {project.name}
                    </h3>
                    {project.archived && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 shrink-0">
                        Archived
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{project.description}</p>
                  )}
                </div>
              </div>

              {project.phaseName && (
                <div className="mb-3">
                  <span className="inline-flex items-center rounded-full bg-[#1A1A1E] px-2.5 py-0.5 text-[11px] text-[#A1A1AA]">
                    {project.phaseName}
                  </span>
                </div>
              )}

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#52525B]">{project.progress}% complete</span>
                  <span className="text-[11px] text-[#52525B]">{project.totalTasks} tasks</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1A1A1E]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${project.progress}%`,
                      backgroundColor: project.archived ? "#52525B" : "#E8501A",
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {project.statusCounts.todo > 0 && (
                    <span className="flex items-center gap-1 text-[#A1A1AA]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#52525B]" />
                      {project.statusCounts.todo}
                    </span>
                  )}
                  {project.statusCounts.in_progress > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {project.statusCounts.in_progress}
                    </span>
                  )}
                  {project.statusCounts.review > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {project.statusCounts.review}
                    </span>
                  )}
                  {project.statusCounts.done > 0 && (
                    <span className="flex items-center gap-1 text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {project.statusCounts.done}
                    </span>
                  )}
                </div>
                {project.archived && (
                  <button
                    onClick={(e) => handleRestore(e, project.id)}
                    disabled={restoringId === project.id}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-[#E8501A] bg-[#E8501A]/10 hover:bg-[#E8501A]/20 transition-colors disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                    </svg>
                    {restoringId === project.id ? "Restoring..." : "Restore"}
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Project name" id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" autoFocus />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
              className="w-full rounded-lg bg-[#0F0F11] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11]" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
