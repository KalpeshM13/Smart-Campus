import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Inbox,
  PlayCircle,
  Shield,
  Timer,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { ComplaintTable } from '../complaints/ComplaintTable';

export const StaffDashboard: React.FC = () => {
  const { currentUser, complaints, departments, setSelectedComplaint } = useApp();

  const dept = departments.find((d) => d.id === currentUser.staffDepartmentId);
  const deptComplaints = complaints.filter(
    (c) => c.assignedDepartmentId === currentUser.staffDepartmentId
  );

  const assignedCount = deptComplaints.filter((c) => c.status === 'ASSIGNED').length;
  const inProgressCount = deptComplaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const onHoldCount = deptComplaints.filter((c) => c.status === 'ON_HOLD').length;
  const resolvedCount = deptComplaints.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
  ).length;
  const highPriorityCount = deptComplaints.filter((c) => c.priority === 'HIGH').length;
  const overdueCount = deptComplaints.filter((c) => c.isOverdue).length;

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Department Dispatch Terminal
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Queue
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {currentUser.staffDepartmentName || 'Department Engineering'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Engineer: <strong className="text-slate-800">{currentUser.fullName}</strong> • Department SLA Target: 24h
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">Department Open Tickets</p>
            <p className="text-xl font-extrabold text-blue-600 tabular-nums">
              {assignedCount + inProgressCount + onHoldCount}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (FR-11.3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          label="Total Assigned"
          value={deptComplaints.length}
          icon={Inbox}
          colorTheme="blue"
        />
        <MetricCard
          label="Awaiting Triage"
          value={assignedCount}
          icon={Clock}
          colorTheme="indigo"
        />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          icon={PlayCircle}
          colorTheme="amber"
        />
        <MetricCard
          label="On Hold"
          value={onHoldCount}
          icon={Timer}
          colorTheme="purple"
        />
        <MetricCard
          label="High Priority"
          value={highPriorityCount}
          icon={AlertTriangle}
          colorTheme="rose"
        />
        <MetricCard
          label="Overdue SLA"
          value={overdueCount}
          icon={AlertCircle}
          colorTheme={overdueCount > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Overdue Warning Callout */}
      {overdueCount > 0 && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs text-rose-900">
              <span className="font-bold">Overdue SLA Escalation Active:</span>
              <p className="text-rose-800 mt-0.5">
                {overdueCount} ticket(s) have passed the configured SLA resolution deadline and require immediate dispatch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table for Department */}
      <ComplaintTable
        customTitle={`${currentUser.staffDepartmentName} Work Queue`}
        departmentFilterOnly={currentUser.staffDepartmentId}
      />
    </div>
  );
};

