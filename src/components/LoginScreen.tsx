import React, { useState } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  KeyRound, 
  User, 
  AlertCircle, 
  UserPlus, 
  UserCheck,
  Briefcase,
  Users,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { OFII_DRIVERS_ROSTER } from '../data/mockData';
import { UserRole, UserProfile } from '../types';
import { 
  authenticateUser, 
  saveAuthSession, 
  getDefaultUserForRole, 
  getRegisteredUsers 
} from '../data/userAccounts';

interface LoginScreenProps {
  onLogin: () => void;
  onCreateAccount: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onCreateAccount }) => {
  const { setCurrentUserProfile } = useData();
  const [selectedRole, setSelectedRole] = useState<UserRole>('office_head');
  const [selectedDriverName, setSelectedDriverName] = useState<string>('Danilo P. Hernandez');
  const [selectedCoordinatorName, setSelectedCoordinatorName] = useState<string>('Alodia Manalansan');
  
  const [username, setUsername] = useState('roberto.delrosario@orientfreight.com');
  const [password, setPassword] = useState('Password123!');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    const defaultUser = getDefaultUserForRole(role);
    if (role === 'office_head') {
      setUsername('roberto.delrosario@orientfreight.com');
    } else if (role === 'coordinator') {
      setUsername('alodia.manalansan@orientfreight.com');
    } else if (role === 'encoder') {
      setUsername('ops.officer@orientfreight.com');
    } else if (role === 'driver_head') {
      setUsername('fleet.head@orientfreight.com');
    } else if (role === 'driver') {
      const matched = OFII_DRIVERS_ROSTER.find(d => d.name === selectedDriverName) || OFII_DRIVERS_ROSTER[0];
      setUsername(`${matched.name.toLowerCase().replace(/[^a-z]/g, '.')}@orientfreight.com`);
    }
    setPassword('Password123!');
  };

  const handleDriverChange = (driverName: string) => {
    setSelectedDriverName(driverName);
    setUsername(`${driverName.toLowerCase().replace(/[^a-z]/g, '.')}@orientfreight.com`);
  };

  const handleCoordinatorChange = (coordName: string) => {
    setSelectedCoordinatorName(coordName);
    setUsername(`${coordName.toLowerCase().replace(/[^a-z]/g, '.')}@orientfreight.com`);
  };

  // Immediate 1-Click quick login for testing/evaluating any of the 5 roles
  const executeLoginWithRole = (role: UserRole, specificName?: string) => {
    setErrorMessage(null);
    const targetUser = getDefaultUserForRole(role, specificName);
    
    // Save session to localStorage so page refresh preserves session
    saveAuthSession(targetUser);
    setCurrentUserProfile(targetUser);
    onLogin();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const authRes = authenticateUser(username, password);
    if (!authRes.success || !authRes.user) {
      setErrorMessage(authRes.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    // Authenticated user
    saveAuthSession(authRes.user);
    setCurrentUserProfile(authRes.user);
    onLogin();
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Subtle corporate background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Bar / Corporate Header */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-lg tracking-wider border border-blue-500/40 shadow-sm">
              OFII
            </div>
            <div>
              <div className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
                ORIENT FREIGHT INTERNATIONAL, INC.
                <span className="hidden sm:inline-block text-[10px] uppercase px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded">
                  EST. 1974
                </span>
              </div>
              <p className="text-xs text-slate-400">Total Logistics Services Provider • Role-Based Authentication System</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              RBAC Security Active
            </span>
            <span className="text-slate-700">|</span>
            <span>Support: +63 (2) 8851-8888</span>
          </div>
        </div>
      </header>

      {/* Center Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Card Header */}
          <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-2 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              OFII Monitoring System
            </h1>
            <p className="text-xs text-blue-200/80 mt-1 font-medium">
              Enterprise Role-Based Access Control • 5 Distinct Portals
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-7 bg-white space-y-5">
            
            {/* Quick 1-Click Role Evaluator Panel */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                  Quick 1-Click Evaluator Sign-In:
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  All 5 Portals Ready
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => executeLoginWithRole('office_head')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                >
                  <span>1. Office Head</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => executeLoginWithRole('coordinator', 'Alodia Manalansan')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-emerald-800 hover:text-white text-emerald-900 border border-emerald-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                >
                  <span>2. Coordinator</span>
                  <ArrowRight className="w-3 h-3 text-emerald-500" />
                </button>

                <button
                  type="button"
                  onClick={() => executeLoginWithRole('encoder')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-blue-800 hover:text-white text-blue-900 border border-blue-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                >
                  <span>3. Encoder</span>
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                </button>

                <button
                  type="button"
                  onClick={() => executeLoginWithRole('driver_head')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-indigo-800 hover:text-white text-indigo-900 border border-indigo-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                >
                  <span>4. Driver Head</span>
                  <ArrowRight className="w-3 h-3 text-indigo-500" />
                </button>

                <button
                  type="button"
                  onClick={() => executeLoginWithRole('driver', 'Danilo P. Hernandez')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-teal-800 hover:text-white text-teal-900 border border-teal-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs col-span-2 sm:col-span-1"
                >
                  <span>5. Driver (Danilo)</span>
                  <ArrowRight className="w-3 h-3 text-teal-500" />
                </button>
              </div>
            </div>

            {/* Role Tab Selector (Tabs for manual credentials) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Select Account Role:
              </label>
              <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => handleRoleTabChange('office_head')}
                  className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
                    selectedRole === 'office_head'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Head
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleTabChange('coordinator')}
                  className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
                    selectedRole === 'coordinator'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Coord
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleTabChange('encoder')}
                  className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
                    selectedRole === 'encoder'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Encoder
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleTabChange('driver_head')}
                  className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
                    selectedRole === 'driver_head'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Drv Head
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleTabChange('driver')}
                  className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
                    selectedRole === 'driver'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Driver
                </button>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Driver selector if driver role */}
              {selectedRole === 'driver' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Authenticated Driver Profile *
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={selectedDriverName}
                      onChange={(e) => handleDriverChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      {OFII_DRIVERS_ROSTER.map((drv) => (
                        <option key={drv.id} value={drv.name}>
                          {drv.name} ({drv.id}) — {drv.defaultPlate}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Authenticates with driver ID to filter deliveries specifically assigned to this driver.
                  </p>
                </div>
              )}

              {/* Coordinator selector if coordinator role */}
              {selectedRole === 'coordinator' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Coordinator Account *
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={selectedCoordinatorName}
                      onChange={(e) => handleCoordinatorChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                    >
                      <option value="Alodia Manalansan">Alodia Manalansan (PCSO, Alexandria, Oriental Merchants)</option>
                      <option value="Justine Ryan Paular">Justine Ryan Paular (Golden Archers Development Corp)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Filters records strictly to this coordinator's assigned accounts.
                  </p>
                </div>
              )}

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Corporate Email / Account ID
                </label>
                <div className="relative rounded-md shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors font-mono"
                    placeholder="Corporate email or Employee ID"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-md shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                    placeholder="••••••••••••"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Default test password: <span className="font-mono text-slate-600">Password123!</span></p>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                  />
                  <span className="ml-2">Keep Session Active on Refresh</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Authorize & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Create Account Link */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need new personnel credentials?</span>
              <button
                type="button"
                onClick={onCreateAccount}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register User Account</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-slate-900/90 py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Orient Freight International, Inc. All rights reserved. • ISO 9001:2015 Certified Logistics</p>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Corporate Credential Recovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Default demo accounts for evaluation are pre-configured with password:
              <span className="block mt-1 font-mono font-bold text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                Password123!
              </span>
            </p>
            <p className="text-xs text-slate-500">
              For security locked accounts, contact Orient Freight IT Services: <span className="font-medium text-slate-700">it-support@orientfreight.com</span>.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
