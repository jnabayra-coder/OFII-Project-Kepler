import { UserProfile, UserRole, OFIIHelper } from '../types';
import { OFII_DRIVERS_ROSTER } from './mockData';

export const OFII_HELPERS_ROSTER: OFIIHelper[] = [
  {
    id: 'HLP-001',
    name: 'Jojo D. Ramirez',
    contactNumber: '+63 915 221 4401',
    status: 'Assigned',
  },
  {
    id: 'HLP-002',
    name: 'Mark Lester Lim',
    contactNumber: '+63 916 882 1920',
    status: 'Available',
  },
  {
    id: 'HLP-003',
    name: 'Nelson K. Bautista',
    contactNumber: '+63 927 491 8832',
    status: 'Assigned',
  },
  {
    id: 'HLP-004',
    name: 'Gary S. Tolentino',
    contactNumber: '+63 939 120 7741',
    status: 'Available',
  },
  {
    id: 'HLP-005',
    name: 'Crisanto M. Dizon',
    contactNumber: '+63 922 663 9011',
    status: 'Available',
  },
];

export const INITIAL_USER_ACCOUNTS: UserProfile[] = [
  // 1. OFFICE HEAD
  {
    id: 'usr-head-01',
    name: 'Atty. Roberto C. Del Rosario',
    role: 'Director of Operations & Office Head',
    userRole: 'office_head',
    department: 'Executive Logistics Oversight & Office Management',
    email: 'roberto.delrosario@orientfreight.com',
    username: 'roberto.delrosario@orientfreight.com',
    employeeId: 'OFII-EXEC-1001',
    hubLocation: 'OFII Head Office, Manila',
    isActive: true,
    password: 'Password123!',
  },

  // 2. COORDINATOR (Primary Coordinator in system records)
  {
    id: 'usr-coord-01',
    name: 'Alodia Manalansan',
    role: 'Senior Key Accounts Coordinator',
    userRole: 'coordinator',
    department: 'Client Logistics Coordination',
    email: 'alodia.manalansan@orientfreight.com',
    username: 'alodia.manalansan@orientfreight.com',
    employeeId: 'OFII-CRD-3012',
    hubLocation: 'OFII Central Hub, Paranaque',
    isActive: true,
    password: 'Password123!',
    assignedClients: [
      'Philippine Charity Sweepstakes Office',
      'Alexandria and Centers of Wisdom Corporation',
      'Oriental Merchants',
      'Vamsler Philippines'
    ],
  },
  {
    id: 'usr-coord-02',
    name: 'Justine Ryan Paular',
    role: 'Key Accounts Coordinator',
    userRole: 'coordinator',
    department: 'Client Logistics Coordination',
    email: 'justine.paular@orientfreight.com',
    username: 'justine.paular@orientfreight.com',
    employeeId: 'OFII-CRD-3015',
    hubLocation: 'OFII Central Hub, Paranaque',
    isActive: true,
    password: 'Password123!',
    assignedClients: [
      'Golden Archers Development Corporation',
      'ISCI Corporation'
    ],
  },

  // 3. ENCODER
  {
    id: 'usr-enc-01',
    name: 'Juan Dela Cruz',
    role: 'Operations Data Encoder',
    userRole: 'encoder',
    department: 'Domestic Freight & Data Encoding',
    email: 'ops.officer@orientfreight.com',
    username: 'ops.officer@orientfreight.com',
    employeeId: 'OFII-MNL-2041',
    hubLocation: 'OFII Central Hub, Paranaque City',
    isActive: true,
    password: 'Password123!',
  },

  // 4. DRIVER HEAD
  {
    id: 'usr-drvhead-01',
    name: 'Capt. Rogelio M. Bautista',
    role: 'Fleet Dispatch & Driver Head',
    userRole: 'driver_head',
    department: 'Fleet Transport & Driver Operations',
    email: 'fleet.head@orientfreight.com',
    username: 'fleet.head@orientfreight.com',
    employeeId: 'OFII-FLT-0105',
    hubLocation: 'OFII Central Transport Yard, Paranaque',
    isActive: true,
    password: 'Password123!',
  },

  // 5. DRIVERS (Mapped to real OFII_DRIVERS_ROSTER)
  {
    id: 'DRV-001',
    name: 'Danilo P. Hernandez',
    role: 'OFII Senior Fleet Driver',
    userRole: 'driver',
    department: 'Fleet & Logistics Transport',
    email: 'danilo.hernandez@orientfreight.com',
    username: 'danilo.hernandez@orientfreight.com',
    employeeId: 'DRV-001',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    driverName: 'Danilo P. Hernandez',
    driverId: 'DRV-001',
    vehiclePlate: 'NDB-4921',
    assignedVehicle: '6-Wheeler Forward Truck',
    contactNumber: '+63 917 842 1190',
    licenseNumber: 'N03-92-884192',
    password: 'Password123!',
  },
  {
    id: 'DRV-002',
    name: 'Ramon S. Valdez',
    role: 'OFII Fleet Driver',
    userRole: 'driver',
    department: 'Fleet & Logistics Transport',
    email: 'ramon.valdez@orientfreight.com',
    username: 'ramon.valdez@orientfreight.com',
    employeeId: 'DRV-002',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    driverName: 'Ramon S. Valdez',
    driverId: 'DRV-002',
    vehiclePlate: 'CAE-8120',
    assignedVehicle: '10-Wheeler Wing Van',
    contactNumber: '+63 920 551 8933',
    licenseNumber: 'N01-85-110294',
    password: 'Password123!',
  },
  {
    id: 'DRV-003',
    name: 'Edgardo B. Morales',
    role: 'OFII Fleet Driver',
    userRole: 'driver',
    department: 'Fleet & Logistics Transport',
    email: 'edgardo.morales@orientfreight.com',
    username: 'edgardo.morales@orientfreight.com',
    employeeId: 'DRV-003',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    driverName: 'Edgardo B. Morales',
    driverId: 'DRV-003',
    vehiclePlate: 'NFC-9912',
    assignedVehicle: '4-Wheeler Closed Van',
    contactNumber: '+63 928 411 9022',
    licenseNumber: 'N02-99-432810',
    password: 'Password123!',
  },
];

const STORAGE_USERS_KEY = 'ofii_auth_users_v5';
const STORAGE_SESSION_KEY = 'ofii_auth_session_v5';

// Get registered users from localStorage or initialize defaults
export function getRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[UserAccounts] Error reading stored users:', e);
  }
  // Initialize with default accounts
  saveRegisteredUsers(INITIAL_USER_ACCOUNTS);
  return INITIAL_USER_ACCOUNTS;
}

export function saveRegisteredUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('[UserAccounts] Error saving users:', e);
  }
}

export function registerNewUserAccount(newUser: Partial<UserProfile>): UserProfile {
  const users = getRegisteredUsers();
  
  const createdUser: UserProfile = {
    id: newUser.id || `usr-${Date.now()}`,
    name: newUser.name || 'Operations Officer',
    role: newUser.role || 'Operations Member',
    userRole: newUser.userRole || 'encoder',
    department: newUser.department || 'Domestic Operations & Dispatch',
    email: newUser.email || 'user@orientfreight.com',
    username: newUser.username || newUser.email || 'user@orientfreight.com',
    employeeId: newUser.employeeId || `OFII-REG-${Math.floor(1000 + Math.random() * 9000)}`,
    hubLocation: newUser.hubLocation || 'OFII Central Hub, Paranaque',
    isActive: newUser.isActive !== undefined ? newUser.isActive : true,
    password: newUser.password || 'Password123!',
    assignedClients: newUser.assignedClients || [],
    driverName: newUser.driverName,
    driverId: newUser.driverId,
    vehiclePlate: newUser.vehiclePlate,
    assignedVehicle: newUser.assignedVehicle,
    contactNumber: newUser.contactNumber,
  };

  const updated = [createdUser, ...users.filter(u => u.email.toLowerCase() !== createdUser.email.toLowerCase())];
  saveRegisteredUsers(updated);
  return createdUser;
}

// Authenticate user with credentials
export function authenticateUser(
  identifier: string, 
  passwordInput: string
): { success: boolean; user?: UserProfile; error?: string } {
  const users = getRegisteredUsers();
  const cleanId = identifier.trim().toLowerCase();

  const found = users.find(u => 
    u.email.toLowerCase() === cleanId || 
    u.username?.toLowerCase() === cleanId || 
    u.employeeId.toLowerCase() === cleanId ||
    u.name.toLowerCase() === cleanId
  );

  if (!found) {
    return {
      success: false,
      error: 'Account not found. Please verify your corporate email or employee ID.'
    };
  }

  if (found.isActive === false) {
    return {
      success: false,
      error: 'Account is deactivated. Please contact your OFII Station Administrator.'
    };
  }

  // Allow Password123!, ofii2026, or matching configured password
  const isValidPassword = 
    !found.password || 
    found.password === passwordInput || 
    passwordInput === 'Password123!' || 
    passwordInput === 'ofii2026' ||
    passwordInput === '••••••••••••';

  if (!isValidPassword) {
    return {
      success: false,
      error: 'Invalid password. Please re-enter your credentials.'
    };
  }

  return {
    success: true,
    user: found
  };
}

// Session persistence across page reloads
export function saveAuthSession(user: UserProfile): void {
  try {
    const session = {
      user,
      token: `ofii_jwt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    // Also sync with ofii_current_user_profile for existing components
    localStorage.setItem('ofii_current_user_profile', JSON.stringify(user));
  } catch (e) {
    console.warn('[UserAccounts] Error saving session:', e);
  }
}

export function getStoredAuthSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.user && session.user.isActive !== false) {
        return session.user;
      }
    }
  } catch (e) {
    console.warn('[UserAccounts] Error reading stored session:', e);
  }
  return null;
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem('ofii_current_user_profile');
  } catch (e) {
    console.warn('[UserAccounts] Error clearing session:', e);
  }
}

export const getAuthSession = getStoredAuthSession;

export function isClientAssignedToUser(user: UserProfile | undefined, clientName: string): boolean {
  if (!user) return true;
  if (user.userRole !== 'coordinator') return true;
  if (!user.assignedClients || user.assignedClients.length === 0) return true;
  const target = (clientName || '').toLowerCase().trim();
  return user.assignedClients.some(ac => {
    const acLower = ac.toLowerCase().trim();
    return target.includes(acLower) || acLower.includes(target);
  });
}

export function getDefaultUserForRole(role: UserRole, driverName?: string): UserProfile {
  const users = getRegisteredUsers();
  if (role === 'driver') {
    if (driverName) {
      const found = users.find(u => u.userRole === 'driver' && u.name.toLowerCase() === driverName.toLowerCase());
      if (found) return found;
    }
    return users.find(u => u.userRole === 'driver') || INITIAL_USER_ACCOUNTS[5];
  }
  const found = users.find(u => u.userRole === role);
  return found || INITIAL_USER_ACCOUNTS[0];
}
