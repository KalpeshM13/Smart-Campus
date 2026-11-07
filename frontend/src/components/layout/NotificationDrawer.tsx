import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  Clock,
  FileCheck,
  Info,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    complaints,
    setSelectedComplaint,
    currentUser,
  } = useApp();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  if (!isNotificationDrawerOpen) return null;

  const userNotifications = notifications.filter(
    (n) => currentUser.role === 'ADMIN' || n.userId === currentUser.id
  );

  const displayedNotifications =
    filter === 'UNREAD' ? userNotifications.filter((n) => !n.isRead) : userNotifications;

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    markNotificationRead(notif.id);
    if (notif.complaintId) {
      const match = complaints.find((c) => c.id === notif.complaintId);
      if (match) {
        setSelectedComplaint(match);
        setIsNotificationDrawerOpen(false);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'OVERDUE':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'RESOLVED':
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case 'ASSIGNMENT':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">In-App Notifications</h3>
          </div>
          <button
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                filter === 'ALL'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({userNotifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                filter === 'UNREAD'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Unread ({userNotifications.filter((n) => !n.isRead).length})
            </button>
          </div>

          <button
            onClick={markAllNotificationsRead}
            className="text-xs font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {displayedNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Check className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">You're completely caught up!</p>
              <p className="text-xs text-slate-500 mt-1">No pending notifications.</p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  notif.isRead
                    ? 'bg-white border-slate-200/80 hover:bg-slate-50'
                    : 'bg-blue-50/50 border-blue-200/80 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-1.5">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

