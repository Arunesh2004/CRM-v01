"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Check, X, ArrowRight } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { NotificationType } from '@prisma/client';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.isRead).length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- False positive: fetchNotifications contains only asynchronous setState after network fetch
      fetchNotifications();
    }
  }, [user, isOpen, fetchNotifications]);

  // Periodic polling for unread count, or via Pusher later
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- False positive: fetchNotifications contains only asynchronous setState after network fetch
      fetchNotifications();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- False positive: fetchNotifications contains only asynchronous setState after network fetch
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);



  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                  <Bell className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 transition-colors hover:bg-slate-800/50 ${!notif.isRead ? 'bg-slate-800/20' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!notif.isRead ? 'bg-indigo-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200">{notif.title}</p>
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{notif.body}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-500">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              {notif.actionUrl && (
                                <a 
                                  href={notif.actionUrl}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                >
                                  View <ArrowRight className="w-3 h-3" />
                                </a>
                              )}
                              {!notif.isRead && (
                                <button 
                                  onClick={() => markAsRead(notif.id)}
                                  className="text-slate-500 hover:text-slate-300"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-slate-800 bg-slate-900/50 text-center">
              <a href="/settings/notifications" className="text-xs text-slate-400 hover:text-white transition-colors">
                Notification Settings
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
