import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Database,
  Mail,
  Save,
  Shield,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SystemSettingsView: React.FC = () => {
  const { showToast } = useApp();

  const [highSla, setHighSla] = useState(24);
  const [medSla, setMedSla] = useState(72);
  const [lowSla, setLowSla] = useState(120);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(false);
  const [enableAutoEscalation, setEnableAutoEscalation] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState('12');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('System configuration & SLA targets updated successfully', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            System Administration
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            FR-15 & PRD Section 11.2
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          System Governance & Service Target Parameters
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure institutional SLA targets, automated reminder routines, and notification channels.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SLA Targets Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Configurable SLA Targets by Priority (Hours)</span>
          </div>
          <p className="text-xs text-slate-500">
            Complaints exceeding these deadlines are automatically flagged as overdue and escalated to department supervisors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5 p-3 rounded-xl bg-rose-50/60 border border-rose-200">
              <label className="block text-xs font-bold text-rose-900 uppercase">
                High Priority SLA
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={highSla}
                  onChange={(e) => setHighSla(Number(e.target.value))}
                  className="w-20 p-2 text-sm font-bold bg-white border border-rose-300 rounded-lg text-slate-900"
                />
                <span className="text-xs text-rose-800 font-medium">Hours</span>
              </div>
              <p className="text-[10px] text-rose-700">Recommended default: 24h</p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200">
              <label className="block text-xs font-bold text-amber-900 uppercase">
                Medium Priority SLA
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={medSla}
                  onChange={(e) => setMedSla(Number(e.target.value))}
                  className="w-20 p-2 text-sm font-bold bg-white border border-amber-300 rounded-lg text-slate-900"
                />
                <span className="text-xs text-amber-800 font-medium">Hours</span>
              </div>
              <p className="text-[10px] text-amber-700">Recommended default: 72h</p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 uppercase">
                Low Priority SLA
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={lowSla}
                  onChange={(e) => setLowSla(Number(e.target.value))}
                  className="w-20 p-2 text-sm font-bold bg-white border border-slate-300 rounded-lg text-slate-900"
                />
                <span className="text-xs text-slate-700 font-medium">Hours</span>
              </div>
              <p className="text-[10px] text-slate-500">Recommended default: 120h</p>
            </div>
          </div>
        </div>

        {/* Notifications & Escalation Policy Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Automated Escalation & Reminders (FR-15)</span>
          </div>

          <div className="space-y-4 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableAutoEscalation}
                onChange={(e) => setEnableAutoEscalation(e.target.checked)}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Automated Overdue Escalation
                </span>
                <span className="text-slate-500 leading-relaxed">
                  Automatically alert department supervisors and generate in-app notifications when requests breach SLA targets.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableEmailAlerts}
                onChange={(e) => setEnableEmailAlerts(e.target.checked)}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Optional SMTP Email Notifications (FR-08)
                </span>
                <span className="text-slate-500 leading-relaxed">
                  Deliver email digests to registered requesters when ticket status changes to Resolved.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};

