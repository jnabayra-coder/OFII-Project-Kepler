import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ClientSummary, 
  DispatchRecord, 
  ShipmentRecord, 
  ForwardingProgressiveRecord, 
  ForwardingDispatchNotification,
  PODNotification,
  DriverAssignmentNotification,
  BusinessRule,
  DatabaseSyncStatus,
  OperationalRecordType,
  UnifiedShipment,
  DashboardSummary,
  ImportHistoryRecord,
  UserProfile,
  UserRole,
  OFIIDriver,
  DeliveryAssignment
} from '../types';
import { 
  supabase, 
  isSupabaseConfigured 
} from '../lib/supabase';
import { 
  mapClientFromDb, 
  mapClientToDb, 
  mapDispatchFromDb, 
  mapDispatchToDb, 
  mapShipmentFromDb, 
  mapShipmentToDb, 
  mapForwardingFromDb, 
  mapForwardingToDb, 
  mapNotificationFromDb, 
  mapNotificationToDb,
  mapBusinessRuleFromDb,
  checkAndSeedInitialData,
  broadcastDataChange,
  subscribeToCrossTabChanges
} from '../services/dataService';
import { 
  initialClients, 
  initialDispatches, 
  initialShipments, 
  initialForwardingRecords, 
  initialDispatchNotifications,
  initialDriverNotifications,
  DEFAULT_ENCODER_USER,
  OFII_DRIVERS_ROSTER
} from '../data/mockData';
import { getRegisteredUsers, OFII_HELPERS_ROSTER } from '../data/userAccounts';
import { 
  computeDeliveryPerformance, 
  computePodPerformance,
  getAutoDeliveryLeadTime,
  calculatePodReturnDueDate,
  determineAutomaticPodStatus,
} from '../utils/forwardingCalculations';
import { syncPodNotifications } from '../utils/podNotificationEngine';

interface DataContextValue {
  clients: ClientSummary[];
  dispatches: DispatchRecord[];
  shipments: ShipmentRecord[];
  forwardingRecords: ForwardingProgressiveRecord[];
  notifications: ForwardingDispatchNotification[];
  podNotifications: PODNotification[];
  businessRules: BusinessRule[];
  dashboardSummary: DashboardSummary;
  syncStatus: DatabaseSyncStatus;
  importHistory: ImportHistoryRecord[];
  currentUserProfile: UserProfile;
  driverNotifications: DriverAssignmentNotification[];
  deliveryAssignments: DeliveryAssignment[];
  isLoading: boolean;
  loadingMessage: string;
  errorMessage: string | null;
  toastMessage: { message: string; subtext?: string } | null;
  
  // Actions
  setCurrentUserProfile: (user: UserProfile) => void;
  createDeliveryAssignment: (assignmentData: {
    originalDeliveryId: string;
    driver: string;
    driverId?: string;
    helper: string;
    helperId?: string;
    vehicle: string;
    plateNumber: string;
    assignmentDate?: string;
    assignmentTime?: string;
    assignmentStatus?: string;
    assignmentId?: string;
  }) => Promise<DeliveryAssignment>;
  getDeliveryAssignmentByOriginalDeliveryId: (originalDeliveryId: string) => DeliveryAssignment | undefined;
  assignDriverToDelivery: (
    recordId: string, 
    driverName: string, 
    plateNumber?: string, 
    vehicleType?: string, 
    helperName?: string,
    assignedDriverId?: string,
    assignedHelperId?: string
  ) => Promise<void>;
  markDriverNotificationAsRead: (id: string) => Promise<void>;
  markAllDriverNotificationsAsRead: (driverName?: string) => Promise<void>;
  addClient: (clientData: Partial<ClientSummary>) => Promise<ClientSummary>;
  updateClient: (client: ClientSummary) => Promise<void>;
  toggleClientStatus: (id: string, deactivationReason?: string) => Promise<void>;
  addDispatch: (dispatchData: Partial<DispatchRecord>) => Promise<DispatchRecord>;
  updateDispatch: (dispatch: DispatchRecord) => Promise<void>;
  addForwardingRecord: (recordData: Partial<ForwardingProgressiveRecord>) => Promise<ForwardingProgressiveRecord>;
  bulkImportForwardingRecords: (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ) => Promise<void>;
  bulkImportDispatches: (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ) => Promise<void>;
  updateForwardingRecord: (record: ForwardingProgressiveRecord) => Promise<void>;
  clearImportHistory: () => void;
  updateShipment: (shipment: ShipmentRecord) => Promise<void>;
  softDeleteRecord: (id: string, type: OperationalRecordType, reason?: string) => Promise<void>;
  restoreRecord: (id: string, type: OperationalRecordType) => Promise<void>;
  permanentDeleteRecord: (id: string, type: OperationalRecordType) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  completeNotification: (id: string, dispatchId: string) => Promise<void>;
  markPodNotificationAsRead: (id: string) => Promise<void>;
  markAllPodNotificationsAsRead: () => Promise<void>;
  updateDriverProgress: (
    recordId: string,
    currentLocation: string,
    progressStatus: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered'
  ) => Promise<void>;
  markDeliveryAsDelivered: (params: {
    recordId: string;
    receiverName: string;
    dateReceived: string;
    signature?: string;
    remarks?: string;
  }) => Promise<void>;
  refreshData: (showMessage?: boolean) => Promise<void>;
  dismissToast: () => void;
  showSuccessToast: (message: string, subtext?: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State variables for all core operational entities
  const [clients, setClients] = useState<ClientSummary[]>(initialClients);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>(initialDispatches);
  const [shipments, setShipments] = useState<ShipmentRecord[]>(initialShipments);
  const [forwardingRecords, setForwardingRecords] = useState<ForwardingProgressiveRecord[]>(initialForwardingRecords);
  const [notifications, setNotifications] = useState<ForwardingDispatchNotification[]>(initialDispatchNotifications);
  const [podNotifications, setPodNotifications] = useState<PODNotification[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_cache_v4_pod_notifications');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return syncPodNotifications(initialForwardingRecords, initialClients, []);
  });
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  
  const [currentUserProfile, setCurrentUserProfileState] = useState<UserProfile>(() => {
    try {
      const cached = localStorage.getItem('ofii_current_user_profile');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_ENCODER_USER;
  });

  const setCurrentUserProfile = useCallback((user: UserProfile) => {
    setCurrentUserProfileState(user);
    try {
      localStorage.setItem('ofii_current_user_profile', JSON.stringify(user));
    } catch (e) {
      // ignore
    }
  }, []);

  const [driverNotifications, setDriverNotifications] = useState<DriverAssignmentNotification[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_cache_v4_driver_notifications');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return initialDriverNotifications;
  });

  // Phase 1: Delivery Assignments (Separate record linked to original master delivery)
  const [deliveryAssignments, setDeliveryAssignments] = useState<DeliveryAssignment[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_delivery_assignments_v1');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Cache Load] Delivery Assignments error:', e);
    }
    return [];
  });
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([
    {
      id: 'IMP-HIST-001',
      fileName: 'August_25_OFII_Forwarding_Report.xlsx',
      fileSize: '42.5 KB',
      importedAt: 'Aug 25, 2026, 09:30 AM',
      importedBy: 'Alodia Manalansan',
      totalRows: 24,
      successfullyImported: 22,
      warnings: 2,
      skipped: 2,
      status: 'Completed',
    },
  ]);
  
  // System Sync & UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Connecting to database...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; subtext?: string } | null>(null);
  
  const [syncStatus, setSyncStatus] = useState<DatabaseSyncStatus>({
    isConnected: isSupabaseConfigured(),
    isSyncing: false,
    lastSyncedAt: null,
    provider: isSupabaseConfigured() ? 'supabase' : 'shared-cloud-sync',
    errorMessage: null,
  });

  const showSuccessToast = useCallback((message: string, subtext?: string) => {
    setToastMessage({ message, subtext });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // ---------------------------------------------------------------------------
  // 1. DATA RE-FETCHING FROM SUPABASE (Single Source of Truth)
  // ---------------------------------------------------------------------------
  const fetchAllData = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
      setLoadingMessage('Loading operational records from Supabase...');
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

    if (isSupabaseConfigured() && supabase) {
      try {
        await checkAndSeedInitialData();

        // 1. Fetch Clients
        const { data: clientRows, error: clientErr } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (clientErr) throw clientErr;
        if (clientRows && clientRows.length > 0) {
          setClients(clientRows.map(mapClientFromDb));
        }

        // 2. Fetch Dispatches
        const { data: dispatchRows, error: dispatchErr } = await supabase
          .from('dispatches')
          .select('*')
          .order('created_at', { ascending: false });

        if (dispatchErr) throw dispatchErr;
        if (dispatchRows && dispatchRows.length > 0) {
          setDispatches(dispatchRows.map(mapDispatchFromDb));
        }

        // 3. Fetch Shipments
        const { data: shipmentRows, error: shipmentErr } = await supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });

        if (shipmentErr) throw shipmentErr;
        if (shipmentRows && shipmentRows.length > 0) {
          setShipments(shipmentRows.map(mapShipmentFromDb));
        }

        // 4. Fetch Forwarding Records
        const { data: forwardingRows, error: forwardingErr } = await supabase
          .from('forwarding_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (forwardingErr) throw forwardingErr;
        if (forwardingRows && forwardingRows.length > 0) {
          setForwardingRecords(forwardingRows.map(mapForwardingFromDb));
        }

        // 5. Fetch Notifications
        const { data: notifRows, error: notifErr } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (notifErr) throw notifErr;
        if (notifRows && notifRows.length > 0) {
          setNotifications(notifRows.map(mapNotificationFromDb));
        }

        // 6. Fetch Business Rules
        const { data: ruleRows, error: ruleErr } = await supabase
          .from('business_rules')
          .select('*')
          .order('created_at', { ascending: true });

        if (ruleErr) throw ruleErr;
        if (ruleRows && ruleRows.length > 0) {
          setBusinessRules(ruleRows.map(mapBusinessRuleFromDb));
        }

        setSyncStatus({
          isConnected: true,
          isSyncing: false,
          lastSyncedAt: new Date().toLocaleTimeString(),
          provider: 'supabase',
          errorMessage: null,
        });
        setErrorMessage(null);
      } catch (err: any) {
        console.error('[Supabase Fetch] Error:', err);
        setSyncStatus((prev) => ({
          ...prev,
          isConnected: false,
          isSyncing: false,
          errorMessage: err?.message || 'Connection error',
        }));
        setErrorMessage('Unable to load data. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local fallback for offline mode / pre-setup
      // Try to load any previously saved state in localStorage cache to prevent data loss across refreshes
      try {
        const cachedClients = localStorage.getItem('ofii_cache_v4_clients');
        const cachedDispatches = localStorage.getItem('ofii_cache_v4_dispatches');
        const cachedShipments = localStorage.getItem('ofii_cache_v4_shipments');
        const cachedForwarding = localStorage.getItem('ofii_cache_v4_forwarding');
        const cachedNotifications = localStorage.getItem('ofii_cache_v4_notifications');

        if (cachedClients) setClients(JSON.parse(cachedClients));
        if (cachedDispatches) setDispatches(JSON.parse(cachedDispatches));
        if (cachedShipments) setShipments(JSON.parse(cachedShipments));
        if (cachedForwarding) setForwardingRecords(JSON.parse(cachedForwarding));
        if (cachedNotifications) setNotifications(JSON.parse(cachedNotifications));
      } catch (e) {
        console.warn('[Cache Load] Error:', e);
      }

      setSyncStatus({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString(),
        provider: 'shared-cloud-sync',
        errorMessage: null,
      });
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 2. REAL-TIME SUBSCRIPTION & MULTI-TAB BROADCAST SYNC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Initial fetch
    fetchAllData(true);

    // Setup Supabase Realtime channel if configured
    let supabaseChannel: any = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        supabaseChannel = supabase
          .channel('ofii-realtime-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
              console.log('[Supabase Realtime] Change detected:', payload);
              // Immediately fetch latest state
              fetchAllData(false);
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[Supabase Realtime] Subscription error:', err);
      }
    }

    // Setup Cross-Tab BroadcastChannel listener for instant sync
    const unsubscribeBroadcast = subscribeToCrossTabChanges((event) => {
      console.log('[CrossTab Sync] Event received:', event.type);
      fetchAllData(false);
    });

    return () => {
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
      unsubscribeBroadcast();
    };
  }, [fetchAllData]);

  // Persist backup cache when not using Supabase & sync POD Notifications
  useEffect(() => {
    setPodNotifications((prev) => {
      const updated = syncPodNotifications(forwardingRecords, clients, prev);
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    if (!isSupabaseConfigured()) {
      try {
        localStorage.setItem('ofii_cache_v4_clients', JSON.stringify(clients));
        localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(dispatches));
        localStorage.setItem('ofii_cache_v4_shipments', JSON.stringify(shipments));
        localStorage.setItem('ofii_cache_v4_forwarding', JSON.stringify(forwardingRecords));
        localStorage.setItem('ofii_cache_v4_notifications', JSON.stringify(notifications));
      } catch (e) {
        // quota exceeded or private mode
      }
    }
  }, [clients, dispatches, shipments, forwardingRecords, notifications]);

  // ---------------------------------------------------------------------------
  // 3. COMPUTED DASHBOARD SUMMARY (Calculated Dynamically from Real Records)
  // ---------------------------------------------------------------------------
  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const activeDispatches = dispatches.filter((d) => !d.isDeleted);
    const activeForwarding = forwardingRecords.filter((f) => !f.isDeleted);
    const activeShipments = shipments.filter((s) => !s.isDeleted);

    // Total dispatches and shipments - SINGLE SOURCE OF TRUTH: FORWARDING PROGRESSIVE REPORT
    const totalCount = activeForwarding.length > 0 
      ? activeForwarding.length 
      : activeShipments.length;

    const deliveredCount = activeForwarding.length > 0
      ? activeForwarding.filter((f) => f.deliveryStatus === 'Delivered' || Boolean(f.actualDeliveryDate)).length
      : activeDispatches.filter((d) => d.status === 'Delivered').length;

    const delayedCount = activeForwarding.length > 0
      ? activeForwarding.filter((f) => f.deliveryStatus === 'Delayed' || f.deliveryPerformance === 'MISSED').length
      : activeDispatches.filter((d) => d.status === 'Delayed').length;

    const inTransitCount = activeForwarding.length > 0
      ? activeForwarding.filter((f) => f.deliveryStatus === 'In Transit').length
      : activeDispatches.filter((d) => d.status === 'In Transit').length;

    // On-Time Delivery %
    const forwardingDelivered = activeForwarding.filter((f) => f.deliveryStatus === 'Delivered' || Boolean(f.actualDeliveryDate));
    const forwardingHits = forwardingDelivered.filter((f) => f.deliveryPerformance === 'HIT');
    const onTimeRate = forwardingDelivered.length > 0 
      ? Math.round((forwardingHits.length / forwardingDelivered.length) * 1000) / 10
      : 0;

    // Active Trucks
    const uniquePlates = new Set(activeDispatches.filter(d => d.plateNumber && d.status !== 'Delivered').map(d => d.plateNumber));
    const activeTrucks = uniquePlates.size;

    // Total Cases/Boxes
    const totalBoxes = activeDispatches.reduce((sum, d) => sum + (Number(d.quantityCasesBoxes) || 0), 0);

    return {
      totalShipments: totalCount,
      inTransit: inTransitCount,
      delivered: deliveredCount,
      delayed: delayedCount,
      onTimePercentage: onTimeRate,
      activeTrucks: activeTrucks,
      totalBoxesToday: totalBoxes,
    };
  }, [dispatches, forwardingRecords, shipments]);

  // ---------------------------------------------------------------------------
  // 4. CLIENT CRUD OPERATIONS
  // ---------------------------------------------------------------------------
  const addClient = async (clientData: Partial<ClientSummary>): Promise<ClientSummary> => {
    const cleanName = (clientData.name || 'New Client').trim();
    const acronym = cleanName.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase();
    const clientCode = clientData.code || `${acronym}-${Math.floor(100 + Math.random() * 900)}`;
    const newId = clientData.id || `client-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newClient: ClientSummary = {
      id: newId,
      name: cleanName,
      code: clientCode,
      accountManager: clientData.accountManager || 'Maria Santos (OFII Key Accounts)',
      industry: clientData.industry || 'Commercial Freight & Logistics Consignment',
      activeShipments: clientData.activeShipments ?? 0,
      deliveredThisMonth: clientData.deliveredThisMonth ?? 0,
      onTimeRate: clientData.onTimeRate ?? 98.0,
      primaryContact: clientData.primaryContact || 'Logistics Coordinator',
      email: clientData.email || `logistics@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com.ph`,
      phone: clientData.phone || '+63 (2) 8876-0000',
      address: clientData.address || 'Metro Manila Logistics Terminal',
      area: clientData.area || 'NCR / Metro Manila',
      remarks: clientData.remarks || '',
      notes: clientData.notes || '',
      tin: clientData.tin || '',
      isDeactivated: false,
      isDeleted: false,
      ...clientData,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapClientToDb(newClient);
      const { error } = await supabase.from('clients').insert(dbPayload);
      if (error) {
        console.error('[Supabase addClient] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
    broadcastDataChange('CLIENT_ADDED', newClient);
    showSuccessToast('Client saved successfully.', `${newClient.name} is now available across all modules.`);
    return newClient;
  };

  const updateClient = async (updated: ClientSummary): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapClientToDb(updated);
      const { error } = await supabase.from('clients').update(dbPayload).eq('id', updated.id);
      if (error) {
        console.error('[Supabase updateClient] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    broadcastDataChange('CLIENT_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Client ${updated.name} updated.`);
  };

  const toggleClientStatus = async (id: string, deactivationReason?: string): Promise<void> => {
    const target = clients.find((c) => c.id === id);
    if (!target) return;

    const willDeactivate = !target.isDeactivated;
    const updated: ClientSummary = {
      ...target,
      isDeactivated: willDeactivate,
      deactivatedAt: willDeactivate ? new Date().toISOString() : undefined,
      deactivatedBy: willDeactivate ? 'Operations Officer' : undefined,
      deactivationReason: willDeactivate ? deactivationReason : undefined,
    };

    await updateClient(updated);
  };

  // ---------------------------------------------------------------------------
  // 5. DISPATCH CRUD OPERATIONS
  // ---------------------------------------------------------------------------
  const addDispatch = async (dispatchData: Partial<DispatchRecord>): Promise<DispatchRecord> => {
    const newId = dispatchData.id || `DSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const arrival = dispatchData.timeArrived || dispatchData.truckArrivalTime || '07:30 AM';
    const startLoad = dispatchData.startLoadingTime || dispatchData.loadingStartTime || '08:00 AM';
    const endLoad = dispatchData.endLoadingTime || dispatchData.loadingEndTime || '09:15 AM';
    const departure = dispatchData.actualDepartureTime || dispatchData.departureTime || '09:45 AM';

    const newDispatch: DispatchRecord = {
      id: newId,
      deliveryDate: dispatchData.deliveryDate || '2026-08-25',
      deliveryArea: dispatchData.deliveryArea || dispatchData.area || 'Luzon',
      area: dispatchData.deliveryArea || dispatchData.area || 'Luzon',
      podNumber: dispatchData.podNumber || `POD-${Math.floor(100000 + Math.random() * 900000)}`,
      quantityCasesBoxes: dispatchData.quantityCasesBoxes ?? 100,
      unit: dispatchData.unit || 'Boxes',
      deliveryType: dispatchData.deliveryType || 'GADC',
      destination: dispatchData.destination || 'Metro Manila Terminal',
      consignee: dispatchData.consignee || 'Consignee Enterprise',
      truckProvider: dispatchData.truckProvider || 'OFII Fleet Logistics',
      plateNumber: dispatchData.plateNumber || 'NDB-4921',
      truckArrivalTime: arrival,
      loadingStartTime: startLoad,
      loadingEndTime: endLoad,
      departureTime: departure,
      timeArrived: arrival,
      startLoadingTime: startLoad,
      endLoadingTime: endLoad,
      actualDepartureTime: departure,
      plannedDeliveryDate: dispatchData.plannedDeliveryDate || dispatchData.deliveryDate || '2026-08-26',
      manifestNumber: dispatchData.manifestNumber || `MNF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      remarks: dispatchData.remarks || 'Standard scheduled freight dispatch.',
      status: dispatchData.status || 'In Transit',
      driverName: dispatchData.driverName || 'Danilo P. Hernandez',
      driverContact: dispatchData.driverContact || '+63 917 842 1190',
      clientName: dispatchData.clientName || 'General Client',
      totalWeightKg: dispatchData.totalWeightKg ?? ((dispatchData.quantityCasesBoxes || 100) * 12),
      isDeleted: false,
      ...dispatchData,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapDispatchToDb(newDispatch);
      const { error } = await supabase.from('dispatches').insert(dbPayload);
      if (error) {
        console.error('[Supabase addDispatch] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setDispatches((prev) => {
      const next = [newDispatch, ...prev.filter((d) => d.id !== newDispatch.id)];
      try {
        localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Check if there is an associated notification to complete
    const matchingNotif = notifications.find(
      (n) => n.podNumber === newDispatch.podNumber || n.consignee === newDispatch.consignee
    );
    if (matchingNotif && matchingNotif.status !== 'COMPLETED') {
      completeNotification(matchingNotif.id, newDispatch.id);
    }

    // Synchronize operational fields to matching master Forwarding record without duplicating shipments
    setForwardingRecords((prev) =>
      prev.map((f) => {
        if (
          (newDispatch.podNumber && f.podNumber && f.podNumber.trim().toLowerCase() === newDispatch.podNumber.trim().toLowerCase()) ||
          (newDispatch.manifestNumber && f.referenceNumber && f.referenceNumber.trim().toLowerCase() === newDispatch.manifestNumber.trim().toLowerCase())
        ) {
          return {
            ...f,
            plateNumber: newDispatch.plateNumber || f.plateNumber,
            truckProvider: newDispatch.truckProvider || f.truckProvider,
            driverName: newDispatch.driverName || f.driverName,
            timeArrived: newDispatch.timeArrived || f.timeArrived,
            startLoadingTime: newDispatch.startLoadingTime || f.startLoadingTime,
            endLoadingTime: newDispatch.endLoadingTime || f.endLoadingTime,
            actualDepartureTime: newDispatch.actualDepartureTime || f.actualDepartureTime,
            truckArrivalTime: newDispatch.truckArrivalTime || f.truckArrivalTime,
            loadingStartTime: newDispatch.loadingStartTime || f.loadingStartTime,
            loadingEndTime: newDispatch.loadingEndTime || f.loadingEndTime,
            departureTime: newDispatch.departureTime || f.departureTime,
            deliveryStatus: newDispatch.status === 'Delivered'
              ? 'Delivered'
              : (newDispatch.status === 'Delayed' ? 'Delayed' : (newDispatch.status === 'Departed' || newDispatch.status === 'In Transit' ? 'In Transit' : f.deliveryStatus)),
          };
        }
        return f;
      })
    );

    broadcastDataChange('DISPATCH_ADDED', newDispatch);
    showSuccessToast('Dispatch saved successfully.', `POD: ${newDispatch.podNumber} for ${newDispatch.clientName}`);
    return newDispatch;
  };

  const updateDispatch = async (updated: DispatchRecord): Promise<void> => {
    const arrival = updated.timeArrived || updated.truckArrivalTime || '07:30 AM';
    const startLoad = updated.startLoadingTime || updated.loadingStartTime || '08:00 AM';
    const endLoad = updated.endLoadingTime || updated.loadingEndTime || '09:15 AM';
    const departure = updated.actualDepartureTime || updated.departureTime || '09:45 AM';

    const normalizedUpdated: DispatchRecord = {
      ...updated,
      timeArrived: arrival,
      startLoadingTime: startLoad,
      endLoadingTime: endLoad,
      actualDepartureTime: departure,
      truckArrivalTime: arrival,
      loadingStartTime: startLoad,
      loadingEndTime: endLoad,
      departureTime: departure,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapDispatchToDb(normalizedUpdated);
      const { error } = await supabase.from('dispatches').update(dbPayload).eq('id', normalizedUpdated.id);
      if (error) {
        console.error('[Supabase updateDispatch] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setDispatches((prev) => {
      const next = prev.map((d) => (d.id === normalizedUpdated.id ? normalizedUpdated : d));
      try {
        localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    
    // Also synchronize corresponding master Forwarding record if present
    setForwardingRecords((prev) =>
      prev.map((f) => {
        if (
          (normalizedUpdated.podNumber && f.podNumber && f.podNumber.trim().toLowerCase() === normalizedUpdated.podNumber.trim().toLowerCase()) ||
          (normalizedUpdated.manifestNumber && f.referenceNumber && f.referenceNumber.trim().toLowerCase() === normalizedUpdated.manifestNumber.trim().toLowerCase()) ||
          f.id === normalizedUpdated.id
        ) {
          return {
            ...f,
            plateNumber: normalizedUpdated.plateNumber || f.plateNumber,
            truckProvider: normalizedUpdated.truckProvider || f.truckProvider,
            driverName: normalizedUpdated.driverName || f.driverName,
            timeArrived: normalizedUpdated.timeArrived || f.timeArrived,
            startLoadingTime: normalizedUpdated.startLoadingTime || f.startLoadingTime,
            endLoadingTime: normalizedUpdated.endLoadingTime || f.endLoadingTime,
            actualDepartureTime: normalizedUpdated.actualDepartureTime || f.actualDepartureTime,
            truckArrivalTime: normalizedUpdated.timeArrived || f.truckArrivalTime,
            loadingStartTime: normalizedUpdated.startLoadingTime || f.loadingStartTime,
            loadingEndTime: normalizedUpdated.endLoadingTime || f.loadingEndTime,
            departureTime: normalizedUpdated.actualDepartureTime || f.departureTime,
            deliveryStatus: normalizedUpdated.status === 'Delivered'
              ? 'Delivered'
              : (normalizedUpdated.status === 'Delayed' ? 'Delayed' : (normalizedUpdated.status === 'Departed' || normalizedUpdated.status === 'In Transit' ? 'In Transit' : f.deliveryStatus)),
          };
        }
        return f;
      })
    );

    // Also synchronize corresponding shipment if present
    setShipments((prev) =>
      prev.map((s) => {
        if (s.podNumber === normalizedUpdated.podNumber || s.id === normalizedUpdated.id) {
          return {
            ...s,
            status: normalizedUpdated.status === 'Delivered' ? 'Delivered' : (normalizedUpdated.status === 'Delayed' ? 'Delayed' : 'In Transit'),
            plateNumber: normalizedUpdated.plateNumber,
            manifestNumber: normalizedUpdated.manifestNumber,
            timeArrived: normalizedUpdated.timeArrived,
            startLoadingTime: normalizedUpdated.startLoadingTime,
            endLoadingTime: normalizedUpdated.endLoadingTime,
            actualDepartureTime: normalizedUpdated.actualDepartureTime,
            truckArrivalTime: normalizedUpdated.timeArrived,
            loadingStartTime: normalizedUpdated.startLoadingTime,
            loadingEndTime: normalizedUpdated.endLoadingTime,
            departureTime: normalizedUpdated.actualDepartureTime,
          };
        }
        return s;
      })
    );

    broadcastDataChange('DISPATCH_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Dispatch POD: ${updated.podNumber} updated to ${updated.status}.`);
  };

  // ---------------------------------------------------------------------------
  // 6. FORWARDING RECORD CRUD OPERATIONS (With Automated SLA Rules & Notifications)
  // ---------------------------------------------------------------------------
  const addForwardingRecord = async (
    recordData: Partial<ForwardingProgressiveRecord>
  ): Promise<ForwardingProgressiveRecord> => {
    const newId = recordData.id || `FPR-2026-${Math.floor(100 + Math.random() * 900)}`;
    const clientName = recordData.client || 'General Cargo';
    const mode = recordData.modeOfShipment || 'Land Freight';
    const area = recordData.area || 'Luzon';

    // Automated SLA Lead Time Lookup (evaluates business rules)
    const isISCI = clientName.toLowerCase().includes('intelligent skin care') || clientName.toLowerCase().includes('isci');
    const isRORO = mode === 'RORO';
    const isVisayas = area === 'Visayas';
    const calculatedLeadTime = (isISCI && isRORO && isVisayas) 
      ? 13 
      : (recordData.deliveryLeadTimeDays || getAutoDeliveryLeadTime(clientName, mode, area));

    const dispatchDate = recordData.actualDispatchDate || '2026-08-25';
    const actualDelivery = recordData.actualDeliveryDate || '';
    const podReturn = recordData.dateOfPodReturn || '';

    // Calculate TAT and Performance
    let deliveryTat = 0;
    let deliveryPerf = recordData.deliveryPerformance || 'PENDING';
    if (dispatchDate && actualDelivery) {
      const res = computeDeliveryPerformance(dispatchDate, actualDelivery, calculatedLeadTime);
      deliveryTat = res.tatDays;
      deliveryPerf = res.performance;
    }

    const podDueRes = calculatePodReturnDueDate(actualDelivery, clientName, area);
    const autoPod = determineAutomaticPodStatus({
      actualDeliveryDate: actualDelivery,
      podReturnDueDate: recordData.podReturnDueDate || podDueRes.podReturnDueDate,
      actualPodReturnDate: podReturn,
      clientName,
      deliveryArea: area,
    });

    const newRecord: ForwardingProgressiveRecord = {
      id: newId,
      month: recordData.month || 'August 2026',
      coordinator: recordData.coordinator || 'Maria Santos',
      client: clientName,
      clientId: recordData.clientId,
      modeOfShipment: mode,
      area: area,
      referenceNumber: recordData.referenceNumber || `PRJ-${clientName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      actualDispatchDate: dispatchDate,
      consignee: recordData.consignee || 'Consignee Facility',
      destinationCode: recordData.destinationCode || 'MNL-01',
      quantity: recordData.quantity ?? 100,
      unit: recordData.unit || 'Boxes',
      courier: recordData.courier || 'OFII Fleet Logistics',
      cbm: recordData.cbm,
      volumeWeightKg: recordData.volumeWeightKg,
      actualWeightKg: recordData.actualWeightKg ?? ((recordData.quantity ?? 100) * 12),
      chargeableWeightFees: recordData.chargeableWeightFees || 'PHP 25,000.00',
      declaredValue: recordData.declaredValue || 'PHP 1,000,000.00',
      podNumber: recordData.podNumber || `POD-${Math.floor(100000 + Math.random() * 900000)}`,
      awbCourierRefNumber: recordData.awbCourierRefNumber || `AWB-${Math.floor(10000 + Math.random() * 90000)}`,
      deliveryStatus: recordData.deliveryStatus || (actualDelivery ? 'Delivered' : 'In Transit'),
      receiversName: recordData.receiversName || '',
      actualDeliveryDate: actualDelivery,
      deliveryLeadTimeDays: calculatedLeadTime,
      deliveryTatDays: deliveryTat,
      deliveryPerformance: deliveryPerf,
      reasonForDelay: recordData.reasonForDelay,
      podStatus: autoPod.status,
      dateOfPodReturn: podReturn,
      podLeadTimeDays: podDueRes.podLeadTimeDays,
      podReturnDueDate: podDueRes.podReturnDueDate || undefined,
      podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted || undefined,
      podTatDays: autoPod.podTatDays,
      podPerformance: autoPod.podPerformance,
      podReasonForDelay: recordData.podReasonForDelay,
      isDeleted: false,
      ...recordData,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapForwardingToDb(newRecord);
      const { error } = await supabase.from('forwarding_records').insert(dbPayload);
      if (error) {
        console.error('[Supabase addForwardingRecord] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setForwardingRecords((prev) => [newRecord, ...prev.filter((f) => f.id !== newRecord.id)]);

    // Mirror to shipments with exact same ID & POD so system-wide shipment count is unified
    const newShipment: ShipmentRecord = {
      id: newRecord.id,
      client: newRecord.client,
      clientId: newRecord.clientId,
      monthStarted: new Date().toLocaleDateString('en-US', { month: 'long' }),
      bookedDate: newRecord.actualDispatchDate,
      pickupDate: newRecord.actualDispatchDate,
      deliveryDate: newRecord.actualDeliveryDate || newRecord.plannedDeliveryDate,
      consignee: newRecord.consignee,
      destination: `${newRecord.destinationCode || ''} - ${newRecord.consignee}`,
      modeOfShipment: newRecord.modeOfShipment,
      quantityBoxes: newRecord.quantity,
      actualWeightKg: newRecord.actualWeightKg,
      status: newRecord.deliveryStatus === 'Delivered' ? 'Delivered' : (newRecord.deliveryStatus === 'Delayed' ? 'Delayed' : (newRecord.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked')),
      area: newRecord.area,
      podNumber: newRecord.podNumber,
      plateNumber: newRecord.plateNumber,
      manifestNumber: newRecord.referenceNumber,
      awbNumber: newRecord.referenceNumber,
      datePodReceived: newRecord.dateOfPodReturn,
      podStatus: newRecord.podStatus,
      isDeleted: false,
    };
    setShipments((prev) => [newShipment, ...prev.filter((s) => s.id !== newShipment.id && s.podNumber !== newShipment.podNumber)]);

    // 10. FORWARDING -> DISPATCH WORKFLOW: Create dispatch notification for required completion
    const newNotification: ForwardingDispatchNotification = {
      id: `FDN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      forwardingRecordId: newRecord.id,
      client: newRecord.client,
      clientId: newRecord.clientId,
      consignee: newRecord.consignee,
      podNumber: newRecord.podNumber,
      referenceNumber: newRecord.referenceNumber,
      deliveryDate: newRecord.actualDispatchDate,
      modeOfShipment: newRecord.modeOfShipment,
      area: newRecord.area,
      quantity: newRecord.quantity,
      unit: newRecord.unit,
      destination: `${newRecord.destinationCode} - ${newRecord.consignee}`,
      destinationCode: newRecord.destinationCode,
      source: 'Forwarding Progressive Report',
      message: 'New shipment added. Dispatch record requires completion.',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const notifDbPayload = mapNotificationToDb(newNotification);
      await supabase.from('notifications').insert(notifDbPayload);
    }
    setNotifications((prev) => [newNotification, ...prev]);

    broadcastDataChange('FORWARDING_ADDED', newRecord);
    showSuccessToast('Forwarding record saved successfully.', `POD: ${newRecord.podNumber} • Action item logged in Notifications.`);
    return newRecord;
  };

  const clearImportHistory = useCallback(() => {
    setImportHistory([]);
  }, []);

  const bulkImportForwardingRecords = async (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ): Promise<void> => {
    if (!records || records.length === 0) return;

    if (isSupabaseConfigured() && supabase) {
      try {
        const dbPayloads = records.map(mapForwardingToDb);
        const { error } = await supabase.from('forwarding_records').upsert(dbPayloads);
        if (error) {
          console.error('[Supabase bulkImportForwardingRecords] Error:', error);
        }
      } catch (err) {
        console.error('[Supabase bulkImportForwardingRecords] Exception:', err);
      }
    }

    // Append to existing prototype data - NEVER replace or lose existing records
    setForwardingRecords((prev) => {
      const newIds = new Set(records.map((r) => r.id));
      return [...records, ...prev.filter((p) => !newIds.has(p.id))];
    });

    // Also synchronize to shipments collection
    const syncedShipments: ShipmentRecord[] = records.map((rec) => ({
      id: rec.id,
      client: rec.client,
      clientId: rec.clientId,
      monthStarted: new Date().toLocaleDateString('en-US', { month: 'long' }),
      bookedDate: rec.actualDispatchDate,
      pickupDate: rec.actualDispatchDate,
      deliveryDate: rec.actualDeliveryDate || rec.plannedDeliveryDate,
      consignee: rec.consignee,
      destination: `${rec.destinationCode || ''} - ${rec.consignee}`,
      modeOfShipment: rec.modeOfShipment,
      quantityBoxes: rec.quantity,
      actualWeightKg: rec.actualWeightKg,
      status: rec.deliveryStatus === 'Delivered' ? 'Delivered' : (rec.deliveryStatus === 'Delayed' ? 'Delayed' : (rec.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked')),
      area: rec.area,
      podNumber: rec.podNumber,
      plateNumber: rec.plateNumber,
      manifestNumber: rec.referenceNumber,
      awbNumber: rec.referenceNumber,
      datePodReceived: rec.dateOfPodReturn,
      podStatus: rec.podStatus,
      isDeleted: false,
    }));
    const newRecordIds = new Set(records.map((r) => r.id));
    setShipments((prev) => [...syncedShipments, ...prev.filter((p) => !newRecordIds.has(p.id))]);

    // Create notifications for Daily Dispatching for imported forwarding records
    const newNotifs: ForwardingDispatchNotification[] = records.map((rec, i) => ({
      id: `FDN-IMP-${Date.now().toString().slice(-6)}-${i + 1}`,
      forwardingRecordId: rec.id,
      client: rec.client,
      clientId: rec.clientId,
      consignee: rec.consignee,
      podNumber: rec.podNumber,
      referenceNumber: rec.referenceNumber,
      deliveryDate: rec.actualDispatchDate,
      modeOfShipment: rec.modeOfShipment,
      area: rec.area,
      quantity: rec.quantity,
      unit: rec.unit,
      destination: `${rec.destinationCode || ''} - ${rec.consignee}`,
      destinationCode: rec.destinationCode,
      source: 'Forwarding Progressive Report',
      message: 'Imported shipment requires dispatch completion.',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    }));
    setNotifications((prev) => [...newNotifs, ...prev]);

    // Track in Import History
    const historyEntry: ImportHistoryRecord = {
      id: `IMP-HIST-${Date.now()}`,
      fileName: meta?.fileName || 'Imported_Forwarding_Report.xlsx',
      fileSize: meta?.fileSize || '38.5 KB',
      importedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      importedBy: 'Alodia Manalansan',
      totalRows: meta?.totalRows || records.length,
      successfullyImported: meta?.importedCount || records.length,
      warnings: meta?.warningCount || 0,
      skipped: meta?.skippedCount || 0,
      status: (meta?.skippedCount || 0) > 0 && (meta?.importedCount || records.length) > 0 ? 'Partially Completed' : 'Completed',
    };
    setImportHistory((prev) => [historyEntry, ...prev]);

    broadcastDataChange('FORWARDING_BULK_IMPORTED', records);
    showSuccessToast(
      'Excel records imported successfully.',
      `${records.length} records added to Forwarding Progressive Report.`
    );
  };

  const bulkImportDispatches = async (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ): Promise<void> => {
    if (!records || records.length === 0) return;

    const newDispatches: DispatchRecord[] = records.map((rec, i) => {
      const arr = rec.timeArrived || rec.truckArrivalTime || '07:30 AM';
      const startLoad = rec.startLoadingTime || rec.loadingStartTime || '08:00 AM';
      const endLoad = rec.endLoadingTime || rec.loadingEndTime || '09:15 AM';
      const dep = rec.actualDepartureTime || rec.departureTime || '09:45 AM';

      return {
        id: `DSP-IMP-${Date.now().toString().slice(-6)}-${i + 1}`,
        deliveryDate: rec.actualDispatchDate || '2026-08-25',
        plannedDeliveryDate: rec.plannedDeliveryDate || rec.actualDispatchDate || '2026-08-26',
        clientName: rec.client,
        consignee: rec.consignee,
        destination: rec.destination || `${rec.destinationCode || 'HUB'} - ${rec.consignee}`,
        truckProvider: rec.truckProvider || rec.courier || 'OFII Fleet Logistics',
        plateNumber: rec.plateNumber || 'NDB-4921',
        driverName: rec.driverName || 'Danilo P. Hernandez',
        driverContact: '0917-882-9912',
        truckArrivalTime: arr,
        loadingStartTime: startLoad,
        loadingEndTime: endLoad,
        departureTime: dep,
        timeArrived: arr,
        startLoadingTime: startLoad,
        endLoadingTime: endLoad,
        actualDepartureTime: dep,
        manifestNumber: rec.referenceNumber || `MNF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        podNumber: rec.podNumber,
        deliveryType: (rec.deliveryType === 'GADC' || rec.deliveryType === 'ISCI' || rec.deliveryType === 'XSEED' || rec.deliveryType === 'LTL' || rec.deliveryType === 'FTL' || rec.deliveryType === 'Inter-Island' || rec.deliveryType === 'Air Freight') ? rec.deliveryType : 'FTL',
        quantityCasesBoxes: rec.quantity || 100,
        unit: rec.unit || 'Boxes',
        status: rec.deliveryStatus === 'Delivered' ? 'Delivered' : (rec.deliveryStatus === 'Delayed' ? 'Delayed' : 'In Transit'),
        totalWeightKg: rec.actualWeightKg || ((rec.quantity || 100) * 12),
        remarks: rec.reasonForDelay || 'Bulk imported via Daily Dispatch Excel',
        isDeleted: false,
        importSource: 'Excel Import',
        importedAt: new Date().toISOString(),
      };
    });

    if (isSupabaseConfigured() && supabase) {
      try {
        const dbPayloads = newDispatches.map(mapDispatchToDb);
        const { error } = await supabase.from('dispatches').upsert(dbPayloads);
        if (error) {
          console.error('[Supabase bulkImportDispatches] Error:', error);
        }
      } catch (err) {
        console.error('[Supabase bulkImportDispatches] Exception:', err);
      }
    }

    // Append to dispatches - NEVER replace or lose existing records
    setDispatches((prev) => {
      const newIds = new Set(newDispatches.map((d) => d.id));
      return [...newDispatches, ...prev.filter((p) => !newIds.has(p.id))];
    });

    // Track in Import History
    const historyEntry: ImportHistoryRecord = {
      id: `IMP-HIST-${Date.now()}`,
      fileName: meta?.fileName || 'Imported_Daily_Dispatch.xlsx',
      fileSize: meta?.fileSize || '35.0 KB',
      importedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      importedBy: 'Justine Ryan Paular',
      totalRows: meta?.totalRows || newDispatches.length,
      successfullyImported: meta?.importedCount || newDispatches.length,
      warnings: meta?.warningCount || 0,
      skipped: meta?.skippedCount || 0,
      status: (meta?.skippedCount || 0) > 0 && (meta?.importedCount || newDispatches.length) > 0 ? 'Partially Completed' : 'Completed',
    };
    setImportHistory((prev) => [historyEntry, ...prev]);

    // Synchronize operational fields to matching master Forwarding records without duplicating shipments
    setForwardingRecords((prev) =>
      prev.map((f) => {
        const matchingDispatch = newDispatches.find(
          (d) =>
            (d.podNumber && f.podNumber && d.podNumber.trim().toLowerCase() === f.podNumber.trim().toLowerCase()) ||
            (d.manifestNumber && f.referenceNumber && d.manifestNumber.trim().toLowerCase() === f.referenceNumber.trim().toLowerCase())
        );
        if (matchingDispatch) {
          return {
            ...f,
            plateNumber: matchingDispatch.plateNumber || f.plateNumber,
            truckProvider: matchingDispatch.truckProvider || f.truckProvider,
            driverName: matchingDispatch.driverName || f.driverName,
            timeArrived: matchingDispatch.timeArrived || f.timeArrived,
            startLoadingTime: matchingDispatch.startLoadingTime || f.startLoadingTime,
            endLoadingTime: matchingDispatch.endLoadingTime || f.endLoadingTime,
            actualDepartureTime: matchingDispatch.actualDepartureTime || f.actualDepartureTime,
            truckArrivalTime: matchingDispatch.truckArrivalTime || f.truckArrivalTime,
            loadingStartTime: matchingDispatch.loadingStartTime || f.loadingStartTime,
            loadingEndTime: matchingDispatch.loadingEndTime || f.loadingEndTime,
            departureTime: matchingDispatch.departureTime || f.departureTime,
            deliveryStatus: matchingDispatch.status === 'Delivered'
              ? 'Delivered'
              : (matchingDispatch.status === 'Delayed' ? 'Delayed' : (matchingDispatch.status === 'Departed' || matchingDispatch.status === 'In Transit' ? 'In Transit' : f.deliveryStatus)),
          };
        }
        return f;
      })
    );

    // Complete any matching pending notifications for dispatch
    newDispatches.forEach((d) => {
      const matchingNotif = notifications.find(
        (n) => n.podNumber === d.podNumber || (n.consignee === d.consignee && n.deliveryDate === d.deliveryDate)
      );
      if (matchingNotif && matchingNotif.status !== 'COMPLETED') {
        completeNotification(matchingNotif.id, d.id);
      }
    });

    broadcastDataChange('DISPATCH_BULK_IMPORTED', newDispatches);
    showSuccessToast(
      'Excel dispatches imported successfully.',
      `${newDispatches.length} dispatch records added to Daily Dispatching Monitoring.`
    );
  };

  const updateForwardingRecord = async (updated: ForwardingProgressiveRecord): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapForwardingToDb(updated);
      const { error } = await supabase.from('forwarding_records').update(dbPayload).eq('id', updated.id);
      if (error) {
        console.error('[Supabase updateForwardingRecord] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setForwardingRecords((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id === updated.id || (updated.podNumber && s.podNumber === updated.podNumber)) {
          return {
            ...s,
            client: updated.client || s.client,
            clientId: updated.clientId || s.clientId,
            consignee: updated.consignee || s.consignee,
            destination: `${updated.destinationCode || ''} - ${updated.consignee}`,
            modeOfShipment: updated.modeOfShipment || s.modeOfShipment,
            quantityBoxes: updated.quantity || s.quantityBoxes,
            actualWeightKg: updated.actualWeightKg || s.actualWeightKg,
            deliveryDate: updated.actualDeliveryDate || updated.plannedDeliveryDate || s.deliveryDate,
            status: updated.deliveryStatus === 'Delivered' ? 'Delivered' : (updated.deliveryStatus === 'Delayed' ? 'Delayed' : (updated.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked')),
            podNumber: updated.podNumber || s.podNumber,
            datePodReceived: updated.dateOfPodReturn || s.datePodReceived,
            podStatus: updated.podStatus || s.podStatus,
            plateNumber: updated.plateNumber || s.plateNumber,
            manifestNumber: updated.referenceNumber || s.manifestNumber,
          };
        }
        return s;
      })
    );
    broadcastDataChange('FORWARDING_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Forwarding Record ${updated.podNumber} updated.`);
  };

  const updateShipment = async (updated: ShipmentRecord): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapShipmentToDb(updated);
      const { error } = await supabase.from('shipments').update(dbPayload).eq('id', updated.id);
      if (error) {
        console.error('[Supabase updateShipment] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    broadcastDataChange('SHIPMENT_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Shipment ${updated.id} updated.`);
  };

  // ---------------------------------------------------------------------------
  // 7. SOFT DELETE & RECOVERY (Trash)
  // ---------------------------------------------------------------------------
  const softDeleteRecord = async (
    id: string,
    type: OperationalRecordType,
    reason?: string
  ): Promise<void> => {
    const timestamp = new Date().toISOString();
    const user = 'Operations Officer';

    if (type === 'dispatch') {
      const target = dispatches.find((d) => d.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('dispatches').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setDispatches((prev) => {
          const next = prev.map((d) => (d.id === id ? updated : d));
          try {
            localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    } else if (type === 'forwarding_report') {
      const target = forwardingRecords.find((f) => f.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('forwarding_records').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setForwardingRecords((prev) => prev.map((f) => (f.id === id ? updated : f)));
      }
    } else if (type === 'shipment') {
      const target = shipments.find((s) => s.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('shipments').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setShipments((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } else if (type === 'client') {
      const target = clients.find((c) => c.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('clients').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    }

    broadcastDataChange('RECORD_SOFT_DELETED', { id, type });
    showSuccessToast('Record moved to Recently Deleted (Trash).', 'You can restore or permanently delete it at any time.');
  };

  const restoreRecord = async (id: string, type: OperationalRecordType): Promise<void> => {
    if (type === 'dispatch') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('dispatches').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setDispatches((prev) => {
        const next = prev.map((d) => (d.id === id ? { ...d, isDeleted: false, deletedAt: undefined } : d));
        try {
          localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } else if (type === 'forwarding_report') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('forwarding_records').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setForwardingRecords((prev) => prev.map((f) => (f.id === id ? { ...f, isDeleted: false, deletedAt: undefined } : f)));
    } else if (type === 'shipment') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('shipments').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, isDeleted: false, deletedAt: undefined } : s)));
    } else if (type === 'client') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('clients').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, isDeleted: false, deletedAt: undefined } : c)));
    }

    broadcastDataChange('RECORD_RESTORED', { id, type });
    showSuccessToast('Record restored successfully.', 'The record is now active and included in all operational calculations.');
  };

  const permanentDeleteRecord = async (id: string, type: OperationalRecordType): Promise<void> => {
    if (type === 'dispatch') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('dispatches').delete().eq('id', id);
      }
      setDispatches((prev) => {
        const next = prev.filter((d) => d.id !== id);
        try {
          localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } else if (type === 'forwarding_report') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('forwarding_records').delete().eq('id', id);
      }
      setForwardingRecords((prev) => prev.filter((f) => f.id !== id));
    } else if (type === 'shipment') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('shipments').delete().eq('id', id);
      }
      setShipments((prev) => prev.filter((s) => s.id !== id));
    } else if (type === 'client') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('clients').delete().eq('id', id);
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
    }

    broadcastDataChange('RECORD_PERMANENT_DELETED', { id, type });
    showSuccessToast('Record permanently removed.', 'The record has been purged from the database.');
  };

  // ---------------------------------------------------------------------------
  // 8. NOTIFICATION ACTIONS
  // ---------------------------------------------------------------------------
  const dismissNotification = async (id: string): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('notifications').update({ is_dismissed: true }).eq('id', id);
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isDismissed: true } : n)));
    broadcastDataChange('NOTIFICATION_DISMISSED', { id });
  };

  const completeNotification = async (id: string, dispatchId: string): Promise<void> => {
    const timestamp = new Date().toISOString();
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('notifications')
        .update({ status: 'COMPLETED', completed_at: timestamp, completed_dispatch_id: dispatchId })
        .eq('id', id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'COMPLETED', completedAt: timestamp, completedDispatchId: dispatchId } : n))
    );
    broadcastDataChange('NOTIFICATION_COMPLETED', { id, dispatchId });
  };

  const markPodNotificationAsRead = async (id: string): Promise<void> => {
    setPodNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      );
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const markAllPodNotificationsAsRead = async (): Promise<void> => {
    setPodNotifications((prev) => {
      const updated = prev.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      }));
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
    showSuccessToast('All POD notifications marked as read.');
  };

  const assignDriverToDelivery = async (
    recordId: string,
    driverName: string,
    plateNumber?: string,
    vehicleType?: string,
    helperName?: string,
    assignedDriverId?: string,
    assignedHelperId?: string
  ): Promise<void> => {
    // 1. Locate the record across forwardingRecords, dispatches, or shipments
    const targetForwarding = forwardingRecords.find(r => r.id === recordId || r.podNumber === recordId);
    const targetDispatch = dispatches.find(d => d.id === recordId || d.podNumber === recordId);
    const targetShipment = shipments.find(s => s.id === recordId || s.podNumber === recordId);

    const podNumber = targetForwarding?.podNumber || targetDispatch?.podNumber || targetShipment?.podNumber || recordId;
    const client = targetForwarding?.client || targetDispatch?.clientName || targetShipment?.client || 'OFII Client';
    const consignee = targetForwarding?.consignee || targetDispatch?.consignee || targetShipment?.consignee || 'Consignee Facility';
    const area = targetForwarding?.area || targetDispatch?.area || targetShipment?.area || 'NCR';
    const destination = targetForwarding?.destination || targetDispatch?.destination || targetShipment?.destination || '';
    const deliveryDate = targetForwarding?.plannedDeliveryDate || targetDispatch?.plannedDeliveryDate || targetShipment?.pickupDate || new Date().toISOString().split('T')[0];
    const dispatchTime = targetForwarding?.departureTime || targetDispatch?.departureTime || targetForwarding?.actualDepartureTime || '08:00 AM';
    const vehicle = vehicleType || targetForwarding?.courier || targetDispatch?.truckProvider || 'OFII Fleet Logistics';
    const plate = plateNumber || targetForwarding?.plateNumber || targetDispatch?.plateNumber || targetShipment?.plateNumber || 'TBD';
    const quantity = targetForwarding?.quantity || targetDispatch?.quantityCasesBoxes || targetShipment?.quantityBoxes || 0;
    const unit = targetForwarding?.unit || targetDispatch?.unit || 'Boxes';
    const refNum = targetForwarding?.referenceNumber || targetDispatch?.manifestNumber || targetShipment?.drNumber || targetShipment?.podNumber;

    // Resolve Driver ID from registered users or roster
    const registeredUsers = getRegisteredUsers();
    const matchedUser = registeredUsers.find(u => 
      (assignedDriverId && (u.id === assignedDriverId || u.employeeId === assignedDriverId || u.driverId === assignedDriverId)) ||
      u.name.toLowerCase().trim() === driverName.toLowerCase().trim() ||
      (u.driverName && u.driverName.toLowerCase().trim() === driverName.toLowerCase().trim())
    );
    const matchedRosterDriver = OFII_DRIVERS_ROSTER.find(d => d.name.toLowerCase().trim() === driverName.toLowerCase().trim());
    const finalDriverId = assignedDriverId || matchedUser?.driverId || matchedUser?.employeeId || matchedUser?.id || matchedRosterDriver?.id || 'DRV-001';

    // Resolve Helper ID from helper roster
    const matchedHelper = OFII_HELPERS_ROSTER.find(h =>
      (assignedHelperId && h.id === assignedHelperId) ||
      (helperName && h.name.toLowerCase().trim() === helperName.toLowerCase().trim())
    );
    const finalHelperId = assignedHelperId || matchedHelper?.id || undefined;
    const nowIso = new Date().toISOString();

    // 2. Update Forwarding Records
    setForwardingRecords(prev => prev.map(rec => {
      if (rec.id === recordId || (podNumber && rec.podNumber === podNumber)) {
        const nextDeliveryStatus = (rec.deliveryStatus === 'Delivered' || rec.deliveryStatus === 'In Transit' || rec.deliveryStatus === 'Out for Delivery')
          ? rec.deliveryStatus
          : 'Assigned';

        return {
          ...rec,
          driverName,
          assignedDriver: driverName,
          assignedDriverId: finalDriverId,
          helperName: helperName || rec.helperName,
          assignedHelper: helperName || rec.assignedHelper,
          assignedHelperId: finalHelperId,
          assignmentStatus: 'Assigned',
          assignmentDate: nowIso,
          plateNumber: plate,
          courier: vehicle,
          truckProvider: vehicle,
          deliveryStatus: nextDeliveryStatus,
          driverProgressStatus: rec.driverProgressStatus || 'Assigned',
        };
      }
      return rec;
    }));

    // 3. Update Dispatches
    setDispatches(prev => prev.map(disp => {
      if (disp.id === recordId || (podNumber && disp.podNumber === podNumber)) {
        return {
          ...disp,
          driverName,
          assignedDriver: driverName,
          assignedDriverId: finalDriverId,
          helperName: helperName || disp.helperName,
          assignedHelper: helperName || disp.assignedHelper,
          assignedHelperId: finalHelperId,
          assignmentStatus: 'Assigned',
          assignmentDate: nowIso,
          plateNumber: plate,
          truckProvider: vehicle,
          driverProgressStatus: disp.driverProgressStatus || 'Assigned',
        };
      }
      return disp;
    }));

    // 4. Update Shipments
    setShipments(prev => prev.map(ship => {
      if (ship.id === recordId || (podNumber && ship.podNumber === podNumber)) {
        return {
          ...ship,
          driverName,
          assignedDriver: driverName,
          assignedDriverId: finalDriverId,
          helperName: helperName || ship.helperName,
          assignedHelper: helperName || ship.assignedHelper,
          assignedHelperId: finalHelperId,
          assignmentStatus: 'Assigned',
          assignmentDate: nowIso,
          plateNumber: plate,
          truckPlate: plate,
          driverProgressStatus: ship.driverProgressStatus || 'Assigned',
        };
      }
      return ship;
    }));

    // 5. Automatically create a real DriverAssignmentNotification (no duplicates)
    const newNotif: DriverAssignmentNotification = {
      id: `DAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driverName,
      driverId: finalDriverId,
      assignedDriverId: finalDriverId,
      assignedHelperId: finalHelperId,
      helperName: helperName || undefined,
      assignedHelper: helperName || undefined,
      recordId: targetForwarding?.id || targetDispatch?.id || recordId,
      podNumber,
      referenceNumber: refNum,
      client,
      consignee,
      area,
      destination: destination || area,
      deliveryDate,
      dispatchTime,
      vehicle,
      plateNumber: plate,
      quantity,
      unit,
      title: 'New Delivery Assigned',
      message: `New Delivery Assigned — Client: ${client} | Area: ${area} | Destination: ${destination || area} | Consignee: ${consignee} | Delivery Date: ${deliveryDate} | Vehicle: ${vehicle} (${plate}) | Helper: ${helperName || 'None assigned'}.`,
      createdAt: nowIso,
      isRead: false,
    };

    setDriverNotifications(prev => {
      // Prevent duplicate notification for exact same recordId & driver
      const existing = prev.filter(n => !(n.recordId === (targetForwarding?.id || targetDispatch?.id || recordId) && n.driverName === driverName));
      const updated = [newNotif, ...existing];
      try {
        localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    broadcastDataChange('DRIVER_ASSIGNED', { recordId, driverName, driverId: finalDriverId, plateNumber: plate, podNumber });
    showSuccessToast('Driver Assigned Successfully', `${driverName} (${finalDriverId}) assigned to ${podNumber}. Driver notification sent.`);
  };

  const markDriverNotificationAsRead = async (id: string): Promise<void> => {
    setDriverNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n);
      try {
        localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const markAllDriverNotificationsAsRead = async (driverName?: string): Promise<void> => {
    setDriverNotifications(prev => {
      const updated = prev.map(n => (!driverName || n.driverName === driverName) ? { ...n, isRead: true, readAt: new Date().toISOString() } : n);
      try {
        localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
    showSuccessToast('Driver notifications marked as read.');
  };

  const updateDriverProgress = async (
    recordId: string,
    currentLocation: string,
    progressStatus: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered'
  ): Promise<void> => {
    // Guard: Do not allow reverting from Delivered back to earlier statuses
    const target = forwardingRecords.find((r) => r.id === recordId || r.podNumber === recordId);
    if (target && (target.deliveryStatus === 'Delivered' || target.driverProgressStatus === 'Delivered') && progressStatus !== 'Delivered') {
      console.warn('Cannot revert a Delivered delivery back to an earlier status.');
      return;
    }

    const timestamp = new Date().toISOString();
    let targetPodNumber = '';

    // 1. Update Forwarding Records
    setForwardingRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId || (rec.podNumber && rec.podNumber === recordId)) {
          if ((rec.deliveryStatus === 'Delivered' || rec.driverProgressStatus === 'Delivered') && progressStatus !== 'Delivered') {
            return rec;
          }
          targetPodNumber = rec.podNumber;
          return {
            ...rec,
            currentLocation: currentLocation.trim(),
            driverProgressStatus: progressStatus,
            progressUpdatedAt: timestamp,
            deliveryStatus: progressStatus === 'Delivered'
              ? 'Delivered'
              : (progressStatus === 'Out for Delivery' || progressStatus === 'In Transit' ? 'In Transit' : rec.deliveryStatus),
          };
        }
        return rec;
      })
    );

    // 2. Update Dispatches
    setDispatches((prev) =>
      prev.map((disp) => {
        if (disp.id === recordId || (targetPodNumber && disp.podNumber === targetPodNumber) || disp.podNumber === recordId) {
          if (disp.status === 'Delivered' && progressStatus !== 'Delivered') {
            return disp;
          }
          return {
            ...disp,
            currentLocation: currentLocation.trim(),
            driverProgressStatus: progressStatus,
            progressUpdatedAt: timestamp,
            status: progressStatus === 'Delivered'
              ? 'Delivered'
              : (progressStatus === 'Out for Delivery' || progressStatus === 'In Transit' ? 'In Transit' : disp.status),
          };
        }
        return disp;
      })
    );

    // 3. Update Shipments
    setShipments((prev) =>
      prev.map((ship) => {
        if (ship.id === recordId || (targetPodNumber && ship.podNumber === targetPodNumber) || ship.podNumber === recordId) {
          if (ship.status === 'Delivered' && progressStatus !== 'Delivered') {
            return ship;
          }
          return {
            ...ship,
            currentLocation: currentLocation.trim(),
            driverProgressStatus: progressStatus,
            progressUpdatedAt: timestamp,
            status: progressStatus === 'Delivered'
              ? 'Delivered'
              : (progressStatus === 'Out for Delivery' || progressStatus === 'In Transit' ? progressStatus : ship.status),
          };
        }
        return ship;
      })
    );

    broadcastDataChange('DRIVER_PROGRESS_UPDATED', { recordId, currentLocation, progressStatus, timestamp });
    showSuccessToast('Progress Updated', `Location: ${currentLocation} • Status: ${progressStatus}`);
  };

  const markDeliveryAsDelivered = async (params: {
    recordId: string;
    receiverName: string;
    dateReceived: string;
    signature?: string;
    remarks?: string;
  }): Promise<void> => {
    const { recordId, receiverName, dateReceived, signature, remarks } = params;
    const nowIso = new Date().toISOString();
    const actualDeliveryDate = dateReceived || nowIso.split('T')[0];

    // Find the matching delivery record
    const targetForwarding = forwardingRecords.find((r) => r.id === recordId || r.podNumber === recordId);
    const targetDispatch = dispatches.find((d) => d.id === recordId || d.podNumber === recordId);
    const targetShipment = shipments.find((s) => s.id === recordId || s.podNumber === recordId);

    const clientName = targetForwarding?.client || targetDispatch?.clientName || targetShipment?.client || 'General Client';
    const consignee = targetForwarding?.consignee || targetDispatch?.consignee || targetShipment?.consignee || 'Consignee Facility';
    const driverName = targetForwarding?.driverName || targetForwarding?.assignedDriver || targetDispatch?.driverName || targetDispatch?.assignedDriver || targetShipment?.driverName || targetShipment?.assignedDriver || 'Assigned Driver';
    const area = targetForwarding?.area || (targetShipment?.area as any) || 'Luzon';
    const podNumber = targetForwarding?.podNumber || targetDispatch?.podNumber || targetShipment?.podNumber || `POD-${recordId.slice(-6)}`;
    const refNum = targetForwarding?.referenceNumber || targetDispatch?.manifestNumber || targetShipment?.manifestNumber || '';
    const dispatchDate = targetForwarding?.actualDispatchDate || targetDispatch?.deliveryDate || targetShipment?.pickupDate || '2026-08-25';
    const vehicle = targetForwarding?.vehicle || targetDispatch?.vehicle || 'Delivery Truck';
    const plateNumber = targetForwarding?.plateNumber || targetDispatch?.plateNumber || '—';

    // Calculate TAT and Delivery Performance using centralized lead time & working days calculation
    const leadTime = targetForwarding?.deliveryLeadTimeDays || getAutoDeliveryLeadTime(clientName, targetForwarding?.modeOfShipment || 'Land Freight', area);
    const perfResult = computeDeliveryPerformance(dispatchDate, actualDeliveryDate, leadTime);

    // Calculate POD return due date and automatic POD status (DO NOT set dateOfPodReturn yet - POD document is pending return to office)
    const podDueRes = calculatePodReturnDueDate(actualDeliveryDate, clientName, area);
    const autoPod = determineAutomaticPodStatus({
      actualDeliveryDate: actualDeliveryDate,
      podReturnDueDate: podDueRes.podReturnDueDate,
      actualPodReturnDate: '',
      clientName,
      deliveryArea: area,
    });

    // 1. Update Forwarding Records (Single Source of Truth)
    setForwardingRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId || rec.podNumber === podNumber) {
          return {
            ...rec,
            deliveryStatus: 'Delivered',
            driverProgressStatus: 'Delivered',
            actualDeliveryDate,
            deliveryDate: actualDeliveryDate,
            receiversName: receiverName.trim(),
            dateReceived,
            receiverSignature: signature,
            currentLocation: 'Delivered to Consignee',
            progressUpdatedAt: nowIso,
            deliveryLeadTimeDays: leadTime,
            deliveryTatDays: perfResult.tatDays,
            deliveryPerformance: perfResult.performance,
            podReturnDueDate: podDueRes.podReturnDueDate || rec.podReturnDueDate,
            podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted || rec.podReturnDueDateFormatted,
            podLeadTimeDays: podDueRes.podLeadTimeDays,
            podStatus: autoPod.status,
            remarks: remarks || rec.remarks,
            deliveryRemarks: remarks || rec.deliveryRemarks,
          };
        }
        return rec;
      })
    );

    // 2. Update Dispatches
    setDispatches((prev) =>
      prev.map((disp) => {
        if (disp.id === recordId || disp.podNumber === podNumber) {
          return {
            ...disp,
            status: 'Delivered',
            driverProgressStatus: 'Delivered',
            receiversName: receiverName.trim(),
            dateReceived,
            receiverSignature: signature,
            currentLocation: 'Delivered to Consignee',
            progressUpdatedAt: nowIso,
            remarks: remarks || disp.remarks,
          };
        }
        return disp;
      })
    );

    // 3. Update Shipments
    setShipments((prev) =>
      prev.map((ship) => {
        if (ship.id === recordId || ship.podNumber === podNumber) {
          return {
            ...ship,
            status: 'Delivered',
            driverProgressStatus: 'Delivered',
            deliveryDate: actualDeliveryDate,
            actualDeliveryDate,
            receiversName: receiverName.trim(),
            dateReceived,
            receiverSignature: signature,
            currentLocation: 'Delivered to Consignee',
            progressUpdatedAt: nowIso,
            podReturnDueDate: podDueRes.podReturnDueDate || ship.podReturnDueDate,
            podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted || ship.podReturnDueDateFormatted,
            podStatus: autoPod.status,
          };
        }
        return ship;
      })
    );

    // 4. Create Office / Encoder Notification: DELIVERY COMPLETED
    const coordinator = targetForwarding?.coordinator || 'Alodia Manalansan';
    const completionNotif: PODNotification = {
      id: `NOTIF-COMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      dedupKey: `${recordId}_DELIVERY_COMPLETED_${Date.now()}`,
      type: 'DELIVERY_COMPLETED',
      title: 'Delivery Marked as Delivered',
      message: `Delivery for ${clientName} / ${consignee} has been marked as Delivered by ${driverName}.`,
      recordId: targetForwarding?.id || recordId,
      client: clientName,
      coordinator,
      referenceNumber: refNum,
      podNumber,
      consignee,
      destination: targetForwarding?.destinationCode || `${area} - ${consignee}`,
      area,
      deliveryArea: area,
      actualDeliveryDate,
      podReturnDueDate: podDueRes.podReturnDueDate,
      podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted,
      podSla: 'PENDING',
      podStatus: autoPod.status,
      createdAt: nowIso,
      isRead: false,
      driverName,
      receiverName: receiverName.trim(),
      dateReceived,
      vehicle,
      plateNumber,
    };

    setPodNotifications((prev) => {
      // Prevent duplicate notification if clicked or triggered multiple times
      const alreadyExists = prev.some(
        (n) => n.type === 'DELIVERY_COMPLETED' && (n.recordId === recordId || (n.podNumber && n.podNumber === podNumber))
      );
      if (alreadyExists) return prev;
      const updated = [completionNotif, ...prev];
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    broadcastDataChange('DELIVERY_COMPLETED', {
      recordId,
      podNumber,
      client: clientName,
      consignee,
      driverName,
      actualDeliveryDate,
      receiverName,
      dateReceived,
      vehicle,
      plateNumber,
      area,
    });

    showSuccessToast(
      'Delivery Completed Successfully!',
      `POD ${podNumber} marked as Delivered. Office / Encoder notified.`
    );
  };

  /**
   * Phase 1: Create a separate Delivery Assignment record linked to an existing Original Delivery.
   * - Does NOT modify or replace the original Delivery.
   * - Validates that no active assignment already exists for the same Original Delivery ID.
   * - Generates a unique Assignment ID.
   * - Persists as a separate record.
   */
  const createDeliveryAssignment = useCallback(async (assignmentData: {
    originalDeliveryId: string;
    driver: string;
    driverId?: string;
    helper: string;
    helperId?: string;
    vehicle: string;
    plateNumber: string;
    assignmentDate?: string;
    assignmentTime?: string;
    assignmentStatus?: string;
    assignmentId?: string;
  }): Promise<DeliveryAssignment> => {
    if (!assignmentData.originalDeliveryId || !assignmentData.originalDeliveryId.trim()) {
      throw new Error('Original Delivery ID is required.');
    }

    const cleanDeliveryId = assignmentData.originalDeliveryId.trim();

    // Safety: Prevent duplicate active assignment for the same delivery if an active assignment already exists
    const existingActive = deliveryAssignments.find(
      (a) => a.originalDeliveryId.toLowerCase() === cleanDeliveryId.toLowerCase() && 
             a.assignmentStatus === 'ASSIGNED'
    );
    if (existingActive) {
      throw new Error('This delivery already has an active assignment.');
    }

    // Generate unique Assignment ID
    const nextSeq = deliveryAssignments.length + 1;
    const generatedId = assignmentData.assignmentId?.trim() || `ASG-${String(nextSeq).padStart(4, '0')}`;

    const now = new Date();
    const dateStr = assignmentData.assignmentDate?.trim() || now.toISOString().split('T')[0];
    const timeStr = assignmentData.assignmentTime?.trim() || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newAssignment: DeliveryAssignment = {
      id: generatedId,
      assignmentId: generatedId,
      originalDeliveryId: cleanDeliveryId,
      driver: assignmentData.driver.trim(),
      driverId: assignmentData.driverId?.trim(),
      helper: assignmentData.helper.trim(),
      helperId: assignmentData.helperId?.trim(),
      vehicle: assignmentData.vehicle.trim(),
      plateNumber: assignmentData.plateNumber.trim(),
      assignmentDate: dateStr,
      assignmentTime: timeStr,
      assignmentStatus: 'ASSIGNED',
      createdAt: now.toISOString(),
      createdBy: 'Driver Head',
    };

    // Save assignment as a separate record
    // Do NOT create another original Delivery.
    // Do NOT duplicate the shipment/delivery in Forwarding.
    // Do NOT modify unrelated records.
    setDeliveryAssignments((prev) => {
      const updated = [newAssignment, ...prev];
      try {
        localStorage.setItem('ofii_delivery_assignments_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist delivery assignments:', e);
      }
      return updated;
    });

    showSuccessToast(
      `Delivery Assignment ${newAssignment.assignmentId} Created`,
      `Linked to Original Delivery ${newAssignment.originalDeliveryId}`
    );

    return newAssignment;
  }, [deliveryAssignments, showSuccessToast]);

  const getDeliveryAssignmentByOriginalDeliveryId = useCallback((originalDeliveryId: string) => {
    if (!originalDeliveryId) return undefined;
    const cleanId = originalDeliveryId.trim().toLowerCase();
    return deliveryAssignments.find(
      (a) => a.originalDeliveryId.toLowerCase() === cleanId && 
             a.assignmentStatus === 'ASSIGNED'
    );
  }, [deliveryAssignments]);

  const refreshData = async (showMessage = true) => {
    await fetchAllData(true);
    if (showMessage) {
      showSuccessToast('Database synchronized.', 'Loaded latest records from Supabase.');
    }
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        dispatches,
        shipments,
        forwardingRecords,
        notifications,
        podNotifications,
        businessRules,
        dashboardSummary,
        syncStatus,
        importHistory,
        currentUserProfile,
        driverNotifications,
        deliveryAssignments,
        isLoading,
        loadingMessage,
        errorMessage,
        toastMessage,
        setCurrentUserProfile,
        createDeliveryAssignment,
        getDeliveryAssignmentByOriginalDeliveryId,
        assignDriverToDelivery,
        markDriverNotificationAsRead,
        markAllDriverNotificationsAsRead,
        addClient,
        updateClient,
        toggleClientStatus,
        addDispatch,
        updateDispatch,
        addForwardingRecord,
        bulkImportForwardingRecords,
        bulkImportDispatches,
        updateForwardingRecord,
        clearImportHistory,
        updateShipment,
        softDeleteRecord,
        restoreRecord,
        permanentDeleteRecord,
        dismissNotification,
        completeNotification,
        markPodNotificationAsRead,
        markAllPodNotificationsAsRead,
        updateDriverProgress,
        markDeliveryAsDelivered,
        refreshData,
        dismissToast,
        showSuccessToast,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
