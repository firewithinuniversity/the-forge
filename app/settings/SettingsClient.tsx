"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

interface TaxConfig {
  id: string;
  federalTaxRate: number;
  selfEmploymentRate: number;
  seDeduction: number;
  stateTaxRate: number;
  stateName: string;
  ownershipSplit: number;
  qbiDeductionRate: number;
  taxReserveRate: number;
  partner1Name: string;
  partner2Name: string;
  burnRateThreshold: number;
  createdAt: string;
  updatedAt: string;
}

interface SettingsData {
  taxConfig: TaxConfig;
}

const TAX_FIELDS: { key: keyof TaxConfig; label: string; isPercent: boolean }[] = [
  { key: "federalTaxRate", label: "Federal Tax Rate", isPercent: true },
  { key: "selfEmploymentRate", label: "Self-Employment Rate", isPercent: true },
  { key: "seDeduction", label: "SE Deduction", isPercent: true },
  { key: "stateTaxRate", label: "State Tax Rate", isPercent: true },
  { key: "qbiDeductionRate", label: "QBI Deduction Rate", isPercent: true },
  { key: "taxReserveRate", label: "Tax Reserve Rate", isPercent: true },
  { key: "burnRateThreshold", label: "Burn Rate Threshold ($)", isPercent: false },
];

export default function SettingsClient({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [taxConfig, setTaxConfig] = useState<TaxConfig>(data.taxConfig);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startEdit(key: string, currentValue: number, isPercent: boolean) {
    setEditingField(key);
    setEditValue(isPercent ? (currentValue * 100).toFixed(2) : String(currentValue));
  }

  async function saveField(key: string, isPercent: boolean) {
    const parsed = parseFloat(editValue);
    if (isNaN(parsed)) {
      setEditingField(null);
      return;
    }
    const value = isPercent ? parsed / 100 : parsed;

    setSaving(true);
    try {
      const res = await fetch("/api/tax-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTaxConfig(updated);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  }

  async function savePartnerField(key: "partner1Name" | "partner2Name") {
    if (!editValue.trim()) {
      setEditingField(null);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tax-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: editValue.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTaxConfig(updated);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  }

  async function saveStateName() {
    if (!editValue.trim()) {
      setEditingField(null);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tax-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateName: editValue.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTaxConfig(updated);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  }

  async function saveOwnershipSplit() {
    const parsed = parseFloat(editValue);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      setEditingField(null);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tax-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownershipSplit: parsed / 100 }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTaxConfig(updated);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  }

  async function handleImport(file: File) {
    setImportStatus(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/import?mode=replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (res.ok) {
        const result = await res.json();
        const total = Object.values(result.imported as Record<string, number>).reduce((a, b) => a + b, 0);
        setImportStatus({ type: "success", message: `Import complete. ${total} records restored.` });
        router.refresh();
      } else {
        const err = await res.json();
        setImportStatus({ type: "error", message: err.error || "Import failed" });
      }
    } catch {
      setImportStatus({ type: "error", message: "Invalid JSON file" });
    }
  }

  const p1Split = (taxConfig.ownershipSplit * 100).toFixed(0);
  const p2Split = ((1 - taxConfig.ownershipSplit) * 100).toFixed(0);

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-4xl">
      <PageHeader title="Settings" description="Manage tax rates, partner info, and data." />

      {/* Tax Configuration */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
          </svg>
          Tax Configuration
        </h2>
        <div className="space-y-1">
          {TAX_FIELDS.map(({ key, label, isPercent }) => {
            const raw = taxConfig[key] as number;
            const display = isPercent ? `${(raw * 100).toFixed(2)}%` : `$${raw.toLocaleString()}`;
            const isEditing = editingField === key;

            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] transition-colors duration-150"
              >
                <span className="text-sm text-[#A1A1AA]">{label}</span>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={isPercent ? "0.01" : "1"}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveField(key, isPercent);
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      className="w-24 rounded-md bg-[#09090B] border border-[#27272A] px-2 py-1 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none"
                      autoFocus
                      disabled={saving}
                    />
                    <span className="text-xs text-[#52525B]">{isPercent ? "%" : "$"}</span>
                    <button
                      onClick={() => saveField(key, isPercent)}
                      disabled={saving}
                      className="text-[#22C55E] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#4ADE80] transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(key, raw, isPercent)}
                    className="text-sm font-medium text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] transition-colors cursor-pointer"
                  >
                    {display}
                  </button>
                )}
              </div>
            );
          })}

          {/* State Name */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] transition-colors duration-150">
            <span className="text-sm text-[#A1A1AA]">State</span>
            {editingField === "stateName" ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveStateName();
                    if (e.key === "Escape") setEditingField(null);
                  }}
                  className="w-32 rounded-md bg-[#09090B] border border-[#27272A] px-2 py-1 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none"
                  autoFocus
                  disabled={saving}
                />
                <button
                  onClick={saveStateName}
                  disabled={saving}
                  className="text-[#22C55E] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#4ADE80] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingField("stateName"); setEditValue(taxConfig.stateName); }}
                className="text-sm font-medium text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] transition-colors cursor-pointer"
              >
                {taxConfig.stateName}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Partner Info */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          Partner Info
        </h2>
        <div className="space-y-1">
          {/* Partner 1 */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] transition-colors duration-150">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-medium text-white">
                {taxConfig.partner1Name.charAt(0)}
              </div>
              <span className="text-sm text-[#A1A1AA]">Partner 1</span>
            </div>
            {editingField === "partner1Name" ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") savePartnerField("partner1Name");
                    if (e.key === "Escape") setEditingField(null);
                  }}
                  className="w-40 rounded-md bg-[#09090B] border border-[#27272A] px-2 py-1 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none"
                  autoFocus
                  disabled={saving}
                />
                <button
                  onClick={() => savePartnerField("partner1Name")}
                  disabled={saving}
                  className="text-[#22C55E] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#4ADE80] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingField("partner1Name"); setEditValue(taxConfig.partner1Name); }}
                className="text-sm font-medium text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] transition-colors cursor-pointer"
              >
                {taxConfig.partner1Name}
              </button>
            )}
          </div>

          {/* Partner 2 */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] transition-colors duration-150">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[10px] font-medium text-white">
                {taxConfig.partner2Name.charAt(0)}
              </div>
              <span className="text-sm text-[#A1A1AA]">Partner 2</span>
            </div>
            {editingField === "partner2Name" ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") savePartnerField("partner2Name");
                    if (e.key === "Escape") setEditingField(null);
                  }}
                  className="w-40 rounded-md bg-[#09090B] border border-[#27272A] px-2 py-1 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none"
                  autoFocus
                  disabled={saving}
                />
                <button
                  onClick={() => savePartnerField("partner2Name")}
                  disabled={saving}
                  className="text-[#22C55E] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#4ADE80] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingField("partner2Name"); setEditValue(taxConfig.partner2Name); }}
                className="text-sm font-medium text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] transition-colors cursor-pointer"
              >
                {taxConfig.partner2Name}
              </button>
            )}
          </div>

          {/* Ownership Split */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] transition-colors duration-150">
            <span className="text-sm text-[#A1A1AA]">Ownership Split</span>
            {editingField === "ownershipSplit" ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveOwnershipSplit();
                    if (e.key === "Escape") setEditingField(null);
                  }}
                  className="w-20 rounded-md bg-[#09090B] border border-[#27272A] px-2 py-1 text-sm text-[#FAFAFA] focus:border-[#E8501A] focus:outline-none"
                  autoFocus
                  disabled={saving}
                />
                <span className="text-xs text-[#52525B]">% / {100 - (parseFloat(editValue) || 0)}%</span>
                <button
                  onClick={saveOwnershipSplit}
                  disabled={saving}
                  className="text-[#22C55E] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#4ADE80] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#A1A1AA] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingField("ownershipSplit"); setEditValue(p1Split); }}
                className="text-sm font-medium text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#E8501A] transition-colors cursor-pointer"
              >
                {p1Split}% / {p2Split}%
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Security
        </h2>
        <div className="rounded-lg bg-[#09090B] border border-[#27272A] px-4 py-3">
          <p className="text-sm text-[#A1A1AA]">
            To change your password, edit{" "}
            <code className="rounded bg-[#1A1A1E] px-1.5 py-0.5 text-xs font-mono text-[#E8501A]">FORGE_PASSWORD</code>{" "}
            in the <code className="rounded bg-[#1A1A1E] px-1.5 py-0.5 text-xs font-mono text-[#E8501A]">.env</code> file
            and restart the server.
          </p>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h2 className="text-base font-semibold text-[#FAFAFA] mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
          Data Management
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/api/export-all" download>
            <Button variant="secondary" size="md">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export All Data
            </Button>
          </a>
          <Button
            variant="secondary"
            size="md"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Import Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
        </div>
        {importStatus && (
          <div
            className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${
              importStatus.type === "success"
                ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
                : "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
            }`}
          >
            {importStatus.message}
          </div>
        )}
      </Card>
    </div>
  );
}
