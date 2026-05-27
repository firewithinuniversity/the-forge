"use client";

import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[#A1A1AA]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-lg bg-[#0F0F11] border border-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#E8501A] focus:ring-1 focus:ring-[#E8501A]/30 focus:outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
