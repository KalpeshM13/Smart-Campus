import React, { useMemo } from 'react';
import {
  AlertCircle,
  BarChart2,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FolderGit2,
  Inbox,
  PlayCircle,
  Shield,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { ComplaintTable } from '../complaints/ComplaintTable';

export const AdminDashboard: React.FC = () => {
  const { complaints, departments, categories, exportComplaintsCSV, setActiveTab } = useApp();

  // Metric aggregates (FR-11.1)
  const totalCount = complaints.length;
  const newCount = complaints.filter((c) => c.status === 'NEW').length;
  const assignedCount = complaints.filter((c) => c.status === 'ASSIGNED').length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'ON_HOLD').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const overdueCount = complaints.filter((c) => c.isOverdue).length;
  const resolutionRate = Math.round((resolvedCount / (totalCount || 1)) * 100);

  // Category distribution data for Donut Chart
  const categoryChartData = useMemo(() => {
    const counts: { [name: string]: number } = {};
    complaints.forEach((c) => {
      counts[c.categoryName] = (counts[c.categoryName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [complaints]);

  // Department workload data for Bar Chart
  const departmentChartData = useMemo(() => {
    return departments.map((d) => {
      const deptComplaints = complaints.filter((c) => c.assignedDepartmentId === d.id);
      const open = deptComplaints.filter(
        (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED'
      ).length;
      const resolved = deptComplaints.filter(
        (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
      ).length;
      return {
        name: d.name.replace(' Department', ''),
        Open: open,
        Resolved: resolved,
        total: deptComplaints.length,
      };
    });
  }, [departments, complaints]);

  // 6-Month trend area data
  const monthlyTrendData = [
    { month: 'Jun', total: 42, resolved: 39 },
    { month: 'Jul', total: 35, resolved: 34 },
    { month: 'Aug', total: 58, resolved: 52 },
    { month: 'Sep', total: 74, resolved: 68 },
    { month: 'Oct', total: 89, resolved: 81 },
    { month: 'Nov', total: totalCount, resolved: resolvedCount },
  ];

  // Palette colors for chart
  const PIE_COLORS = [
    '#2563EB', // Blue
    '#6366F1', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#64748B', // Slate
  ];

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Institutional Command Center
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Live Governance
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Administrator Analytics & Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time campus infrastructure metrics, automatic dispatch routing, and SLA compliance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportComplaintsCSV()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Category Mappings</span>
          </button>
        </div>
      </div>

      {/* 6 Key Operational KPI Metric Cards (FR-11.1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          label="Total Tickets"
          value={totalCount}
          trend={{ value: '+8.4%', isPositive: true }}
          icon={Inbox}
          colorTheme="blue"
        />
        <MetricCard
          label="New / Awaiting"
          value={newCount}
          subValue="Needs routing"
          icon={Clock}
          colorTheme="indigo"
        />
        <MetricCard
          label="Assigned"
          value={assignedCount}
          subValue="In queue"
          icon={Timer}
          colorTheme="slate"
        />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          subValue="Active engineering"
          icon={PlayCircle}
          colorTheme="amber"
        />
        <MetricCard
          label="Resolved Rate"
          value={`${resolutionRate}%`}
          trend={{ value: '+4.2%', isPositive: true }}
          icon={CheckCircle2}
          colorTheme="emerald"
        />
        <MetricCard
          label="Overdue SLA"
          value={overdueCount}
          subValue={overdueCount === 0 ? 'Within target' : 'Escalated'}
          icon={AlertCircle}
          colorTheme={overdueCount > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Visual Analytics Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Department Workload vs Resolution Rate */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Department Workload & Resolution Comparison
              </h3>
              <p className="text-xs text-slate-500">
                Active open backlog vs. completed service requests by department
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              Live DB Sync
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Open" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Open / Active" />
                <Bar dataKey="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Distribution Donut */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Complaints by Category</h3>
              <p className="text-xs text-slate-500">Distribution across campus service domains</p>
            </div>
          </div>

          <div className="w-full h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold text-slate-900 tabular-nums">
                {totalCount}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Tickets</span>
            </div>
          </div>

          {/* Mini Legend List */}
          <div className="mt-2 space-y-1 overflow-y-auto max-h-24 pr-1 text-xs">
            {categoryChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="truncate text-slate-700">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 ml-2">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: 6-Month Trend & SLA Target Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Service Volume & Resolution Trend
              </h3>
              <p className="text-xs text-slate-500">6-Month historical intake vs. resolution velocity</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>94.8% Resolution Efficiency</span>
            </div>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Total Registered"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                  name="Successfully Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA Targets & Escalation Engine Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Service Level Targets</h3>
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Configured automated resolution deadlines (PRD Section 11.2)
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-900">HIGH Priority SLA</span>
                  <p className="text-[11px] text-rose-700">Campus hazards, power, Wi-Fi</p>
                </div>
                <span className="text-sm font-black text-rose-800">24 Hours</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-900">MEDIUM Priority SLA</span>
                  <p className="text-[11px] text-amber-700">Projectors, classroom fittings</p>
                </div>
                <span className="text-sm font-black text-amber-800">72 Hours</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">LOW Priority SLA</span>
                  <p className="text-[11px] text-slate-600">Furniture, cosmetic repairs</p>
                </div>
                <span className="text-sm font-black text-slate-800">120 Hours</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Automated Escalation</span>
            <span className="text-emerald-600 font-semibold">Active & Monitored</span>
          </div>
        </div>
      </div>

      {/* Full Institutional Data Table */}
      <ComplaintTable customTitle="Institutional Complaints & Dispatch Master Directory" />
    </div>
  );
};

