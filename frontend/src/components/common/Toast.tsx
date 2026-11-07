import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-200 bg-white text-slate-900';
      case 'warning':
        return 'border-amber-200 bg-white text-slate-900';
      case 'error':
        return 'border-rose-200 bg-white text-slate-900';
      default:
        return 'border-blue-200 bg-white text-slate-900';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border ${getBorderColor()} ring-1 ring-black/5`}
      >
        {getToastIcon()}
        <div className="flex-1 pr-2">
          <p className="text-sm font-medium leading-snug">{toast.text}</p>
        </div>
      </div>
    </div>
  );
};

