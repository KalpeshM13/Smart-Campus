import React from 'react';
import {
  Building2,
  Clock,
  Inbox,
  Mail,
  Power,
  User,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DepartmentsView: React.FC = () => {
  const { departments, complaints, toggleDepartmentActive, setActiveTab } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Operations Directory
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              FR-10 Compliant
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Campus Service Departments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage operational departments, dispatch queues, and SLA performance targets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const deptComplaints = complaints.filter(
            (c) => c.assignedDepartmentId === dept.id
          );
          const openCount = deptComplaints.filter(
            (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED'
          ).length;
          const resolvedCount = deptComplaints.filter(
            (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
          ).length;

          return (
            <div
              key={dept.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition hover:shadow-md ${
                dept.isActive ? 'border-slate-200/90' : 'border-slate-300 bg-slate-50/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => toggleDepartmentActive(dept.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                      dept.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                    title={dept.isActive ? 'Click to Deactivate' : 'Click to Activate'}
                  >
                    <Power className="w-3 h-3" />
                    <span>{dept.isActive ? 'Operational' : 'Deactivated'}</span>
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {dept.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Head: <strong className="text-slate-800">{dept.headName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700 truncate">{dept.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Default SLA Window: <strong className="text-slate-800">{dept.slaTargetHours} Hours</strong></span>
                  </div>
                </div>
              </div>

              {/* Workload metric summary */}
              <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Active Open
                  </span>
                  <span className="text-base font-extrabold text-blue-600 tabular-nums">
                    {openCount}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Resolved
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                    {resolvedCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

