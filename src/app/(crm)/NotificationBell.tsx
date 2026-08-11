"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [notifications, setNotifications] =
    useState<any[]>(initialNotifications);
  const [count, setCount] = useState(initialNotificationCount);

  // Keep state synced if props change (e.g. on navigation)
  useEffect(() => {
    setNotifications(initialNotifications);
    setCount(initialNotificationCount);
  }, [initialNotifications, initialNotificationCount]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative p-2 rounded-full hover:bg-muted"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
            {count}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50 overflow-hidden">
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <Link
              href="/notifications"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setIsOpen(false)}
            >
              View All
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No unread notifications.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 border-b hover:bg-gray-50 flex flex-col gap-1 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-gray-900">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(notif.createdAt))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {notif.body}
                  </p>
                  <div className="mt-1 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                      }}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Mark as read
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
