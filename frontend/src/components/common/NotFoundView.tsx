import React from 'react';
import {
  ArrowLeft,
  FileQuestion,
  Home,
  LifeBuoy,
  PlusCircle,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotFoundView: React.FC = () => {
  const { setActiveTab, setIsRegisterModalOpen, setIsCommandPaletteOpen } = useApp();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center space-y-6 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 404 Visual Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
            <FileQuestion className="w-12 h-12 stroke-[1.5]" />
          </div>
          <span className="absolute -bottom-2 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm ring-4 ring-white">
            404 Error
          </span>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            The view, route, or campus resource you requested could not be located.
            It may have been relocated, archived, or you may lack permissions to view it.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>Search Tickets</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>

        {/* Helpful Support Footer */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span className="flex items-center gap-1.5">
            <LifeBuoy className="w-4 h-4 text-slate-400" />
            Campus IT Help Desk: <strong className="text-slate-700">555-0142</strong>
          </span>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};
