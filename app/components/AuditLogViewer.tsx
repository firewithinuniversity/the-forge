"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: string;
  performedBy: string | null;
  createdAt: string;
}

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const actionConfig: Record<string, { label: string; bg: string; text: string }> = {
  create: { label: "Created", bg: "bg-green-500/15", text: "text-green-400" },
  update: { label: "Updated", bg: "bg-blue-500/15", text: "text-blue-400" },
  delete: { label: "Deleted", bg: "bg-red-500/15", text: "text-red-400" },
};

const entityLabels: Record<string, string> = {
  transaction: "Transaction",
  distribution: "Distribution",
  project: "Project",
  tax_payment: "Tax Payment",
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    // If it looks like a currency amount
    if (Number.isFinite(val) && val !== Math.floor(val)) {
      return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toLocaleString("en-US");
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "string") {
    // Check if it looks like an ISO date
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    }
    return val;
  }
  return String(val);
}

function ChangeRow({ field, old: oldVal, new: newVal }: { field: string; old: unknown; new: unknown }) {
  const label = field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ");

  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <span className="text-[#52525B] w-28 shrink-0">{label}</span>
      <span className="text-red-400/70 line-through">{formatValue(oldVal)}</span>
      <svg className="h-3 w-3 text-[#52525B] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
      <span className="text-green-400">{formatValue(newVal)}</span>
    </div>
  );
}

export default function AuditLogViewer({ entityType, entityId, limit = 20 }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        let url: string;
        if (entityType && entityId) {
          url = `/api/audit-log?entityType=${entityType}&entityId=${entityId}`;
        } else {
          url = `/api/audit-log?recent=true&limit=${limit}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          setLogs(await res.json());
        }
      } catch {
        // Silently fail — component is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [entityType, entityId, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-start gap-3 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-[#27272A] mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#1A1A1E] rounded w-3/4" />
              <div className="h-2.5 bg-[#1A1A1E] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1E] mx-auto mb-3">
          <svg className="h-5 w-5 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <p className="text-xs text-[#52525B]">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#27272A]">
      {logs.map((log) => {
        const config = actionConfig[log.action] || actionConfig.update;
        const entityLabel = entityLabels[log.entityType] || log.entityType;
        let changes: Record<string, { old: unknown; new: unknown }> = {};
        try {
          const parsed = JSON.parse(log.changes);
          // For create/delete the changes object has flat values, not old/new pairs
          if (log.action === "update" && parsed && typeof parsed === "object") {
            changes = parsed;
          }
        } catch {
          // ignore parse errors
        }
        const hasChanges = log.action === "update" && Object.keys(changes).length > 0;
        const isExpanded = expandedId === log.id;

        return (
          <div key={log.id} className="px-4 py-3 hover:bg-[#1A1A1E]/50 transition-colors">
            <div
              className={`flex items-start gap-3 ${hasChanges ? "cursor-pointer" : ""}`}
              onClick={() => hasChanges && setExpandedId(isExpanded ? null : log.id)}
            >
              {/* Action dot */}
              <div
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  log.action === "create" ? "bg-green-500" :
                  log.action === "delete" ? "bg-red-500" :
                  "bg-blue-500"
                }`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                  <span className="text-sm text-[#FAFAFA]">{entityLabel}</span>
                  {log.performedBy && (
                    <span className="inline-flex items-center rounded bg-[#27272A] px-1.5 py-0.5 text-[10px] text-[#A1A1AA]">
                      {log.performedBy}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#52525B] mt-0.5">
                  {log.entityType}:{log.entityId.slice(0, 8)}
                  {hasChanges && (
                    <span className="ml-1.5 text-[#3F3F46]">
                      {Object.keys(changes).length} field{Object.keys(changes).length !== 1 ? "s" : ""} changed
                      <svg
                        className={`inline-block h-3 w-3 ml-0.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                  )}
                </p>
              </div>

              <span className="text-[10px] text-[#52525B] shrink-0">{timeAgo(log.createdAt)}</span>
            </div>

            {/* Expanded changes diff */}
            {hasChanges && isExpanded && (
              <div className="ml-5 mt-2 pl-4 border-l border-[#27272A]">
                {Object.entries(changes).map(([field, vals]) => (
                  <ChangeRow key={field} field={field} old={vals.old} new={vals.new} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
