import React from 'react';
import { CategoryMappingView } from './components/admin/CategoryMappingView';
import { DepartmentsView } from './components/admin/DepartmentsView';
import { FeedbackAnalyticsView } from './components/admin/FeedbackAnalyticsView';
import { SystemSettingsView } from './components/admin/SystemSettingsView';
import { UserManagementView } from './components/admin/UserManagementView';
import { Toast } from './components/common/Toast';
import { ComplaintDetailModal } from './components/complaints/ComplaintDetailModal';
import { ComplaintRegistrationModal } from './components/complaints/ComplaintRegistrationModal';
import { ComplaintTable } from './components/complaints/ComplaintTable';
import { FeedbackModal } from './components/complaints/FeedbackModal';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { StaffDashboard } from './components/dashboard/StaffDashboard';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { CommandPalette } from './components/layout/CommandPalette';
import { Navbar } from './components/layout/Navbar';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { Sidebar } from './components/layout/Sidebar';
import { AppProvider, useApp } from './context/AppContext';

const MainContent: React.FC = () => {
  const { activeTab, currentUser } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        if (currentUser.role === 'ADMIN') return <AdminDashboard />;
        if (currentUser.role === 'STAFF') return <StaffDashboard />;
        return <StudentDashboard />;

      case 'complaints':
        return (
          <ComplaintTable
            customTitle={
              currentUser.role === 'ADMIN'
                ? 'All Campus Service Requests'
                : currentUser.role === 'STAFF'
                ? `${currentUser.staffDepartmentName} Work Queue`
                : 'My Submitted Requests'
            }
            departmentFilterOnly={
              currentUser.role === 'STAFF' ? currentUser.staffDepartmentId : undefined
            }
          />
        );

      case 'categories':
        return <CategoryMappingView />;

      case 'departments':
        return <DepartmentsView />;

      case 'users':
        return <UserManagementView />;

      case 'feedback':
        return <FeedbackAnalyticsView />;

      case 'settings':
        return <SystemSettingsView />;

      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">{renderActiveView()}</div>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <Navbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/70">
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
