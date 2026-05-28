"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Wrong password");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-[#A1A1AA]"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
          autoFocus
          className="w-full rounded-lg border border-[#27272A] bg-[#0F0F11] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#E8501A] px-4 py-2.5 text-sm font-medium text-white transition-colors [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#F06A30] disabled:opacity-50"
      >
        {loading ? "Authenticating..." : "Enter The Forge"}
      </button>
    </form>
  );
}
