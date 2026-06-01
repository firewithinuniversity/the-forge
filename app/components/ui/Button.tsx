"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-[#E8501A] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#F06A30] text-white",
  secondary: "bg-[#1A1A1E] border border-[#27272A] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#3F3F46] text-[#FAFAFA]",
  danger: "bg-red-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-red-500 text-white",
  ghost: "text-[#A1A1AA] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
