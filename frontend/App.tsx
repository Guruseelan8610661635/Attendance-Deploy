import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardRouter from './pages/DashboardRouter';
import StudentManagement from './pages/StudentManagement';
import AttendanceMarking from './pages/AttendanceMarking';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';
import TimetableManagement from './pages/TimetableManagement';
import StudentPortal from './pages/StudentPortal';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { User, UserRole } from './types';
import { getCurrentRole } from './services/roles';
import { authService } from './services/authService';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // On mount, check if user is already logged in via localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const userData = localStorage.getItem('user_data');
        const token = localStorage.getItem('token');
        
        if (userData && token) {
          const parsedUser = JSON.parse(userData);
          const role = getCurrentRole();
          
          if (role) {
            // Reconstruct user object from localStorage
            const reconstructedUser: User = {
              id: parsedUser.userId?.toString() || '1',
              name: parsedUser.name || parsedUser.username,
              email: parsedUser.email || `${parsedUser.username}@attendx.edu`,
              role: role
            };
            
            setUser(reconstructedUser);
            (window as any).currentUserRole = role;
            (window as any).currentUser = reconstructedUser;
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      (window as any).currentUserRole = user.role;
      (window as any).currentUser = user;
    }
  }, [user]);

  const handleLogin = (role: UserRole) => {
    // Get the actual user data from localStorage (already stored by authService)
    const userData = localStorage.getItem('user_data');
    
    if (userData) {
      const parsedUser = JSON.parse(userData);
      const authenticatedUser: User = {
        id: parsedUser.userId?.toString() || '1',
        name: parsedUser.name || parsedUser.username,
        email: parsedUser.email || `${parsedUser.username}@attendx.edu`,
        role: role
      };
      setUser(authenticatedUser);
    }
  };

  const handleLogout = () => {
    setUser(null);
    authService.logout();
    (window as any).currentUserRole = undefined;
    (window as any).currentUser = undefined;
    // Clear any cached data
    localStorage.removeItem('attendx_admin_master_timetable');
    localStorage.removeItem('attendx_admin_period_timings');
    localStorage.removeItem('attendx_admin_break_timings');
    localStorage.removeItem('attendx_admin_curriculum');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  if (user && isLoginPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // Role-based component resolver
  const getDashboardComponent = () => {
    if (user?.role === UserRole.STUDENT) {
      return <StudentPortal key={user?.role} />;
    }
    return <DashboardRouter key={user?.role} />;
  };

  const getTimetableComponent = () => {
    if (user?.role === UserRole.STUDENT) {
      return <StudentPortal />;
    }
    return <TimetableManagement />;
  };

  return (
    <div className="app">
      {!isLoginPage && user && <Sidebar user={user} logout={handleLogout} />}
      
      <div className="main">
        {!isLoginPage && user && <Header user={user} />}
        
        <main className="content">
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/dashboard" element={getDashboardComponent()} />
            <Route path="/student-portal" element={<StudentPortal />} />
            <Route path="/timetable" element={getTimetableComponent()} />
            <Route path="/students" element={<StudentManagement userRole={user?.role} />} />
            <Route path="/attendance" element={<AttendanceMarking />} />
            <Route path="/admin/timetable" element={<TimetableManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<AdminSettings />} />

            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;