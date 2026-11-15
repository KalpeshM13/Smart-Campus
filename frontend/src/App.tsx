import React, { useEffect } from 'react';
import { CategoryMappingView } from './components/admin/CategoryMappingView';
import { DepartmentsView } from './components/admin/DepartmentsView';
import { FeedbackAnalyticsView } from './components/admin/FeedbackAnalyticsView';
import { SystemSettingsView } from './components/admin/SystemSettingsView';
import { UserManagementView } from './components/admin/UserManagementView';
import { NotFoundView } from './components/common/NotFoundView';
import { Toast } from './components/common/Toast';
import { ComplaintDetailModal } from './components/complaints/ComplaintDetailModal';
import { ComplaintRegistrationModal } from './components/complaints/ComplaintRegistrationModal';
import { ComplaintTable } from './components/complaints/ComplaintTable';
import { FeedbackModal } from './components/complaints/FeedbackModal';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { StaffDashboard } from './components/dashboard/StaffDashboard';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { CommandPalette } from './components/layout/CommandPalette';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { Sidebar } from './components/layout/Sidebar';
import { AppProvider, useApp } from './context/AppContext';

const MainContent: React.FC = () => {
  const { activeTab, currentUser } = useApp();

  // Dynamic Page Title synchronizer (FR-01 & Item 4)
  useEffect(() => {
    const titles: Record<string, string> = {
      dashboard: `${currentUser.role === 'ADMIN' ? 'Executive Dashboard' : currentUser.role === 'STAFF' ? 'Staff Queue' : 'My Student Hub'} | Smart Campus SCMS`,
      complaints: `${currentUser.role === 'ADMIN' ? 'All Campus Complaints' : currentUser.role === 'STAFF' ? 'Department Queue' : 'My Service Requests'} | Smart Campus SCMS`,
      categories: 'Category Routing Matrix | Smart Campus SCMS',
      departments: 'Campus Departments Directory | Smart Campus SCMS',
      users: 'Campus Directory & Roles | Smart Campus SCMS',
      feedback: 'Customer Satisfaction (CSAT) Analytics | Smart Campus SCMS',
      settings: 'System Governance & SLA Parameters | Smart Campus SCMS',
      'not-found': '404 - Page Not Found | Smart Campus SCMS',
    };

    document.title = titles[activeTab] || 'Smart Campus Service Management System | Enterprise Portal';
  }, [activeTab, currentUser.role]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        if (currentUser.role === 'ADMIN') return <AdminDashboard />;
        if (currentUser.role === 'STAFF' || currentUser.role === 'FACULTY') return <StaffDashboard />;
        return <StudentDashboard />;

      case 'complaints':
        return (
          <ComplaintTable
            customTitle={
              currentUser.role === 'ADMIN'
                ? 'All Campus Service Requests'
                : currentUser.role === 'STAFF' || currentUser.role === 'FACULTY'
                ? `${currentUser.staffDepartmentName || 'Department'} Work Queue`
                : 'My Submitted Requests'
            }
            departmentFilterOnly={
              currentUser.role === 'STAFF' ? currentUser.staffDepartmentId : undefined
            }
          />
        );

      case 'categories':
        if (currentUser.role !== 'ADMIN') return <NotFoundView />;
        return <CategoryMappingView />;

      case 'departments':
        if (currentUser.role !== 'ADMIN') return <NotFoundView />;
        return <DepartmentsView />;

      case 'users':
        if (currentUser.role !== 'ADMIN') return <NotFoundView />;
        return <UserManagementView />;

      case 'feedback':
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF') return <NotFoundView />;
        return <FeedbackAnalyticsView />;

      case 'settings':
        if (currentUser.role !== 'ADMIN') return <NotFoundView />;
        return <SystemSettingsView />;

      case 'not-found':
        return <NotFoundView />;

      default:
        return <NotFoundView />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between w-full">
      <div className="p-4 sm:p-6 lg:p-8 flex-1 w-full max-w-7xl mx-auto">
        {renderActiveView()}
      </div>
      <Footer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 w-full max-w-full overflow-x-hidden">
        <Navbar />
        <div className="flex-1 flex overflow-hidden w-full max-w-full">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/70 w-full max-w-full">
            <MainContent />
          </main>
        </div>

        {/* Global Dialogs, Panels, and Notifications */}
        <ComplaintRegistrationModal />
        <ComplaintDetailModal />
        <FeedbackModal />
        <CommandPalette />
        <NotificationDrawer />
        <Toast />
      </div>
    </AppProvider>
  );
}

export default App;
