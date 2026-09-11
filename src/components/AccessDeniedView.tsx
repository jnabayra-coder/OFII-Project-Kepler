import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface AccessDeniedViewProps {
  userRole: UserRole;
  user: UserProfile;
  attemptedTab: string;
  onReturnToAuthorizedPortal: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  userRole,
  user,
  attemptedTab,
  onReturnToAuthorizedPortal,
}) => {
  const getRoleTitle = (role: UserRole) => {
    switch (role) {
      case 'office_head': return 'Office Head';
      case 'coordinator': return 'Coordinator';
      case 'encoder': return 'Encoder';
      case 'driver_head': return 'Driver Head';
      case 'driver': return 'Driver';
      default: return 'User';
    }
  };

  const getAuthorizedPortalName = (role: UserRole) => {
    switch (role) {
      case 'office_head': return 'Office Head Overall Performance Dashboard';
      case 'coordinator': return 'Coordinator Assigned Accounts Portal';
      case 'encoder': return 'Encoder Operations & Data-Entry Portal';
      case 'driver_head': return 'Driver Head & Fleet Dispatch Portal';
      case 'driver': return 'Driver Delivery Portal';
      default: return 'Authorized Portal';
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 bg-rose-100 text-rose-800 rounded-full">
            Restricted Module • Access Denied
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-2">
            Unauthorized Security Clearance
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your authenticated account (<strong className="text-slate-800">{user.name}</strong>, Role: <span className="font-semibold text-rose-700">{getRoleTitle(userRole)}</span>) does not possess authorization to access the <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">{attemptedTab}</code> module.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1 text-left">
          <div className="flex justify-between">
            <span className="text-slate-400">Account ID:</span>
            <span className="font-mono font-medium text-slate-800">{user.employeeId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Authorized Workspace:</span>
            <span className="font-medium text-slate-800">{getAuthorizedPortalName(userRole)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Security Rule:</span>
            <span className="text-rose-700 font-semibold">RBAC Enforced Access</span>
          </div>
        </div>

        <button
          onClick={onReturnToAuthorizedPortal}
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Your Authorized Portal</span>
        </button>
      </div>
    </div>
  );
};
