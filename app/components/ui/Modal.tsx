"use client";

import { useEffect, useRef, useState } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = "sm:max-w-lg" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setAnimating(true);
      // Force a layout read so the browser paints the initial state before transitioning
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      // Keep mounted until the exit transition finishes
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open && !animating) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{
        backgroundColor: visible ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0)",
        transition: "background-color 200ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#0F0F11] border border-[#27272A] shadow-2xl`}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="flex items-center justify-between border-b border-[#27272A] px-4 sm:px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-[#FAFAFA]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#52525B] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#FAFAFA] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] transition-[color,background-color]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 sm:px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
