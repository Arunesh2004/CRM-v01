"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import {
  getUnreadNotificationsAction,
  markNotificationAsReadAction,
} from "./notifications/actions";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function NotificationBell({
  initialNotifications = [],
  initialNotificationCount = 0,
}: {
  initialNotifications?: any[];
  initialNotificationCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);
  const [count, setCount] = useState(initialNotificationCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(initialNotifications);
    setCount(initialNotificationCount);
  }, [initialNotifications, initialNotificationCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        className="relative w-9 h-9 flex items-center justify-center rounded-lg glass card-hover"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-[#E7EAF5]" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold flex items-center justify-center rounded-full bg-rose-500 text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 glass-panel rounded-2xl shadow-2xl overflow-hidden z-50 animate-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="font-semibold text-sm text-white">Notifications</p>
            <Link
              href="/notifications"
              className="text-[11px] font-medium"
              style={{ color: "var(--violet)" }}
              onClick={() => setIsOpen(false)}
            >
              View all
            </Link>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(124,92,252,.1)" }}>
                  <Bell className="w-4 h-4" style={{ color: "var(--violet)" }} />
                </div>
                <p className="text-xs text-slate-400">All caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-violet-500/5 cursor-pointer"
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                    style={{ background: "rgba(124,92,252,.12)" }}
                  >
                    🔔
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-white truncate">
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 shrink-0 mt-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notif.id);
                    }}
                    title="Mark as read"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
