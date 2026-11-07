import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  Layers,
  LogOut,
  PlusCircle,
  Search,
  Shield,
  UserCheck,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    switchRole,
    allUsers,
    unreadNotifsCount,
    setIsNotificationDrawerOpen,
    setIsRegisterModalOpen,
    setIsCommandPaletteOpen,
    selectedCampus,
    setSelectedCampus,
    searchQuery,
    setSearchQuery,
    setActiveTab,
    isBackendConnected,
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isCampusDropdownOpen, setIsCampusDropdownOpen] = useState(false);

  const campuses = [
    'Main University Campus',
    'North Engineering Quad',
    'Curie Health Science Park',
  ];

  const handleRoleSelect = (role: Role) => {
    switchRole(role);
    setIsRoleDropdownOpen(false);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'STAFF':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FACULTY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'STUDENT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs backdrop-blur-md bg-white/95">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding & Campus Selector */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-600/20 group-hover:shadow-md transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base group-hover:text-blue-600 transition">
                  SmartCampus
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/70">
                  SaaS Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Service Management System
              </p>
            </div>
          </div>

          {/* Campus Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsCampusDropdownOpen(!isCampusDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedCampus}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isCampusDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                {campuses.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCampus(c);
                      setIsCampusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                      selectedCampus === c ? 'font-semibold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    {c}
                    {selectedCampus === c && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Search & Command Palette shortcut */}
        <div className="flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search complaints by ID, title, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-16 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
            />
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200 rounded shadow-2xs hover:bg-slate-50"
              title="Command Palette"
            >
              Ctrl+K
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* MongoDB API Connectivity Indicator */}
          <div
            title={
              isBackendConnected
                ? 'Connected to FastAPI & MongoDB Atlas'
                : 'Running in Standalone Offline Demo Mode'
            }
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-50 border border-slate-200 text-slate-600 select-none"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                  : 'bg-amber-400'
              }`}
            />
            <span>{isBackendConnected ? 'API Live' : 'Demo Mode'}</span>
          </div>

          {/* Quick Submit Request CTA */}
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition"
          >
            <PlusCircle className="w-4 h-4" />
            New Request
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[10px] font-bold text-white bg-rose-500 rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Interactive Persona / Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 border border-slate-300">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-full h-full p-1 text-slate-500" />
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.fullName}
                </p>
                <span
                  className={`inline-block text-[10px] font-medium px-1.5 rounded border leading-none py-0.5 mt-0.5 ${getRoleBadge(
                    currentUser.role
                  )}`}
                >
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Test Persona
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluate end-to-end role workflows
                  </p>
                </div>

                <div className="p-1 space-y-1">
                  {allUsers.map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleRoleSelect(u.role)}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar}
                            alt={u.fullName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-medium text-slate-900">{u.fullName}</p>
                            <p className="text-[10px] text-slate-500">
                              {u.role === 'STAFF'
                                ? u.staffDepartmentName
                                : u.role === 'ADMIN'
                                ? 'System Administrator'
                                : u.department || 'Student'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-1 pt-1 border-t border-slate-100 px-3 py-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-600" />
                      Role-based Access Active
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

