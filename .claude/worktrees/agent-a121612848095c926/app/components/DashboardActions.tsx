"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import Input from "./ui/Input";

/* ── Types for import preview ──────────────────────────────────────────────── */
interface ImportPreview {
  version: string;
  exportedAt?: string;
  counts: Record<string, number>;
}

export default function DashboardActions() {
  const router = useRouter();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#E8501A");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<object | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; mode: string; imported: Record<string, number> } | null>(null);
  const [importError, setImportError] = useState("");

  const colors = [
    "#E8501A", "#EF4444", "#F97316", "#22C55E",
    "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
    "#E8A020", "#F43F5E",
  ];

  /* ── Import helpers ─────────────────────────────────────────────────────── */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.version || !parsed.data) {
          setImportError("Invalid backup file: missing version or data fields");
          return;
        }
        const counts: Record<string, number> = {};
        for (const [key, value] of Object.entries(parsed.data)) {
          if (Array.isArray(value)) counts[key] = value.length;
          else if (value && typeof value === "object") counts[key] = 1;
        }
        setImportFile(parsed);
        setImportPreview({ version: parsed.version, exportedAt: parsed.exportedAt, counts });
        setShowImportModal(true);
      } catch {
        setImportError("Could not parse file. Make sure it is a valid JSON backup.");
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  async function handleImport(mode: "replace" | "merge") {
    if (!importFile) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);
    try {
      const res = await fetch(`/api/import?mode=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importFile),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Import failed");
      setImportResult(body);
      router.refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function closeImportModal() {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportError("");
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }
      setShowProjectModal(false);
      setName("");
      setDescription("");
      setColor("#E8501A");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => window.location.href = "/api/export-all"}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Backup JSON
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          Import Backup
        </Button>
        <Button variant="secondary" size="sm" onClick={() => router.push("/finance")}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
          </svg>
          Log Transaction
        </Button>
        <Button size="sm" onClick={() => setShowProjectModal(true)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </Button>
      </div>

      <Modal open={showProjectModal} onClose={() => setShowProjectModal(false)} title="New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project name"
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website Redesign"
            autoFocus
          />
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
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowProjectModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import confirmation modal */}
      <Modal open={showImportModal} onClose={closeImportModal} title="Import Backup">
        {importResult ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-sm font-medium">Import complete ({importResult.mode} mode)</span>
            </div>
            <div className="rounded-lg bg-[#1A1A1E] border border-[#27272A] p-4">
              <p className="text-xs text-[#52525B] mb-2">Records imported:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {Object.entries(importResult.imported)
                  .filter(([, count]) => count > 0)
                  .map(([key, count]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-[#A1A1AA]">{key}</span>
                      <span className="text-[#FAFAFA] font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={closeImportModal}>Done</Button>
            </div>
          </div>
        ) : importPreview ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#1A1A1E] border border-[#27272A] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#52525B]">Backup version</span>
                <span className="text-xs font-mono text-[#FAFAFA]">{importPreview.version}</span>
              </div>
              {importPreview.exportedAt && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-[#52525B]">Exported at</span>
                  <span className="text-xs text-[#A1A1AA]">
                    {new Date(importPreview.exportedAt).toLocaleString()}
                  </span>
                </div>
              )}
              <p className="text-xs text-[#52525B] mb-2">Data in backup:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {Object.entries(importPreview.counts).map(([key, count]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-[#A1A1AA]">{key}</span>
                    <span className="text-[#FAFAFA] font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {importError && <p className="text-sm text-red-400">{importError}</p>}

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-400">
                <strong>Replace</strong> will delete all existing data and restore from this backup.
                <br />
                <strong>Merge</strong> will add new records from the backup but keep existing data.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={closeImportModal} disabled={importing}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleImport("merge")} disabled={importing}>
                {importing ? "Importing..." : "Merge (Keep Existing)"}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleImport("replace")} disabled={importing}>
                {importing ? "Importing..." : "Replace All Data"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {importError && <p className="text-sm text-red-400">{importError}</p>}
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={closeImportModal}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
