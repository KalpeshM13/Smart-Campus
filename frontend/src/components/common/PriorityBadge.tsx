import React from 'react';
import { AlertCircle, AlertTriangle, ArrowDown } from 'lucide-react';
import { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true }) => {
  switch (priority) {
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          {showIcon && <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />}
          High
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          Medium
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {showIcon && <ArrowDown className="w-3 h-3 text-slate-500" />}
          Low
        </span>
      );
    default:
      return null;
  }
};

