import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Search,
  SlidersHorizontal,
  Star,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Complaint, ComplaintStatus, Priority } from '../../types';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';

interface ComplaintTableProps {
  customTitle?: string;
  departmentFilterOnly?: string;
  initialStatusFilter?: string;
}

export const ComplaintTable: React.FC<ComplaintTableProps> = ({
  customTitle,
  departmentFilterOnly,
  initialStatusFilter = 'ALL',
}) => {
  const {
    complaints,
    departments,
    currentUser,
    setSelectedComplaint,
    setFeedbackTargetComplaint,
    setIsFeedbackModalOpen,
    exportComplaintsCSV,
    searchQuery: globalSearch,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    departmentFilterOnly || 'ALL'
  );
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<'createdAt' | 'priority' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 8;

  // Filter logic according to user role and filters
  const filteredData = useMemo(() => {
    return complaints.filter((c) => {
      // Role scope (PRD Section 5.1, 5.3):
      if (currentUser.role === 'STUDENT' || currentUser.role === 'FACULTY') {
        if (c.createdBy !== currentUser.id) return false;
      } else if (currentUser.role === 'STAFF') {
        if (
          currentUser.staffDepartmentId &&
          c.assignedDepartmentId !== currentUser.staffDepartmentId
        ) {
          return false;
        }
      }

      // Explicit department filter
      if (departmentFilter !== 'ALL' && c.assignedDepartmentId !== departmentFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) {
        return false;
      }

      // Overdue filter
      if (onlyOverdue && !c.isOverdue) {
        return false;
      }

      // Search Query
      const query = (localSearch || globalSearch).toLowerCase().trim();
      if (query) {
        const matchesNumber = c.complaintNumber.toLowerCase().includes(query);
        const matchesTitle = c.title.toLowerCase().includes(query);
        const matchesLocation = c.location.toLowerCase().includes(query);
        const matchesCategory = c.categoryName.toLowerCase().includes(query);
        const matchesCreator = c.createdByName.toLowerCase().includes(query);
        if (
          !matchesNumber &&
          !matchesTitle &&
          !matchesLocation &&
          !matchesCategory &&
          !matchesCreator
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    complaints,
    currentUser,
    departmentFilter,
    statusFilter,
    priorityFilter,
    onlyOverdue,
    localSearch,
    globalSearch,
  ]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortField === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetFilters = () => {
    setLocalSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setDepartmentFilter(departmentFilterOnly || 'ALL');
    setOnlyOverdue(false);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {customTitle ||
                (currentUser.role === 'STAFF'
                  ? `${currentUser.staffDepartmentName} Service Queue`
                  : currentUser.role === 'ADMIN'
                  ? 'Campus Service Requests Directory'
                  : 'My Registered Complaints')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredData.length} total records • Enforcing campus SLA governance
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => exportComplaintsCSV(filteredData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Local Search Input */}
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Department Dropdown (for Admin) */}
          {currentUser.role === 'ADMIN' && !departmentFilterOnly && (
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {/* Overdue checkbox pill */}
          <button
            onClick={() => {
              setOnlyOverdue(!onlyOverdue);
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              onlyOverdue
                ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertCircle
              className={`w-3.5 h-3.5 ${onlyOverdue ? 'text-rose-600' : 'text-slate-400'}`}
            />
            <span>Overdue SLA Only</span>
          </button>

          {(statusFilter !== 'ALL' ||
            priorityFilter !== 'ALL' ||
            departmentFilter !== 'ALL' ||
            onlyOverdue ||
            localSearch) && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Responsive Enterprise Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider select-none">
              <th className="py-3 px-4">Ticket ID</th>
              <th className="py-3 px-4 min-w-[240px]">Issue Title & Excerpt</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Assigned Department</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">SLA Target</th>
              <th className="py-3 px-4">Reported</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="max-w-sm mx-auto text-center space-y-2">
                    <Filter className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">
                      No complaints match the current filter
                    </p>
                    <p className="text-xs text-slate-500">
                      Try clearing filters or search term to view all institutional records.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                    >
                      Clear active filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className="hover:bg-blue-50/40 transition cursor-pointer group"
                >
                  {/* Complaint ID */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">
                    {c.complaintNumber}
                  </td>

                  {/* Title & Location */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                      {c.title}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="truncate max-w-[200px]">{c.location}</span>
                      <span>•</span>
                      <span className="text-slate-400">by {c.createdByName}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-800">{c.categoryName}</span>
                  </td>

                  {/* Assigned Department */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{c.assignedDepartmentName}</div>
                    {c.assignedStaffName && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        {c.assignedStaffName}
                      </div>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <PriorityBadge priority={c.priority} />
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={c.status} />
                  </td>

                  {/* SLA Target */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {c.isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <AlertCircle className="w-3 h-3" />
                        Breached SLA
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {c.slaTargetHours}h target
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View details & timeline"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Feedback button for requester if resolved and no feedback yet */}
                      {c.status === 'RESOLVED' &&
                        !c.feedback &&
                        c.createdBy === currentUser.id && (
                          <button
                            onClick={() => {
                              setFeedbackTargetComplaint(c);
                              setIsFeedbackModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition shadow-2xs"
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            Rate
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
          <span className="font-bold text-slate-800">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

