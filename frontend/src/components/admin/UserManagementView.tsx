import React, { useState } from 'react';
import {
  CheckCircle,
  Mail,
  Phone,
  Search,
  Shield,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UserManagementView: React.FC = () => {
  const { allUsers, switchRole } = useApp();
  const [search, setSearch] = useState('');

  const filteredUsers = allUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Access & Identity Management
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              FR-01 Compliant
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Campus Accounts & Role Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based authorization tiers for Students, Faculty, Department Engineers, and System Administrators.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredUsers.length} Active Accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role Tier</th>
                <th className="py-3 px-4">Department / Program</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Emulation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.role === 'STAFF'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : u.role === 'FACULTY'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-800">
                      {u.role === 'STAFF'
                        ? u.staffDepartmentName
                        : u.department || u.course || 'Institutional Governance'}
                    </span>
                    {u.studentId && (
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {u.studentId}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.phone || '+1 (555) 000-0000'}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => switchRole(u.role)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition"
                    >
                      Switch to this user
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

