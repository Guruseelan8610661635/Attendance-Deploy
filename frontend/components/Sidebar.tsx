
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileSpreadsheet, 
  Settings, 
  LogOut,
  GraduationCap,
  ShieldAlert,
  CalendarDays
} from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  user: User;
  logout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, logout }) => {
  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/dashboard?tab=dashboard', // All users go to /dashboard, App.tsx handles role-based rendering
      roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT] 
    },
    { 
      name: 'Registry Directory', 
      icon: Users, 
      path: '/students', 
      roles: [UserRole.ADMIN, UserRole.STAFF],
    },
    { 
      name: 'Faculty Directory', 
      icon: Users, 
      path: '/dashboard?tab=faculty', // Students see Faculty tab in StudentPortal
      roles: [UserRole.STUDENT],
      isStudentTab: true
    },
    { 
      name: 'My Timeline', 
      icon: CalendarCheck, 
      path: '/timetable', // Student timetable view
      roles: [UserRole.STUDENT]
    },
    { 
      name: 'Attendance', 
      icon: CalendarCheck, 
      path: '/attendance', 
      roles: [UserRole.STAFF]
    },
    { 
      name: 'Reports', 
      icon: FileSpreadsheet, 
      path: '/reports', 
      roles: [UserRole.STAFF, UserRole.STUDENT] 
    },
    { 
      name: 'Timetable Management', 
      icon: CalendarDays, 
      path: '/admin/timetable', 
      roles: [UserRole.ADMIN] 
    },
    { 
      name: 'Settings', 
      icon: Settings, 
      path: '/settings', 
      roles: [UserRole.ADMIN] 
    },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="icon">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div>
           <span className="title">AttendX</span>
           <span className="subtitle">Online OS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-4 px-6 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={`${item.path}-${item.name}`}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-8">
        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 mb-6 group hover:border-indigo-500/30 transition-all">
           <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Verified</span>
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">100%</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Secure</span>
           </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-4 w-full px-6 py-4 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all font-bold text-sm group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          End Session
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
