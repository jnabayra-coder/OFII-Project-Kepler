import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users,
  Building2, 
  FileSpreadsheet, 
  BarChart3, 
  Trash2,
  Settings, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { NavigationTab } from '../types';
import { useData } from '../context/DataContext';

interface SidebarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  onLogout: () => void;
  unreadDispatchesCount?: number;
  deletedCount?: number;
  pendingNotificationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  onLogout,
  unreadDispatchesCount = 8,
  deletedCount = 0,
  pendingNotificationsCount = 0,
}) => {
  const { currentUserProfile } = useData();
  const role = currentUserProfile?.userRole || 'office_head';

  const allNavItems = [
    // 1. Office Head Executive Dashboard
    {
      id: 'dashboard' as NavigationTab,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      badge: null,
      description: 'Daily overview & KPIs',
      roles: ['office_head', 'encoder'],
    },
    // 2. Coordinator Dedicated Portal
    {
      id: 'coordinator_portal' as NavigationTab,
      label: 'Coordinator Portal',
      icon: Briefcase,
      badge: currentUserProfile?.assignedClients?.length ? `${currentUserProfile.assignedClients.length} Accounts` : 'Assigned',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      description: 'Assigned accounts and telemetry',
      roles: ['coordinator', 'office_head'],
    },
    // 3. Driver Head Dedicated Portal
    {
      id: 'driver_head_portal' as NavigationTab,
      label: 'Fleet & Driver Assignment',
      icon: UserCheck,
      badge: 'Head',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
      description: 'Driver and helper assignment management',
      roles: ['driver_head', 'office_head'],
    },
    // 4. Daily Dispatching Monitoring
    {
      id: 'dispatch' as NavigationTab,
      label: role === 'coordinator' ? 'Assigned Dispatches' : 'Daily Dispatching Monitoring',
      icon: Truck,
      badge: pendingNotificationsCount > 0 ? `🔔 ${pendingNotificationsCount} New` : (unreadDispatchesCount > 0 ? `${unreadDispatchesCount}` : null),
      badgeColor: pendingNotificationsCount > 0 ? 'bg-amber-400 text-slate-950 font-bold border border-amber-300' : undefined,
      description: 'Fleet, loading & departures',
      roles: ['office_head', 'coordinator', 'encoder', 'driver_head'],
    },
    // 5. Client Management
    {
      id: 'client_management' as NavigationTab,
      label: 'Client Management',
      icon: Users,
      badge: null,
      description: 'Directory & corporate profiles',
      roles: ['office_head', 'encoder'],
    },
    // 6. Client Shipment Monitoring
    {
      id: 'clients' as NavigationTab,
      label: role === 'coordinator' ? 'Assigned Client Shipments' : 'Client Shipment Monitoring',
      icon: Building2,
      badge: null,
      description: 'By client & reference numbers',
      roles: ['office_head', 'coordinator', 'encoder'],
    },
    // 7. Forwarding Progressive Report
    {
      id: 'forwarding_report' as NavigationTab,
      label: role === 'encoder' ? 'Forwarding Progressive Entry' : (role === 'coordinator' ? 'Assigned Forwarding Report' : 'Forwarding Progressive Report'),
      icon: FileSpreadsheet,
      badge: role === 'encoder' ? 'Data Entry' : 'Active',
      badgeColor: role === 'encoder' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : undefined,
      description: 'Tracking, TAT & POD status',
      roles: ['office_head', 'coordinator', 'encoder', 'driver_head'],
    },
    // 8. Reports
    {
      id: 'reports' as NavigationTab,
      label: 'Reports & Analytics',
      icon: BarChart3,
      badge: null,
      description: 'SLA & performance analytics',
      roles: ['office_head'],
    },
    // 9. Trash & Operational Recovery
    {
      id: 'trash' as NavigationTab,
      label: 'Recently Deleted',
      icon: Trash2,
      badge: deletedCount > 0 ? `${deletedCount}` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      description: 'Trash & operational recovery',
      roles: ['office_head', 'encoder'],
    },
    // 10. Settings
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
      description: 'Profile & preferences',
      roles: ['office_head', 'coordinator', 'encoder', 'driver_head'],
    },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
      {/* Brand & Corporate Header */}
      <div className="p-4 border-b border-slate-800/90 bg-slate-950/60">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-base tracking-wider border border-blue-500/40 shadow-sm shrink-0">
            OFII
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-white text-xs font-bold tracking-tight uppercase truncate">
              Orient Freight Int&apos;l
            </h1>
            <p className="text-[11px] text-blue-400 font-medium truncate">
              Monitoring System
            </p>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/80 text-[10px] text-slate-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Prototype v0.3</span>
        </div>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all group text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-700 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-[10px] rounded font-semibold shrink-0 ${
                    isActive
                      ? 'bg-blue-800 text-blue-100'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Operational Status Box */}
      <div className="p-3 mx-3 mb-3 bg-slate-800/50 rounded border border-slate-700/60 text-xs">
        <div className="flex items-center justify-between text-slate-300 mb-1.5">
          <span className="text-[11px] font-semibold text-slate-200">Terminal Dispatch</span>
          <span className="text-[10px] text-emerald-400 font-mono">NORMAL</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '95%' }}></div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>95.3% On-Time</span>
          <span>148 Shipments</span>
        </div>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-900 border border-blue-600/50 flex items-center justify-center text-blue-200 text-xs font-bold shrink-0">
              {currentUserProfile?.name ? currentUserProfile.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'OF'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {currentUserProfile?.name || 'Office Operator'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <p className="text-[10px] text-slate-300 font-medium truncate leading-tight">
                  {currentUserProfile?.userRole === 'office_head' && 'Office Head'}
                  {currentUserProfile?.userRole === 'coordinator' && 'Account Coordinator'}
                  {currentUserProfile?.userRole === 'encoder' && 'Logistics Encoder'}
                  {currentUserProfile?.userRole === 'driver_head' && 'Driver Head / Fleet'}
                  {currentUserProfile?.userRole === 'driver' && 'OFII Driver'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out to Login Screen"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
