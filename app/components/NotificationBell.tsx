"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* Notification dropdown animation styles — inline for co-location */
const dropdownBaseStyle: React.CSSProperties = {
  transformOrigin: "bottom right",
  transition: "opacity 150ms cubic-bezier(0.23, 1, 0.32, 1), transform 150ms cubic-bezier(0.23, 1, 0.32, 1)",
};
const dropdownHiddenStyle: React.CSSProperties = { ...dropdownBaseStyle, opacity: 0, transform: "scale(0.95)" };
const dropdownVisibleStyle: React.CSSProperties = { ...dropdownBaseStyle, opacity: 1, transform: "scale(1)" };

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  link: string | null;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "burn_rate":
      return (
        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        </svg>
      );
    case "overdue":
      return (
        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      );
    case "deadline":
      return (
        <svg className="h-4 w-4 text-[#E8501A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "milestone":
      return (
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4 text-[#A1A1AA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      );
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownMounted, setDropdownMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // Silently fail — bell stays quiet if server unreachable
    }
  }, []);

  const checkForNewAlerts = useCallback(async () => {
    try {
      await fetch("/api/notifications/check", { method: "POST" });
    } catch {
      // Silently fail
    }
  }, []);

  // Initial load: check for new alerts, then fetch
  useEffect(() => {
    checkForNewAlerts().then(() => fetchNotifications());
  }, [checkForNewAlerts, fetchNotifications]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkForNewAlerts().then(() => fetchNotifications());
    }, 60_000);
    return () => clearInterval(interval);
  }, [checkForNewAlerts, fetchNotifications]);

  // Animate dropdown open/close
  useEffect(() => {
    if (open) {
      setDropdownMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDropdownVisible(true);
        });
      });
    } else {
      setDropdownVisible(false);
      const timer = setTimeout(() => setDropdownMounted(false), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds, action: "read" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Silently fail
    }
  }

  async function dismissNotification(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action: "dismiss" }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Silently fail
    }
  }

  // Strip task/phase/tax IDs from display message
  function displayMessage(message: string): string {
    return message.replace(/\s*\[(task|phase|tax):[^\]]+\]/, "");
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#A1A1AA] transition-[color,background-color] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#FAFAFA]"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {dropdownMounted && (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 w-80 rounded-lg border border-[#27272A] bg-[#0F0F11] shadow-xl shadow-black/40"
          style={dropdownVisible ? dropdownVisibleStyle : dropdownHiddenStyle}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#E8501A] transition-[color] hover:text-[#F06A30]"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#52525B]">
                No notifications
              </div>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div
                    className={`group flex items-start gap-3 border-b border-[#1A1A1E] px-4 py-3 transition-[background-color] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#1A1A1E] ${
                      !n.read ? "bg-[#E8501A]/5" : ""
                    }`}
                  >
                    {/* Type icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      <NotificationIcon type={n.type} />
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-medium ${!n.read ? "text-[#FAFAFA]" : "text-[#A1A1AA]"}`}>
                          {n.title}
                        </p>
                        {/* Dismiss button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dismissNotification(n.id);
                          }}
                          className="flex-shrink-0 text-[#52525B] opacity-0 transition-opacity hover:text-[#A1A1AA] group-hover:opacity-100"
                          aria-label="Dismiss"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#A1A1AA]">
                        {displayMessage(n.message)}
                      </p>
                      <p className="mt-1 text-[10px] text-[#52525B]">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#E8501A]" />
                    )}
                  </div>
                );

                if (n.link) {
                  return (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return <div key={n.id}>{content}</div>;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
