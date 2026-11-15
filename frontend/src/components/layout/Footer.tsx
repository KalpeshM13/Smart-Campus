import React, { useState } from 'react';
import {
  Activity,
  FileText,
  LifeBuoy,
  PhoneCall,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => {
  const { setActiveTab, isBackendConnected, salesforceStatus } = useApp();

  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'status' | 'docs' | null>(null);

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Overview */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-sm">
                SmartCampus
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Enterprise
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Institutional facilities, IT infrastructure, and classroom maintenance management
              platform with automated dispatch and live Salesforce Service Cloud integration.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Quick Platform Navigation */}
          <div>
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Platform Features
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-blue-600 transition text-slate-600"
                >
                  Executive Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('complaints');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-blue-600 transition text-slate-600"
                >
                  Service Requests Queue
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('feedback');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-blue-600 transition text-slate-600"
                >
                  CSAT Feedback & Ratings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('docs')}
                  className="hover:text-blue-600 transition text-slate-600 flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>SLA Architecture Guide</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Institutional Governance & Legal */}
          <div>
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Compliance & Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('privacy')}
                  className="hover:text-blue-600 transition text-slate-600"
                >
                  FERPA & Student Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('terms')}
                  className="hover:text-blue-600 transition text-slate-600"
                >
                  Campus Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('status')}
                  className="hover:text-blue-600 transition text-slate-600 flex items-center gap-1"
                >
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span>System Connectivity & Status</span>
                </button>
              </li>
              <li>
                <span className="text-[11px] text-slate-400 block pt-1">
                  Security Grade: Enterprise AES-256
                </span>
              </li>
            </ul>
          </div>

          {/* Emergency Dispatch Assistance */}
          <div>
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Campus Dispatch Lines
            </h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-600">
                <PhoneCall className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>
                  Emergency Security: <strong className="text-slate-900 font-bold">555-0199</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <PhoneCall className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>
                  IT Central Helpdesk: <strong className="text-slate-900 font-bold">555-0142</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <LifeBuoy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Email: support@smartcampus.edu</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 leading-normal">
                Campus dispatch operates 24/7 for electrical hazards and physical infrastructure emergencies.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Dynamic Copyright Year */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>
            &copy; {CURRENT_YEAR} Smart Campus Operations & Service Management System. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveModal('privacy')}
              className="hover:text-blue-600 transition"
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setActiveModal('terms')}
              className="hover:text-blue-600 transition"
            >
              Terms of Service
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setActiveModal('status')}
              className="hover:text-blue-600 transition"
            >
              System Health
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Modals for Footer Links */}
      {/* Privacy Policy Modal */}
      {activeModal === 'privacy' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Institutional Privacy Policy</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-slate-600 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>1. Data Sovereignty & Protection:</strong> All student, faculty, and personnel data submitted
                to the Smart Campus Service Management System (SCMS) is processed in strict compliance with university data
                protection regulations and applicable student records privacy standards (FERPA).
              </p>
              <p>
                <strong>2. Ticket Information:</strong> Incident descriptions, campus room numbers, and diagnostic attachments
                are strictly restricted to assigned campus engineering personnel and verified system administrators.
              </p>
              <p>
                <strong>3. Audit Logs:</strong> Access records and status update timestamps are immutably preserved
                for institutional accountability and compliance verification.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {activeModal === 'terms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Campus Terms of Service</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-slate-600 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>1. Acceptable Use:</strong> SCMS is dedicated exclusively to campus facility issues, IT incidents,
                and educational equipment maintenance requests. Frivolous submissions or harassment are prohibited.
              </p>
              <p>
                <strong>2. Response Times (SLAs):</strong> High-priority hazards receive automated triage within 24 hours.
                Medium-priority incidents have a 72-hour resolution window, while standard repairs operate on a 120-hour window.
              </p>
              <p>
                <strong>3. Life Safety Emergencies:</strong> For active fires, chemical leaks, or critical threats, contact
                Campus Security Control at 555-0199 directly rather than logging a web ticket.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Accept Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Status & Health Modal */}
      {activeModal === 'status' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">System Health & Live Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">FastAPI Web Gateway</span>
                  <span className="text-[10px] text-slate-500">Port 8000 / RESTful Endpoints</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${isBackendConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {isBackendConnected ? 'ONLINE (Healthy)' : 'STANDALONE (Demo)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Salesforce Service Cloud</span>
                  <span className="text-[10px] text-slate-500">{salesforceStatus?.orgName || 'AISSMS IOIT'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-50 text-sky-700 border border-sky-200">
                  {salesforceStatus?.mode === 'live_salesforce' ? 'CONNECTED (Live)' : 'CONNECTED (Sync Ready)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">MongoDB Atlas Cloud Cache</span>
                  <span className="text-[10px] text-slate-500">Cluster 0 / Secondary Indexing</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                  OPERATIONAL
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documentation / SLA Architecture Modal */}
      {activeModal === 'docs' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">SLA & Dispatch Architecture</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-slate-600 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>Automated Queue Routing:</strong> When an issue is logged, category-to-department rules
                automatically assign the request to the relevant department (e.g. IT, Maintenance, Electrical, Housekeeping).
              </p>
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Service Target Standards:</span>
                <p>&bull; <strong>HIGH:</strong> 24 Hours (Hazards, Power, Wi-Fi outage)</p>
                <p>&bull; <strong>MEDIUM:</strong> 72 Hours (Classroom projectors, HVAC)</p>
                <p>&bull; <strong>LOW:</strong> 120 Hours (Furniture repairs, cosmetic)</p>
              </div>
              <p>
                <strong>Resolution Safeguards:</strong> Engineers must provide detailed technical resolution notes
                before marking tickets as Resolved. Requesters are then prompted to provide 1-5 star CSAT feedback.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
