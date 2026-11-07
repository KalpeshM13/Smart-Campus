import React from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  FileQuestion,
  HelpCircle,
  Inbox,
  PhoneCall,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  Star,
  Wifi,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { ComplaintTable } from '../complaints/ComplaintTable';

export const StudentDashboard: React.FC = () => {
  const {
    currentUser,
    complaints,
    setIsRegisterModalOpen,
    setSelectedComplaint,
    setFeedbackTargetComplaint,
    setIsFeedbackModalOpen,
  } = useApp();

  const myComplaints = complaints.filter((c) => c.createdBy === currentUser.id);
  const activeComplaints = myComplaints.filter(
    (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED'
  );
  const resolvedComplaints = myComplaints.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
  );
  const awaitingFeedback = myComplaints.filter(
    (c) => c.status === 'RESOLVED' && !c.feedback
  );

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-100 backdrop-blur-xs mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Campus Service Desk Active • 24/7 Support</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Welcome back, {currentUser.fullName}
          </h1>
          <p className="text-blue-100 text-sm mt-1 leading-relaxed">
            Report facility faults, Wi-Fi drops, classroom audio-visual issues, or laboratory
            equipment maintenance directly to responsible campus engineers.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 shadow-sm transition hover:shadow duration-150"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Report an Issue</span>
            </button>
            <div className="text-xs text-blue-200 flex items-center gap-2">
              <span>Student ID: <strong className="text-white">{currentUser.studentId || 'FACULTY'}</strong></span>
              <span>•</span>
              <span>{currentUser.department || currentUser.course}</span>
            </div>
          </div>
        </div>

        {/* Decorative circle overlay */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* Awaiting Feedback Banner if applicable */}
      {awaitingFeedback.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Star className="w-5 h-5 fill-amber-400 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                You have {awaitingFeedback.length} resolved request(s) awaiting satisfaction feedback!
              </p>
              <p className="text-xs text-amber-800">
                {awaitingFeedback[0].title} was resolved by {awaitingFeedback[0].assignedDepartmentName}.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setFeedbackTargetComplaint(awaitingFeedback[0]);
              setIsFeedbackModalOpen(true);
            }}
            className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition self-start sm:self-auto"
          >
            Rate Resolution (5 Stars)
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Submitted"
          value={myComplaints.length}
          subValue="Service requests"
          icon={Inbox}
          colorTheme="blue"
        />
        <MetricCard
          label="Active In Progress"
          value={activeComplaints.length}
          subValue="Under engineering review"
          icon={Clock}
          colorTheme="amber"
        />
        <MetricCard
          label="Resolved & Verified"
          value={resolvedComplaints.length}
          subValue="Resolved successfully"
          icon={CheckCircle2}
          colorTheme="emerald"
        />
        <MetricCard
          label="SLA On-Time Rate"
          value="100%"
          subValue="Within target service window"
          icon={Building}
          colorTheme="indigo"
        />
      </div>

      {/* Main Complaints Table */}
      <ComplaintTable customTitle="My Registered Complaints & Live Status" />

      {/* Emergency Assistance Footnote */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Immediate Campus Emergency?</h4>
            <p className="text-xs text-slate-500">
              For active power sparks, chemical leaks, or critical security threats, contact Campus Dispatch.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-700">
            <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
            Security Control: <strong className="text-blue-700">555-0199</strong>
          </span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
            IT Desk: <strong className="text-blue-700">555-0142</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

