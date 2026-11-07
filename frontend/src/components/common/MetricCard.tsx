import React from 'react';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorTheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  colorTheme = 'blue',
  onClick,
}) => {
  const getThemeClasses = () => {
    switch (colorTheme) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          accent: 'border-l-emerald-500',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
          accent: 'border-l-amber-500',
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
          accent: 'border-l-rose-500',
        };
      case 'indigo':
        return {
          iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
          accent: 'border-l-indigo-500',
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
          accent: 'border-l-purple-500',
        };
      case 'slate':
        return {
          iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
          accent: 'border-l-slate-400',
        };
      default:
        return {
          iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
          accent: 'border-l-blue-600',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {value}
            </span>
            {subValue && <span className="text-xs font-normal text-slate-500">{subValue}</span>}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg border ${theme.iconBg} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <span className="inline-flex items-center text-emerald-600 font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                {trend.value}
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 font-medium">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                {trend.value}
              </span>
            )}
            <span className="text-slate-500 ml-1">vs last 30 days</span>
          </div>
        </div>
      )}
    </div>
  );
};

