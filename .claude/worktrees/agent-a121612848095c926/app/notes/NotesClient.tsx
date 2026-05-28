"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Markdown from "react-markdown";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

interface TransactionRef {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
}

interface NoteData {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  transactionId: string | null;
  pinned: boolean;
  category: string;
  project: { id: string; name: string; color: string } | null;
  transaction: TransactionRef | null;
  createdAt: string;
  updatedAt: string;
}

interface Project { id: string; name: string; }

const NOTE_CATEGORIES = ["General", "Meeting Notes", "Tax Notes", "Legal", "Ideas", "Ministry"];

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-[#27272A] text-[#A1A1AA]",
  "Meeting Notes": "bg-blue-500/15 text-blue-400",
  "Tax Notes": "bg-amber-500/15 text-amber-400",
  Legal: "bg-red-500/15 text-red-400",
  Ideas: "bg-purple-500/15 text-purple-400",
  Ministry: "bg-green-500/15 text-green-400",
};

const inputClasses = "w-full rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors";

const fmtCurrency = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function NotesClient({ notes, projects, transactions = [] }: { notes: NoteData[]; projects: Project[]; transactions?: TransactionRef[] }) {
  const router = useRouter();
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("General");
  const [transactionId, setTransactionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = notes;
    if (projectFilter === "none") list = list.filter((n) => !n.projectId);
    else if (projectFilter !== "all") list = list.filter((n) => n.projectId === projectFilter);
    if (categoryFilter !== "all") list = list.filter((n) => n.category === categoryFilter);
    // Sort: pinned first, then by updatedAt
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, projectFilter, categoryFilter]);

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), projectId: projectId || null, transactionId: transactionId || null, category }),
      });
      setShowCreate(false);
      setTitle(""); setContent(""); setProjectId(""); setCategory("General"); setTransactionId("");
      setError(null);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create note"); }
    finally { setSaving(false); }
  }

  async function updateNote(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), projectId: projectId || null, transactionId: transactionId || null, category }),
      });
      setEditingId(null);
      setTitle(""); setContent(""); setProjectId(""); setCategory("General"); setTransactionId("");
      setError(null);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update note"); }
    finally { setSaving(false); }
  }

  async function togglePin(note: NoteData) {
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    router.refresh();
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function startEdit(note: NoteData) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setProjectId(note.projectId || "");
    setTransactionId(note.transactionId || "");
    setCategory(note.category || "General");
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Notes"
        description={`${notes.length} notes across all projects`}
        actions={
          <Button size="sm" onClick={() => { setEditingId(null); setTitle(""); setContent(""); setProjectId(""); setCategory("General"); setTransactionId(""); setShowCreate(true); }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Note
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={`${inputClasses} w-auto`}>
          <option value="all">All Projects</option>
          <option value="none">No Project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${inputClasses} w-auto`}>
          <option value="all">All Categories</option>
          {NOTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-[#52525B]">{filtered.length} notes</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">&times;</button>
        </div>
      )}

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#27272A] py-16 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1E] mb-3 text-[#52525B]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <p className="text-sm text-[#A1A1AA]">No notes yet</p>
          <p className="text-xs text-[#52525B]">Use this space for meeting notes, ideas, and ministry planning.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((note) => (
            <div key={note.id} className={`rounded-xl bg-[#0F0F11] border p-5 hover:border-[#3F3F46] transition-colors ${note.pinned ? "border-[#E8501A]/30 bg-[#0F0F11]" : "border-[#27272A]"}`}>
              {editingId === note.id ? (
                <div className="space-y-3">
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} placeholder="Note title (optional)" />
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className={`${inputClasses} resize-none font-mono`} autoFocus />
                  <div className="flex items-center gap-3 flex-wrap">
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputClasses} w-auto`}>
                      <option value="">No project</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClasses} w-auto`}>
                      {NOTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {transactions.length > 0 && (
                      <select value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`${inputClasses} w-auto`}>
                        <option value="">No linked transaction</option>
                        {transactions.map((t) => (
                          <option key={t.id} value={t.id}>
                            {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {t.type === "income" ? "+" : "-"}{fmtCurrency(t.amount)} — {t.description}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => updateNote(note.id)} disabled={saving || !content.trim()}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {note.pinned && (
                          <svg className="h-3.5 w-3.5 text-[#E8501A] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                          </svg>
                        )}
                        {note.title && <h3 className="text-sm font-semibold text-[#FAFAFA]">{note.title}</h3>}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[note.category] || CATEGORY_COLORS.General}`}>
                          {note.category}
                        </span>
                        {note.project && (
                          <Link href={`/projects/${note.project.id}`} className="flex items-center gap-1.5 hover:text-[#E8501A] transition-colors">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: note.project.color }} />
                            <span className="text-[11px] text-[#A1A1AA] hover:text-[#E8501A] transition-colors">{note.project.name}</span>
                          </Link>
                        )}
                        {note.transaction && (
                          <Link href="/finance" className="flex items-center gap-1.5 hover:text-[#E8501A] transition-colors">
                            <svg className="h-3 w-3 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                            </svg>
                            <span className={`text-[11px] ${note.transaction.type === "income" ? "text-green-400" : "text-red-400"}`}>
                              {note.transaction.type === "income" ? "+" : "-"}{fmtCurrency(note.transaction.amount)} — {note.transaction.description}
                            </span>
                          </Link>
                        )}
                        <span className="text-[11px] text-[#52525B]">
                          {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button onClick={() => togglePin(note)}
                        className={`rounded p-1.5 transition-colors ${note.pinned ? "text-[#E8501A] hover:bg-[#E8501A]/10" : "text-[#52525B] hover:text-[#FAFAFA] hover:bg-[#1A1A1E]"}`}
                        title={note.pinned ? "Unpin" : "Pin"}>
                        <svg className="h-4 w-4" fill={note.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                      </button>
                      <button onClick={() => startEdit(note)} className="rounded p-1.5 text-[#52525B] hover:text-[#FAFAFA] hover:bg-[#1A1A1E] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button onClick={() => deleteNote(note.id)} className="rounded p-1.5 text-[#52525B] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-[#A1A1AA] [&_h1]:text-[#FAFAFA] [&_h2]:text-[#FAFAFA] [&_h3]:text-[#FAFAFA] [&_strong]:text-[#FAFAFA] [&_a]:text-[#E8501A] [&_code]:text-[#E8501A] [&_code]:bg-[#1A1A1E] [&_code]:px-1 [&_code]:rounded">
                    <Markdown skipHtml>{note.content}</Markdown>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Note">
        <form onSubmit={createNote} className="space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} placeholder="Note title (optional)" autoFocus />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className={`${inputClasses} resize-none font-mono`} placeholder="Write your note (Markdown supported)..." />
          <div className="flex items-center gap-3 flex-wrap">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputClasses} w-auto`}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClasses} w-auto`}>
              {NOTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {transactions.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">Link to Transaction (for CPA reference)</label>
              <select value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`${inputClasses} w-auto`}>
                <option value="">No linked transaction</option>
                {transactions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {t.type === "income" ? "+" : "-"}{fmtCurrency(t.amount)} — {t.description}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !content.trim()}>{saving ? "Saving..." : "Create Note"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
