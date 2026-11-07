import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Printer,
  QrCode,
  Shield,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { Complaint } from '../../types';

interface WorkOrderModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  complaint,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !complaint) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar (hidden when printing) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Official Technician Work Order Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Work Order</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Work Order Sheet */}
        <div className="flex-1 overflow-y-auto p-8 font-sans text-slate-900 print:p-0 print:overflow-visible space-y-6">
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight uppercase">
                  Apex University Campus Facilities
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Central Operations & Infrastructure Dispatch Division • Service Management System
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                Campus Emergency Dispatch: (555) 0199 • facilities-dispatch@smartcampus.edu
              </p>
            </div>

            {/* QR / Barcode simulation */}
            <div className="text-right flex flex-col items-end">
              <div className="border border-slate-300 p-1.5 rounded-lg bg-slate-50">
                <QrCode className="w-12 h-12 text-slate-800" />
              </div>
              <span className="font-mono text-[10px] font-bold mt-1 text-slate-700">
                {complaint.complaintNumber}
              </span>
            </div>
          </div>

          {/* Ticket Header Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Work Order ID
              </span>
              <span className="font-mono font-bold text-sm text-blue-700">
                {complaint.complaintNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Priority Tier
              </span>
              <span
                className={`font-bold inline-block px-2 py-0.5 rounded text-[11px] ${
                  complaint.priority === 'HIGH'
                    ? 'bg-rose-100 text-rose-800'
                    : complaint.priority === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {complaint.priority} (SLA: {complaint.slaTargetHours}h)
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Current Status
              </span>
              <span className="font-bold text-slate-900">{complaint.status}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Date & Time Logged
              </span>
              <span className="font-medium text-slate-700">
                {new Date(complaint.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Issue Summary */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reported Issue & Diagnostics
            </h4>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-slate-900 mb-1">{complaint.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Location & Routing Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
              <h5 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                Physical Campus Location
              </h5>
              <p className="text-slate-800">
                <strong>Campus:</strong> {complaint.campus}
              </p>
              <p className="text-slate-800">
                <strong>Building / Block:</strong> {complaint.building || 'General Hall'}
              </p>
              <p className="text-slate-800">
                <strong>Room / Lab:</strong> {complaint.room || 'Main Corridor'}
              </p>
              <p className="text-slate-600 text-[11px]">
                <strong>Reported Location:</strong> {complaint.location}
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
              <h5 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                Dispatch & Personnel
              </h5>
              <p className="text-slate-800">
                <strong>Assigned Dept:</strong> {complaint.assignedDepartmentName}
              </p>
              <p className="text-slate-800">
                <strong>Assigned Engineer:</strong>{' '}
                {complaint.assignedStaffName || 'Unassigned / Field Pool'}
              </p>
              <p className="text-slate-800">
                <strong>Requester:</strong> {complaint.createdByName} ({complaint.createdByRole})
              </p>
              <p className="text-slate-600 text-[11px]">
                <strong>Contact:</strong> {complaint.createdByEmail}
              </p>
            </div>
          </div>

          {/* Safety & PPE Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Standard Campus Safety Protocol:</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Verify de-energization before opening electrical enclosures. Follow lockout/tagout (LOTO) protocols for plumbing and high-voltage repairs. Report all hazardous conditions immediately.
              </p>
            </div>
          </div>

          {/* Field Execution Notes (Blank for technician completion) */}
          <div className="border border-slate-300 rounded-xl p-4 space-y-4">
            <h5 className="font-bold uppercase tracking-wider text-slate-700 text-xs">
              Field Technician Execution Log (Fill on Site)
            </h5>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="border-b border-dashed border-slate-400 pb-1">
                <span className="text-[10px] text-slate-500 block">Arrived On Site (Time):</span>
              </div>
              <div className="border-b border-dashed border-slate-400 pb-1">
                <span className="text-[10px] text-slate-500 block">Work Completed (Time):</span>
              </div>
              <div className="border-b border-dashed border-slate-400 pb-1">
                <span className="text-[10px] text-slate-500 block">Total Hours Billed:</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-slate-500 block mb-1">
                Spare Parts / Materials Used:
              </span>
              <div className="border border-slate-200 rounded-lg h-12 bg-slate-50/50" />
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-slate-500 block mb-1">
                Technical Actions & Diagnostics Outcome:
              </span>
              <div className="border border-slate-200 rounded-lg h-14 bg-slate-50/50" />
            </div>

            {/* Signature Lines */}
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="space-y-1">
                <div className="border-b border-slate-400 h-6" />
                <span className="text-[10px] text-slate-600 block">
                  Lead Technician Signature & Employee ID
                </span>
              </div>
              <div className="space-y-1">
                <div className="border-b border-slate-400 h-6" />
                <span className="text-[10px] text-slate-600 block">
                  Campus Facility Supervisor Sign-off
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

