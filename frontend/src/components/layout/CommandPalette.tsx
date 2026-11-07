import React, { useEffect, useState } from 'react';
import {
  Building2,
  FileText,
  FolderGit2,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    complaints,
    setSelectedComplaint,
    setActiveTab,
    setIsRegisterModalOpen,
    switchRole,
  } = useApp();

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredComplaints = query.trim()
    ? complaints.filter(
        (c) =>
          c.complaintNumber.toLowerCase().includes(query.toLowerCase()) ||
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.location.toLowerCase().includes(query.toLowerCase()) ||
          c.categoryName.toLowerCase().includes(query.toLowerCase())
      )
    : complaints.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, search complaints (e.g. 'Wi-Fi', 'SCMS-2026-000101')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-base bg-transparent border-none focus:outline-none placeholder:text-slate-400 text-slate-900"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick Actions Section */}
          {!query && (
            <div>
              <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Navigation & Actions
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setIsRegisterModalOpen(true);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <PlusCircle className="w-4 h-4 text-blue-600" />
                  <span>Report New Request</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('complaints');
                    setIsCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <Inbox className="w-4 h-4 text-slate-500" />
                  <span>Open Complaints Queue</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setIsCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  <span>Go to Executive Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('categories');
                    setIsCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <FolderGit2 className="w-4 h-4 text-slate-500" />
                  <span>Category Mappings</span>
                </button>
              </div>
            </div>
          )}

          {/* Complaints Matches */}
          <div>
            <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {query ? 'Matching Service Requests' : 'Recent Complaints'}
            </p>
            {filteredComplaints.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                No matching service requests found for "{query}".
              </p>
            ) : (
              <div className="space-y-1">
                {filteredComplaints.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedComplaint(c);
                      setIsCommandPaletteOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600">
                            {c.complaintNumber}
                          </span>
                          <span className="text-xs font-medium text-slate-900 line-clamp-1">
                            {c.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {c.categoryName} • {c.location}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {c.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Navigate with <kbd className="font-mono bg-white border border-slate-200 px-1 rounded">↑</kbd>{' '}
            <kbd className="font-mono bg-white border border-slate-200 px-1 rounded">↓</kbd>
          </span>
          <span>
            Press <kbd className="font-mono bg-white border border-slate-200 px-1 rounded">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};

