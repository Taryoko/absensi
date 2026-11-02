import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { GuruDashboard } from './pages/guru/GuruDashboard';
import { AttendanceCapturePage } from './pages/guru/AttendanceCapturePage';
import { GuruHistoryPage } from './pages/guru/GuruHistoryPage';
import { ProfilePage } from './pages/guru/ProfilePage';
import { KepsekDashboard } from './pages/kepsek/KepsekDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TeachersPage } from './pages/admin/TeachersPage';
import { SchoolSettingsPage } from './pages/admin/SchoolSettingsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { DeviceRegistrationsPage } from './pages/admin/DeviceRegistrationsPage';
import { DatabaseSqlPage } from './pages/admin/DatabaseSqlPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AttendanceType, Attendance } from './types';

const MainNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [captureType, setCaptureType] = useState<AttendanceType>('check_in');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider text-slate-400">
            MEMUAT SISTEM ABSENSI...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Handle starting attendance flow for Guru
  const handleStartAttendance = (type: AttendanceType) => {
    setCaptureType(type);
    setCurrentTab('capture');
  };

  const handleCaptureSuccess = (_record: Attendance) => {
    setCurrentTab('dashboard');
  };

  // Render role-specific page based on currentTab
  const renderContent = () => {
    if (role === 'admin') {
      switch (currentTab) {
        case 'dashboard':
          return (
            <AdminDashboard
              onNavigateSettings={() => setCurrentTab('school-settings')}
              onNavigateTeachers={() => setCurrentTab('teachers')}
              onNavigateReports={() => setCurrentTab('reports')}
              onNavigateDevices={() => setCurrentTab('device-registrations')}
              onNavigateDatabase={() => setCurrentTab('database-sql')}
            />
          );
        case 'device-registrations':
          return <DeviceRegistrationsPage />;
        case 'attendance':
        case 'reports':
          return <ReportsPage />;
        case 'teachers':
          return <TeachersPage />;
        case 'school-settings':
          return <SchoolSettingsPage />;
        case 'database-sql':
          return <DatabaseSqlPage />;
        case 'audit-logs':
          return <AuditLogsPage />;
        default:
          return (
            <AdminDashboard
              onNavigateSettings={() => setCurrentTab('school-settings')}
              onNavigateTeachers={() => setCurrentTab('teachers')}
              onNavigateReports={() => setCurrentTab('reports')}
              onNavigateDevices={() => setCurrentTab('device-registrations')}
            />
          );
      }
    }

    if (role === 'kepsek') {
      switch (currentTab) {
        case 'dashboard':
          return <KepsekDashboard onNavigateReports={() => setCurrentTab('reports')} />;
        case 'attendance':
        case 'reports':
          return <ReportsPage />;
        default:
          return <KepsekDashboard onNavigateReports={() => setCurrentTab('reports')} />;
      }
    }

    // Role: Guru
    switch (currentTab) {
      case 'dashboard':
        return (
          <GuruDashboard
            onStartAttendance={handleStartAttendance}
            onViewHistory={() => setCurrentTab('history')}
          />
        );
      case 'capture':
        return (
          <AttendanceCapturePage
            type={captureType}
            onBack={() => setCurrentTab('dashboard')}
            onSuccess={handleCaptureSuccess}
          />
        );
      case 'history':
        return <GuruHistoryPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return (
          <GuruDashboard
            onStartAttendance={handleStartAttendance}
            onViewHistory={() => setCurrentTab('history')}
          />
        );
    }
  };

  return (
    <AppLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderContent()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <MainNavigator />
      </SchoolProvider>
    </AuthProvider>
  );
}
