import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Printer,
  Shield,
  Star,
  Paperclip,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComplaintStatus } from '../../types';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { WorkOrderModal } from './WorkOrderModal';

export const ComplaintDetailModal: React.FC = () => {
  const {
    selectedComplaint,
    setSelectedComplaint,
    updateComplaintStatus,
    assignComplaint,
    departments,
    currentUser,
    setFeedbackTargetComplaint,
    setIsFeedbackModalOpen,
  } = useApp();

  const [isResolveBoxOpen, setIsResolveBoxOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isHoldBoxOpen, setIsHoldBoxOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [reassignDeptId, setReassignDeptId] = useState('');
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false);

  if (!selectedComplaint) return null;

  const c = selectedComplaint;

  // Permissions
  const canPerformStaffActions =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'STAFF' &&
      currentUser.staffDepartmentId === c.assignedDepartmentId);

  const canSubmitFeedback =
    (c.status === 'RESOLVED' || c.status === 'CLOSED') &&
    c.createdBy === currentUser.id &&
    !c.feedback;

  const handleStartWork = () => {
    updateComplaintStatus(c.id, 'IN_PROGRESS');
  };

  const handleResumeWork = () => {
    updateComplaintStatus(c.id, 'IN_PROGRESS', 'Resumed work after temporary hold');
  };

  const handleConfirmResolve = () => {
    if (!resolutionNotes.trim() || resolutionNotes.length < 5) {
      alert('Please enter detailed resolution notes (at least 5 characters).');
      return;
    }
    const success = updateComplaintStatus(c.id, 'RESOLVED', resolutionNotes);
    if (success) {
      setIsResolveBoxOpen(false);
      setResolutionNotes('');
    }
  };

  const handleConfirmHold = () => {
    if (!holdReason.trim() || holdReason.length < 5) {
      alert('Please provide a specific hold reason.');
      return;
    }
    const success = updateComplaintStatus(c.id, 'ON_HOLD', undefined, holdReason);
    if (success) {
      setIsHoldBoxOpen(false);
      setHoldReason('');
    }
  };

  const handleReassign = () => {
    if (!reassignDeptId) return;
    assignComplaint(c.id, reassignDeptId);
    setReassignDeptId('');
  };

  // Lifecycle steps for the progress stepper
  const steps: { status: ComplaintStatus; label: string }[] = [
    { status: 'NEW', label: 'Registered' },
    { status: 'ASSIGNED', label: 'Assigned' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'RESOLVED', label: 'Resolved' },
    { status: 'CLOSED', label: 'Closed' },
  ];

  const getStepIndex = (status: ComplaintStatus) => {
    switch (status) {
      case 'NEW':
        return 0;
      case 'ASSIGNED':
        return 1;
      case 'IN_PROGRESS':
      case 'ON_HOLD':
        return 2;
      case 'RESOLVED':
        return 3;
      case 'CLOSED':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStepIndex(c.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded border border-blue-200">
                {c.complaintNumber}
              </span>
              <PriorityBadge priority={c.priority} />
              <StatusBadge status={c.status} size="lg" />
              {c.isOverdue && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Overdue SLA
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{c.title}</h2>
          </div>
          <button
            onClick={() => setSelectedComplaint(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FR-06 Lifecycle Stepper */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/90">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Lifecycle Progress Tracker
            </p>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-slate-200 -z-0" />
              {steps.map((st, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={st.status} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isPassed
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-white text-slate-400 border-2 border-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-medium mt-1.5 ${
                        isCurrent
                          ? 'text-blue-700 font-bold'
                          : isPassed
                          ? 'text-slate-800 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Action Controls (FR-06) */}
          {canPerformStaffActions && c.status !== 'CLOSED' && (
            <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Staff Operational Controls
                </span>
                <span className="text-xs text-blue-700 font-medium">
                  {currentUser.role === 'ADMIN' ? 'Administrator Mode' : `${currentUser.staffDepartmentName} Engineer`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Start Work */}
                {c.status === 'ASSIGNED' && (
                  <button
                    onClick={handleStartWork}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Start Processing Ticket
                  </button>
                )}

                {/* Resume Work */}
                {c.status === 'ON_HOLD' && (
                  <button
                    onClick={handleResumeWork}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Resume Ticket
                  </button>
                )}

                {/* Place on hold */}
                {c.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => setIsHoldBoxOpen(!isHoldBoxOpen)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-200 rounded-lg transition"
                  >
                    <PauseCircle className="w-4 h-4 text-purple-600" />
                    Place on Hold...
                  </button>
                )}

                {/* Mark Resolved */}
                {(c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED') && (
                  <button
                    onClick={() => setIsResolveBoxOpen(!isResolveBoxOpen)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Resolved (Mandatory Notes)
                  </button>
                )}

                {/* Administrator Reassign */}
                {currentUser.role === 'ADMIN' && (
                  <div className="flex items-center gap-2 ml-auto">
                    <select
                      value={reassignDeptId}
                      onChange={(e) => setReassignDeptId(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="">Reassign Department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {reassignDeptId && (
                      <button
                        onClick={handleReassign}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Mandatory Resolution Notes Form */}
              {isResolveBoxOpen && (
                <div className="pt-3 border-t border-blue-200/80 animate-in fade-in duration-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Enter Technical Resolution Notes (Required by FR-06)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe diagnostic outcome, parts replaced, network config changes, or campus repairs completed..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsResolveBoxOpen(false)}
                      className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmResolve}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition"
                    >
                      Confirm Resolution & Notify Requester
                    </button>
                  </div>
                </div>
              )}

              {/* Mandatory Hold Reason Form */}
              {isHoldBoxOpen && (
                <div className="pt-3 border-t border-blue-200/80 animate-in fade-in duration-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Provide Justification for Placing Ticket On Hold
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Awaiting OEM spare part delivery, vendor site visit required..."
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsHoldBoxOpen(false)}
                      className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmHold}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs transition"
                    >
                      Set On Hold
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Complaint Details */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Issue Description
                </p>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {c.description}
                </div>
              </div>

              {/* Hold Reason Alert if applicable */}
              {c.holdReason && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
                  <span className="font-bold flex items-center gap-1 text-purple-800 mb-0.5">
                    <PauseCircle className="w-3.5 h-3.5" />
                    Hold Reason:
                  </span>
                  {c.holdReason}
                </div>
              )}

              {/* Resolution Notes if applicable */}
              {c.resolutionNotes && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <span className="font-bold flex items-center gap-1 text-emerald-800 mb-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Official Resolution Notes:
                  </span>
                  {c.resolutionNotes}
                </div>
              )}

              {/* Attachment if any */}
              {c.attachmentName && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Supporting File
                  </p>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span>{c.attachmentName}</span>
                      <span className="text-[10px] text-slate-400">({c.attachmentSize})</span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                      Verified Attachment
                    </span>
                  </div>
                </div>
              )}

              {/* Post Resolution Feedback Display (FR-09) */}
              {c.feedback && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      Requester Feedback & CSAT Rating
                    </span>
                    <span className="text-xs font-extrabold text-amber-900">
                      {c.feedback.rating} / 5 Stars
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 italic">
                    "{c.feedback.comments || 'No written comment'}"
                  </p>
                  <p className="text-[10px] text-amber-600">
                    Submitted by {c.feedback.userName} on{' '}
                    {new Date(c.feedback.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Requester Rate CTA */}
              {canSubmitFeedback && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-blue-900">
                    <p className="font-bold">This issue is marked Resolved!</p>
                    <p className="text-[11px] text-blue-700">Please provide CSAT feedback for quality assurance.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFeedbackTargetComplaint(c);
                      setIsFeedbackModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition"
                  >
                    Submit 5-Star Rating
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Routing & Assignment Info */}
            <div className="space-y-4">
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                  Assignment & Routing Metadata
                </p>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-900">{c.categoryName}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Assigned Department:</span>
                  <span className="font-bold text-blue-700">{c.assignedDepartmentName}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Assigned Engineer:</span>
                  <span className="font-medium text-slate-800">
                    {c.assignedStaffName || 'Triage in Queue'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-medium text-slate-800 text-right">{c.location}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Campus:</span>
                  <span className="font-medium text-slate-800">{c.campus}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Requester:</span>
                  <span className="font-semibold text-slate-900">
                    {c.createdByName} ({c.createdByRole})
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Target SLA:</span>
                  <span className="font-bold text-slate-900">{c.slaTargetHours} Hours</span>
                </div>
              </div>

              {/* FR-07 & FR-08 Audit History Timeline */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Complaint History & Audit Log
                </p>
                <div className="space-y-3 pl-3 border-l-2 border-blue-200">
                  {c.history.map((h, i) => (
                    <div key={h.id || i} className="text-xs relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{h.changedByName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.createdAt).toLocaleDateString()} at{' '}
                          {new Date(h.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{h.remarks}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Created on {new Date(c.createdAt).toLocaleString()}</span>
            <button
              onClick={() => setIsWorkOrderOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Work Order</span>
            </button>
          </div>
          <button
            onClick={() => setSelectedComplaint(null)}
            className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>

      <WorkOrderModal
        complaint={c}
        isOpen={isWorkOrderOpen}
        onClose={() => setIsWorkOrderOpen(false)}
      />
    </div>
  );
};

