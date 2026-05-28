"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";

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

interface TemplateCard {
  id: string;
  name: string;
  description: string | null;
  color: string;
  phaseCount: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "projects" | "templates";

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

  // Templates state
  const [viewMode, setViewMode] = useState<ViewMode>("projects");
  const [templates, setTemplates] = useState<TemplateCard[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // Save as template modal
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveTemplateProjectId, setSaveTemplateProjectId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // New from template modal
  const [showNewFromTemplate, setShowNewFromTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  const colors = [
    "#E8501A", "#EF4444", "#F97316", "#22C55E",
    "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
    "#E8501A", "#F43F5E",
  ];

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/project-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      // silently handle
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "templates" && templates.length === 0) {
      fetchTemplates();
    }
  }, [viewMode, templates.length, fetchTemplates]);

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

  const filteredTemplates = useMemo(() => {
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [templates, search]);

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

  function openSaveTemplateModal(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setSaveTemplateProjectId(projectId);
    setTemplateName(project.name + " Template");
    setTemplateDescription(project.description || "");
    setShowSaveTemplate(true);
  }

  async function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim() || !saveTemplateProjectId) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/project-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromProjectId: saveTemplateProjectId,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save template");
      setShowSaveTemplate(false);
      setSaveTemplateProjectId(null);
      setTemplateName("");
      setTemplateDescription("");
      // Refresh templates if viewing them
      if (viewMode === "templates") fetchTemplates();
    } catch {
      // silently handle
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    setDeletingTemplateId(templateId);
    try {
      const res = await fetch(`/api/project-templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch {
      // silently handle
    } finally {
      setDeletingTemplateId(null);
    }
  }

  function openNewFromTemplateModal() {
    setSelectedTemplateId(null);
    setNewProjectName("");
    setNewProjectDescription("");
    setShowNewFromTemplate(true);
    // Fetch fresh templates for the modal
    fetchTemplates();
  }

  async function handleCreateFromTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplateId) return;
    setCreatingFromTemplate(true);
    try {
      const res = await fetch(`/api/project-templates/${selectedTemplateId}/instantiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim() || undefined,
          description: newProjectDescription.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create project from template");
      const project = await res.json();
      setShowNewFromTemplate(false);
      setSelectedTemplateId(null);
      setNewProjectName("");
      setNewProjectDescription("");
      router.push(`/projects/${project.id}`);
    } catch {
      // silently handle
    } finally {
      setCreatingFromTemplate(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        description={
          viewMode === "projects"
            ? `${projects.filter((p) => !p.archived).length} active projects`
            : `${templates.length} template${templates.length !== 1 ? "s" : ""}`
        }
        actions={
          <div className="flex items-center gap-2">
            {viewMode === "projects" && (
              <>
                <Button size="sm" variant="secondary" onClick={openNewFromTemplateModal}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  New from Template
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Project
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 border-b border-[#27272A] mb-6">
        <button
          onClick={() => setViewMode("projects")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            viewMode === "projects"
              ? "border-[#E8501A] text-[#FAFAFA]"
              : "border-transparent text-[#52525B] hover:text-[#A1A1AA]"
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => setViewMode("templates")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            viewMode === "templates"
              ? "border-[#E8501A] text-[#FAFAFA]"
              : "border-transparent text-[#52525B] hover:text-[#A1A1AA]"
          }`}
        >
          Templates
          {templates.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-[#27272A] px-1.5 py-0.5 text-[10px] text-[#A1A1AA]">
              {templates.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder={viewMode === "projects" ? "Search projects..." : "Search templates..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {viewMode === "projects" && (
          <>
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
          </>
        )}
      </div>

      {/* Projects View */}
      {viewMode === "projects" && (
        <>
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
              {filtered.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`group rounded-xl bg-[#0F0F11] border p-5 transition-[border-color,opacity] duration-150 animate-stagger-in ${
                    project.archived
                      ? "border-[#27272A]/60 opacity-60 hover:opacity-80 hover:border-[#3F3F46]"
                      : "border-[#27272A] hover:border-[#3F3F46]"
                  }`}
                  style={{ animationDelay: `${index * 40}ms` }}
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
                        className="h-full rounded-full transition-[width] duration-300"
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
                    <div className="flex items-center gap-1">
                      {!project.archived && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openSaveTemplateModal(project.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#52525B] hover:text-[#E8501A] hover:bg-[#E8501A]/10 transition-colors"
                          title="Save as template"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </button>
                      )}
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Templates View */}
      {viewMode === "templates" && (
        <>
          {loadingTemplates ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#A1A1AA]">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#27272A] py-16 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1E] mb-3 text-[#52525B]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <p className="text-sm text-[#A1A1AA]">No templates yet</p>
              <p className="text-xs text-[#52525B] mt-1">Save a project as a template to reuse its structure</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group rounded-xl bg-[#0F0F11] border border-[#27272A] hover:border-[#3F3F46] p-5 transition-colors duration-150"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: template.color }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-[#FAFAFA] truncate">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{template.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Badge>{template.phaseCount} phase{template.phaseCount !== 1 ? "s" : ""}</Badge>
                    <Badge>{template.taskCount} task{template.taskCount !== 1 ? "s" : ""}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#52525B]">
                      {new Date(template.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedTemplateId(template.id);
                          setNewProjectName("");
                          setNewProjectDescription("");
                          setShowNewFromTemplate(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-[#E8501A] bg-[#E8501A]/10 hover:bg-[#E8501A]/20 transition-colors"
                        title="Create project from template"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Use
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={deletingTemplateId === template.id}
                        className="rounded-lg p-1 text-[#52525B] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete template"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Project Modal */}
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
                  className={`h-7 w-7 rounded-full transition-[transform,box-shadow] duration-150 ${
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

      {/* Save as Template Modal */}
      <Modal open={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="Save as Template">
        <form onSubmit={handleSaveAsTemplate} className="space-y-4">
          <p className="text-xs text-[#A1A1AA]">
            Save this project&#39;s phases and tasks as a reusable template. Task statuses and assignees will not be included.
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
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
            <Button type="submit" disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New from Template Modal */}
      <Modal
        open={showNewFromTemplate}
        onClose={() => setShowNewFromTemplate(false)}
        title="New Project from Template"
        maxWidth="sm:max-w-2xl"
      >
        <form onSubmit={handleCreateFromTemplate} className="space-y-4">
          {/* Template Selection */}
          {!selectedTemplateId ? (
            <>
              <p className="text-xs text-[#A1A1AA]">Choose a template to start from.</p>
              {loadingTemplates ? (
                <div className="py-8 text-center text-sm text-[#52525B]">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[#A1A1AA]">No templates available</p>
                  <p className="text-xs text-[#52525B] mt-1">Save a project as a template first</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setNewProjectName(template.name);
                        setNewProjectDescription(template.description || "");
                      }}
                      className="text-left rounded-xl bg-[#09090B] border border-[#27272A] hover:border-[#3F3F46] p-4 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: template.color }} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-[#FAFAFA]">{template.name}</h4>
                          {template.description && (
                            <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge>{template.phaseCount} phase{template.phaseCount !== 1 ? "s" : ""}</Badge>
                            <Badge>{template.taskCount} task{template.taskCount !== 1 ? "s" : ""}</Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowNewFromTemplate(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              {/* Selected template info */}
              <div className="rounded-lg bg-[#09090B] border border-[#27272A] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedTemplate?.color || "#E8501A" }} />
                  <div>
                    <p className="text-sm font-medium text-[#FAFAFA]">{selectedTemplate?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[#52525B]">{selectedTemplate?.phaseCount} phases</span>
                      <span className="text-[11px] text-[#52525B]">{selectedTemplate?.taskCount} tasks</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId(null)}
                  className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  Change
                </button>
              </div>

              <Input
                label="Project name"
                id="npname"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Override the project name (optional)"
                autoFocus
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Description</label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Override the description (optional)"
                  rows={3}
                  className="w-full rounded-lg bg-[#0F0F11] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowNewFromTemplate(false)}>Cancel</Button>
                <Button type="submit" disabled={creatingFromTemplate}>
                  {creatingFromTemplate ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
