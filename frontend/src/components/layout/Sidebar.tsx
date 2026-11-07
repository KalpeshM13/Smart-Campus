import React from 'react';
import {
  AlertOctagon,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FolderGit2,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Settings,
  ShieldCheck,
  Sliders,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ViewTab } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    complaints,
    setIsRegisterModalOpen,
    exportComplaintsCSV,
  } = useApp();

  // Calculate quick badges
  const overdueCount = complaints.filter((c) => c.isOverdue).length;
  const myComplaintsCount =
    currentUser.role === 'ADMIN'
      ? complaints.length
      : currentUser.role === 'STAFF'
      ? complaints.filter((c) => c.assignedDepartmentId === currentUser.staffDepartmentId).length
      : complaints.filter((c) => c.createdBy === currentUser.id).length;

  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const slaResolutionRate = Math.round((resolvedCount / (complaints.length || 1)) * 100);

  const navItems: {
    id: ViewTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    roles?: string[];
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'complaints',
      label:
        currentUser.role === 'STAFF'
          ? 'Department Queue'
          : currentUser.role === 'ADMIN'
          ? 'All Complaints'
          : 'My Service Requests',
      icon: Inbox,
      badge: myComplaintsCount,
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'categories',
      label: 'Category Mappings',
      icon: FolderGit2,
      roles: ['ADMIN'],
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Building2,
      roles: ['ADMIN'],
    },
    {
      id: 'users',
      label: 'Campus Directory',
      icon: Users,
      roles: ['ADMIN'],
    },
    {
      id: 'feedback',
      label: 'Feedback & CSAT',
      icon: MessageSquare,
      roles: ['ADMIN', 'STAFF'],
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      roles: ['ADMIN'],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Primary Action Button */}
      <div className="p-4 border-b border-slate-800/80">
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm hover:shadow transition duration-150"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Service Request</span>
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {navItems
              .filter((item) => !item.roles || item.roles.includes(currentUser.role))
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isActive ? 'bg-blue-700 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Operational Highlights */}
        {currentUser.role === 'ADMIN' && (
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Compliance & Audit
            </p>
            <div className="space-y-1.5 px-3">
              <button
                onClick={() => exportComplaintsCSV()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export Audit CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SLA Health Indicator Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            SLA Compliance
          </span>
          <span className="font-bold text-slate-200 tabular-nums">{slaResolutionRate}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${slaResolutionRate}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>Target: &gt;95%</span>
          {overdueCount > 0 && (
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <AlertOctagon className="w-3 h-3" />
              {overdueCount} Overdue
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

