import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  ChevronRight, 
  Activity, 
  Layers, 
  ArrowRight, 
  TrendingUp, 
  FileCheck, 
  BellRing, 
  AlertCircle, 
  Eye, 
  Calendar, 
  Building2, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Timer, 
  UserCheck, 
  Plus, 
  FileSpreadsheet, 
  Download,
  Filter, 
  Users, 
  MapPin, 
  Sparkles,
  ShieldCheck,
  Check,
  Search,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { 
  DispatchRecord, 
  ShipmentRecord, 
  ForwardingProgressiveRecord, 
  ClientSummary, 
  ForwardingDispatchNotification,
  PODNotification,
  NavigationTab 
} from '../types';
import { currentUser } from '../data/mockData';
import { downloadDailyDispatchTemplate, downloadForwardingTemplate } from '../utils/excelParser';
import { calculateDaysBetween, getAutoDeliveryLeadTime, determineAutomaticDeliveryStatus } from '../utils/forwardingCalculations';

export type DashboardPeriodFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

interface DashboardViewProps {
  dispatches: DispatchRecord[];
  shipments: ShipmentRecord[];
  forwardingRecords: ForwardingProgressiveRecord[];
  clients: ClientSummary[];
  dispatchNotifications?: ForwardingDispatchNotification[];
  podNotifications?: PODNotification[];
  onSelectDispatch: (dispatch: DispatchRecord) => void;
  onSelectShipment: (shipment: ShipmentRecord) => void;
  onSelectForwardingRecord?: (record: ForwardingProgressiveRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
  onSelectClientFromDashboard: (clientName: string) => void;
  onOpenAddDispatchModal?: () => void;
  onOpenAddClientModal?: () => void;
  onOpenImportModal?: (target?: 'forwarding' | 'dispatch') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dispatches,
  shipments,
  forwardingRecords,
  clients,
  dispatchNotifications = [],
  podNotifications = [],
  onSelectDispatch,
  onSelectShipment,
  onSelectForwardingRecord,
  onNavigate,
  onSelectClientFromDashboard,
  onOpenAddDispatchModal,
  onOpenAddClientModal,
  onOpenImportModal,
}) => {
  // ---------------------------------------------------------------------------
  // 1. FILTER CONTROLS STATE (Date & Client Filters)
  // ---------------------------------------------------------------------------
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodFilter>('ALL');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-08-31');

  // Helper to test if a record's date string falls into the selected period
  const isDateInPeriod = (dateStr?: string | null): boolean => {
    if (selectedPeriod === 'ALL') return true;
    if (!dateStr || dateStr.trim() === '') return false;

    const cleanDate = dateStr.slice(0, 10);
    // Operational reference dates in prototype (August 2026 active cycle)
    const todayRef = '2026-08-25';
    const nowIso = new Date().toISOString().slice(0, 10);

    if (selectedPeriod === 'TODAY') {
      return cleanDate === todayRef || cleanDate === '2026-08-27' || cleanDate === '2026-08-24' || cleanDate === nowIso;
    }

    if (selectedPeriod === 'WEEK') {
      const weekStart = '2026-08-18';
      const weekEnd = '2026-08-31';
      const rollingStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      return (cleanDate >= weekStart && cleanDate <= weekEnd) || (cleanDate >= rollingStart && cleanDate <= nowIso);
    }

    if (selectedPeriod === 'MONTH') {
      const monthPrefix = '2026-08';
      const currentMonthPrefix = nowIso.slice(0, 7);
      return cleanDate.startsWith(monthPrefix) || cleanDate.startsWith(currentMonthPrefix);
    }

    if (selectedPeriod === 'CUSTOM') {
      if (customStartDate && cleanDate < customStartDate) return false;
      if (customEndDate && cleanDate > customEndDate) return false;
      return true;
    }

    return true;
  };

  // Helper to test if a record belongs to the selected client
  const isRecordForSelectedClient = (clientNameOrId?: string | null, clientObjId?: string | null): boolean => {
    if (selectedClientFilter === 'ALL') return true;
    if (!clientNameOrId && !clientObjId) return false;

    const targetLower = selectedClientFilter.toLowerCase();
    const nameLower = (clientNameOrId || '').toLowerCase();
    const idVal = clientObjId || '';

    return nameLower === targetLower || idVal === selectedClientFilter || nameLower.includes(targetLower);
  };

  // ---------------------------------------------------------------------------
  // 2. ACTIVE & FILTERED COLLECTIONS (Central Data Source synchronization)
  // ---------------------------------------------------------------------------
  const activeDispatches = useMemo(() => dispatches.filter(d => !d.isDeleted), [dispatches]);
  const activeShipments = useMemo(() => shipments.filter(s => !s.isDeleted), [shipments]);
  const activeForwarding = useMemo(() => forwardingRecords.filter(f => !f.isDeleted), [forwardingRecords]);
  const activeClients = useMemo(() => clients.filter(c => !c.isDeleted), [clients]);
  const activeDispatchNotifications = useMemo(
    () => dispatchNotifications.filter(n => !n.isDismissed && n.status !== 'COMPLETED'),
    [dispatchNotifications]
  );
  const activePodNotifications = useMemo(
    () => podNotifications.filter(n => !n.isRead),
    [podNotifications]
  );

  // Client and Period Filtered collections
  const periodFilteredForwarding = useMemo(() => {
    return activeForwarding.filter(f => {
      // Client filter
      if (!isRecordForSelectedClient(f.client, f.clientId)) return false;
      // Date filter
      const primaryDate = f.actualDispatchDate || f.actualDeliveryDate || f.plannedDeliveryDate || f.createdAt;
      return isDateInPeriod(primaryDate);
    });
  }, [activeForwarding, selectedPeriod, selectedClientFilter, customStartDate, customEndDate]);

  const periodFilteredShipments = useMemo(() => {
    return activeShipments.filter(s => {
      if (!isRecordForSelectedClient(s.clientName || s.client, s.clientId)) return false;
      const primaryDate = s.actualDeparture || s.bookedDate || s.actualDeliveryDate || s.deliveryDate;
      return isDateInPeriod(primaryDate);
    });
  }, [activeShipments, selectedPeriod, selectedClientFilter, customStartDate, customEndDate]);

  const periodFilteredDispatches = useMemo(() => {
    return activeDispatches.filter(d => {
      if (!isRecordForSelectedClient(d.clientName, d.clientId)) return false;
      const primaryDate = d.deliveryDate || d.plannedDeliveryDate || d.actualDeparture || d.createdAt;
      return isDateInPeriod(primaryDate);
    });
  }, [activeDispatches, selectedPeriod, selectedClientFilter, customStartDate, customEndDate]);

  // Master collection for freight operations
  const masterShipmentsList = useMemo(() => {
    return periodFilteredForwarding.length > 0 ? periodFilteredForwarding : periodFilteredShipments;
  }, [periodFilteredForwarding, periodFilteredShipments]);

  // ---------------------------------------------------------------------------
  // 3. DISPATCHING SUMMARY METRICS (Section 2)
  // ---------------------------------------------------------------------------
  const dispatchMetrics = useMemo(() => {
    const total = periodFilteredDispatches.length;
    let completedDeparted = 0;
    let inTransit = 0;
    let inLoading = 0;
    let pendingPickup = 0;
    let delayed = 0;
    let todayCount = 0;

    const todayRef = '2026-08-25';
    const nowIso = new Date().toISOString().slice(0, 10);

    periodFilteredDispatches.forEach(d => {
      // Dispatches Today check
      const dDate = (d.deliveryDate || d.plannedDeliveryDate || d.actualDeparture || '').slice(0, 10);
      if (dDate === todayRef || dDate === '2026-08-27' || dDate === '2026-08-24' || dDate === nowIso) {
        todayCount++;
      }

      // Status breakdown
      if (d.status === 'Delivered' || d.status === 'Departed' || d.status === 'Arrived at Hub') {
        completedDeparted++;
      } else if (d.status === 'In Transit') {
        inTransit++;
      } else if (d.status === 'In Loading') {
        inLoading++;
      } else if (d.status === 'Delayed') {
        delayed++;
      } else {
        pendingPickup++;
      }
    });

    const pendingTotal = inLoading + pendingPickup;
    const completionRate = total > 0 ? ((completedDeparted / total) * 100).toFixed(1) : null;

    return {
      total,
      todayCount,
      completedDeparted,
      inTransit,
      inLoading,
      pendingPickup,
      pendingTotal,
      delayed,
      completionRate,
    };
  }, [periodFilteredDispatches]);

  // ---------------------------------------------------------------------------
  // 4. DELIVERY PERFORMANCE SUMMARY (Section 3, 4, 7)
  // Uses existing Delivery Performance & RDD Engine result without recalculating
  // ---------------------------------------------------------------------------
  const deliveryMetrics = useMemo(() => {
    const totalDeliveries = masterShipmentsList.length;

    let delivered = 0;
    let inTransit = 0;
    let pending = 0;
    let delayed = 0;

    let onTimeCount = 0;
    let delayedOutcomeCount = 0;
    let hasRddCount = 0;

    if (periodFilteredForwarding.length > 0) {
      periodFilteredForwarding.forEach(record => {
        if (record.requestDeliveryDate && record.requestDeliveryDate.trim() !== '') {
          hasRddCount++;
        }

        const auto = determineAutomaticDeliveryStatus({
          actualDispatchDate: record.actualDispatchDate,
          actualDeliveryDate: record.actualDeliveryDate,
          expectedDeliveryDate: record.expectedDeliveryDate,
          requestDeliveryDate: record.requestDeliveryDate,
          leadTimeDaysOrConfig: record.deliveryLeadTimeDays || getAutoDeliveryLeadTime(record.client, record.modeOfShipment, record.area),
        });

        // Status Categorisation
        if (auto.status === 'On Time' || record.deliveryStatus === 'Delivered') {
          delivered++;
        } else if (auto.status === 'In Transit' || record.deliveryStatus === 'In Transit') {
          inTransit++;
        } else if (auto.status === 'Delayed' || record.deliveryStatus === 'Delayed') {
          delayed++;
        } else {
          pending++;
        }

        // Delivery Performance Evaluation for completed deliveries
        if (auto.isDelivered || record.actualDeliveryDate || record.deliveryStatus === 'Delivered') {
          if (record.deliveryPerformance === 'HIT' || record.deliveryPerformance === 'On-Time' || (!auto.isLate && record.deliveryPerformance !== 'MISSED')) {
            onTimeCount++;
          } else {
            delayedOutcomeCount++;
          }
        }
      });
    } else {
      periodFilteredShipments.forEach(shipment => {
        if (shipment.requestDeliveryDate && shipment.requestDeliveryDate.trim() !== '') {
          hasRddCount++;
        }

        const auto = determineAutomaticDeliveryStatus({
          actualDispatchDate: shipment.actualDispatchDate || shipment.deliveryDate,
          actualDeliveryDate: shipment.actualDeliveryDate,
          expectedDeliveryDate: shipment.expectedDeliveryDate,
          requestDeliveryDate: shipment.requestDeliveryDate,
          leadTimeDaysOrConfig: shipment.deliveryLeadTimeDays,
        });

        if (auto.status === 'On Time' || shipment.status === 'Delivered') {
          delivered++;
        } else if (auto.status === 'In Transit' || shipment.status === 'In Transit') {
          inTransit++;
        } else if (auto.status === 'Delayed' || shipment.status === 'Delayed') {
          delayed++;
        } else {
          pending++;
        }

        if (auto.isDelivered || shipment.actualDeliveryDate || shipment.status === 'Delivered') {
          if (shipment.deliveryPerformance === 'HIT' || shipment.deliveryPerformance === 'On-Time' || (!auto.isLate && shipment.deliveryPerformance !== 'MISSED')) {
            onTimeCount++;
          } else {
            delayedOutcomeCount++;
          }
        }
      });
    }

    const totalCompleted = onTimeCount + delayedOutcomeCount;
    // Section 7: Delivery Performance Rate = On-Time Deliveries ÷ total completed deliveries × 100
    const deliveryPerformancePercentage = totalCompleted > 0
      ? ((onTimeCount / totalCompleted) * 100).toFixed(1)
      : null;

    const baseTotal = totalDeliveries > 0 ? totalDeliveries : 1;
    const deliveredPct = Math.round((delivered / baseTotal) * 100);
    const inTransitPct = Math.round((inTransit / baseTotal) * 100);
    const pendingPct = Math.round((pending / baseTotal) * 100);
    const delayedPct = totalDeliveries > 0 ? Math.max(0, 100 - (deliveredPct + inTransitPct + pendingPct)) : 0;

    return {
      totalDeliveries,
      delivered,
      inTransit,
      pending,
      delayed,
      onTimeCount,
      delayedOutcomeCount,
      totalCompleted,
      deliveryPerformancePercentage,
      hasRddCount,
      deliveredPct,
      inTransitPct,
      pendingPct,
      delayedPct,
    };
  }, [masterShipmentsList, periodFilteredForwarding, periodFilteredShipments]);

  // ---------------------------------------------------------------------------
  // 5. POD PERFORMANCE SUMMARY (Section 5, 6, 12 - Visually Separate from Delivery)
  // Derived directly from POD Status & POD SLA fields
  // ---------------------------------------------------------------------------
  const podMetrics = useMemo(() => {
    let podPending = 0;
    let podHitCount = 0;
    let podMissedCount = 0;
    let podReturned = 0;

    if (periodFilteredForwarding.length > 0) {
      periodFilteredForwarding.forEach(record => {
        const isReturned = record.dateOfPodReturn && record.dateOfPodReturn.trim() !== '' || 
                           record.podStatus === 'Returned' || 
                           record.podStatus === 'Transmitted' || 
                           record.podStatus === 'POD On Time' || 
                           (record.podPerformance === 'HIT' || record.podPerformance === 'MISSED');

        if (isReturned) {
          podReturned++;
          if (record.podPerformance === 'HIT' || record.podStatus === 'POD On Time') {
            podHitCount++;
          } else if (record.podPerformance === 'MISSED' || record.podStatus === 'POD Delayed') {
            podMissedCount++;
          } else if (record.actualDeliveryDate && record.dateOfPodReturn) {
            // Turnaround check against POD lead time
            const tat = calculateDaysBetween(record.actualDeliveryDate, record.dateOfPodReturn);
            const lead = record.podLeadTimeDays || 3;
            if (tat <= lead) {
              podHitCount++;
            } else {
              podMissedCount++;
            }
          } else {
            podHitCount++;
          }
        } else {
          podPending++;
          // Check if pending but already past due
          if (record.podStatus === 'POD Delayed' || record.podPerformance === 'MISSED') {
            // Unreturned overdue count
          }
        }
      });
    } else {
      periodFilteredShipments.forEach(shipment => {
        const isReturned = shipment.datePodReceived && shipment.datePodReceived.trim() !== '' ||
                           shipment.podStatus === 'Returned' ||
                           (shipment.podPerformance === 'HIT' || shipment.podPerformance === 'MISSED');

        if (isReturned) {
          podReturned++;
          if (shipment.podPerformance === 'HIT' || shipment.podPerformance === 'On-Time' || shipment.podStatus === 'Returned') {
            podHitCount++;
          } else {
            podMissedCount++;
          }
        } else {
          podPending++;
        }
      });
    }

    // Section 6: POD Performance Rate = POD HIT records ÷ total completed POD records × 100
    const totalCompletedPod = podHitCount + podMissedCount;
    const podPerformancePercentage = totalCompletedPod > 0
      ? ((podHitCount / totalCompletedPod) * 100).toFixed(1)
      : null;

    const totalPodPool = podReturned + podPending || 1;
    const returnFulfillmentPct = Math.round((podReturned / totalPodPool) * 100);

    return {
      podPending,
      podHitCount,
      podMissedCount,
      podReturned,
      totalCompletedPod,
      podPerformancePercentage,
      returnFulfillmentPct,
    };
  }, [periodFilteredForwarding, periodFilteredShipments]);

  // ---------------------------------------------------------------------------
  // 6. CLIENT SUMMARY BREAKDOWN TABLE (Section 9)
  // Dynamic client level operational cards with full filtering
  // ---------------------------------------------------------------------------
  const clientSummaries = useMemo(() => {
    const totalMasterRecords = masterShipmentsList.length || 1;

    return activeClients.map(client => {
      const clientNameLower = client.name.toLowerCase();

      // Matching shipments for this specific client
      const matchingShipments = masterShipmentsList.filter((rec: any) => {
        const cName = (rec.client || rec.clientName || '').toLowerCase();
        const cId = rec.clientId;
        return cName === clientNameLower || cId === client.id;
      });

      const totalShipments = matchingShipments.length;

      let totalDeliveries = 0;
      let delayedDeliveries = 0;
      let onTimeDeliveries = 0;
      let podPending = 0;
      let podDelayed = 0;
      let podHits = 0;
      let podMisses = 0;

      matchingShipments.forEach((r: any) => {
        // Delivery status
        const isDelivered = r.deliveryStatus === 'Delivered' || r.status === 'Delivered' || r.actualDeliveryDate;
        if (isDelivered) {
          totalDeliveries++;
          if (r.deliveryPerformance === 'HIT' || r.deliveryPerformance === 'On-Time') {
            onTimeDeliveries++;
          } else if (r.deliveryPerformance === 'MISSED' || r.deliveryPerformance === 'Delayed') {
            delayedDeliveries++;
          } else {
            onTimeDeliveries++;
          }
        }

        // POD status
        const hasPod = r.dateOfPodReturn || r.datePodReceived || r.podStatus === 'Returned' || r.podStatus === 'Transmitted';
        if (!hasPod) {
          podPending++;
          if (r.podStatus === 'POD Delayed' || r.podPerformance === 'MISSED') {
            podDelayed++;
          }
        } else {
          if (r.podPerformance === 'HIT' || r.podStatus === 'POD On Time' || r.podStatus === 'Returned') {
            podHits++;
          } else if (r.podPerformance === 'MISSED' || r.podStatus === 'POD Delayed') {
            podMisses++;
            podDelayed++;
          }
        }
      });

      const evaluatedDeliveries = onTimeDeliveries + delayedDeliveries;
      const deliverySlaRate = evaluatedDeliveries > 0 
        ? `${((onTimeDeliveries / evaluatedDeliveries) * 100).toFixed(1)}%` 
        : 'N/A';

      const evaluatedPods = podHits + podMisses;
      const podSlaRate = evaluatedPods > 0 
        ? `${((podHits / evaluatedPods) * 100).toFixed(1)}%` 
        : 'N/A';

      const sharePercentage = Math.round((totalShipments / totalMasterRecords) * 100);

      return {
        id: client.id,
        name: client.name,
        code: client.code,
        assignedCoordinator: client.assignedCoordinator || client.accountManager || 'Operations Hub',
        totalShipments,
        totalDeliveries,
        delayedDeliveries,
        deliverySlaRate,
        podPending,
        podDelayed,
        podSlaRate,
        sharePercentage,
      };
    }).sort((a, b) => b.totalShipments - a.totalShipments);
  }, [activeClients, masterShipmentsList]);

  // ---------------------------------------------------------------------------
  // 7. COORDINATOR INSIGHTS (Derived from Client -> Coordinator Mappings)
  // ---------------------------------------------------------------------------
  const coordinatorInsightsList = useMemo(() => {
    const coordinatorMap: Record<string, {
      name: string;
      clientsCount: number;
      shipmentCount: number;
      deliveredCount: number;
      inTransitCount: number;
      delayedCount: number;
      hits: number;
      missed: number;
      podPendingCount: number;
    }> = {};

    activeClients.forEach(client => {
      const coordName = client.assignedCoordinator || client.accountManager || 'Unassigned Coordinator';
      if (!coordinatorMap[coordName]) {
        coordinatorMap[coordName] = {
          name: coordName,
          clientsCount: 0,
          shipmentCount: 0,
          deliveredCount: 0,
          inTransitCount: 0,
          delayedCount: 0,
          hits: 0,
          missed: 0,
          podPendingCount: 0,
        };
      }
      coordinatorMap[coordName].clientsCount++;
    });

    masterShipmentsList.forEach((rec: any) => {
      const clientName = (rec.client || rec.clientName || '').toLowerCase();
      const clientObj = activeClients.find(c => c.name.toLowerCase() === clientName || c.id === rec.clientId);
      const coordName = clientObj?.assignedCoordinator || clientObj?.accountManager || rec.coordinator || 'Operations Hub';

      if (!coordinatorMap[coordName]) {
        coordinatorMap[coordName] = {
          name: coordName,
          clientsCount: 1,
          shipmentCount: 0,
          deliveredCount: 0,
          inTransitCount: 0,
          delayedCount: 0,
          hits: 0,
          missed: 0,
          podPendingCount: 0,
        };
      }

      coordinatorMap[coordName].shipmentCount++;

      const isDelivered = rec.deliveryStatus === 'Delivered' || rec.status === 'Delivered' || rec.actualDeliveryDate;
      if (isDelivered) {
        coordinatorMap[coordName].deliveredCount++;
        if (rec.deliveryPerformance === 'HIT' || rec.deliveryPerformance === 'On-Time') {
          coordinatorMap[coordName].hits++;
        } else if (rec.deliveryPerformance === 'MISSED' || rec.deliveryPerformance === 'Delayed') {
          coordinatorMap[coordName].missed++;
        }
      } else if (rec.deliveryStatus === 'In Transit' || rec.status === 'In Transit' || rec.status === 'Departed') {
        coordinatorMap[coordName].inTransitCount++;
      } else if (rec.deliveryStatus === 'Delayed' || rec.status === 'Delayed') {
        coordinatorMap[coordName].delayedCount++;
      }

      const hasPod = rec.dateOfPodReturn || rec.datePodReceived || rec.podStatus === 'Returned';
      if (!hasPod) {
        coordinatorMap[coordName].podPendingCount++;
      }
    });

    const totalShipments = masterShipmentsList.length || 1;

    return Object.values(coordinatorMap).map(c => {
      const totalEval = c.hits + c.missed;
      const onTimeAdherence = totalEval > 0 ? `${((c.hits / totalEval) * 100).toFixed(1)}%` : 'N/A';
      const sharePct = Math.round((c.shipmentCount / totalShipments) * 100);

      return {
        ...c,
        onTimeAdherence,
        sharePct,
      };
    }).sort((a, b) => b.shipmentCount - a.shipmentCount);
  }, [activeClients, masterShipmentsList]);

  // ---------------------------------------------------------------------------
  // 8. UNRESOLVED ALERTS / NOTIFICATION SUMMARY (Section 14)
  // Direct integration with POD Notification & Alert Engine
  // ---------------------------------------------------------------------------
  const actionRequiredItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: 'POD Due Soon' | 'POD Overdue' | 'Incomplete Dispatch' | 'Delivery Delayed' | 'POD Delayed';
      severity: 'high' | 'medium' | 'low';
      badgeText: string;
      actionLabel: string;
      onAction: () => void;
    }> = [];

    // 1. Live POD Alerts from centralized engine
    activePodNotifications.slice(0, 4).forEach(notif => {
      const isOverdue = notif.type === 'POD_OVERDUE';
      const isLate = notif.type === 'POD_RETURNED_LATE';
      const isDueSoon = notif.type === 'POD_DUE_SOON';

      items.push({
        id: `pod-notif-${notif.id}`,
        title: notif.title,
        subtitle: `${notif.message} • Assigned: ${notif.coordinator}`,
        category: isOverdue ? 'POD Overdue' : isLate ? 'POD Delayed' : 'POD Due Soon',
        severity: isOverdue || isLate ? 'high' : 'medium',
        badgeText: isOverdue ? 'POD OVERDUE' : isLate ? 'LATE RETURN' : 'DUE SOON',
        actionLabel: 'VIEW RECORD',
        onAction: () => {
          const rec = forwardingRecords.find(f => f.id === notif.recordId);
          if (rec && onSelectForwardingRecord) {
            onSelectForwardingRecord(rec);
          } else {
            onNavigate('forwarding_report');
          }
        }
      });
    });

    // 2. Incomplete Dispatch handoffs
    activeDispatchNotifications.slice(0, 2).forEach(notif => {
      items.push({
        id: `act-notif-${notif.id}`,
        title: `Dispatch Required: ${notif.client}`,
        subtitle: `POD ${notif.podNumber} • ${notif.consignee} (${notif.destinationCode || notif.destination || 'NCR'}) requires truck, driver & departure info`,
        category: 'Incomplete Dispatch',
        severity: 'high',
        badgeText: 'DISPATCH REQUIRED',
        actionLabel: 'DISPATCH',
        onAction: () => onNavigate('dispatch')
      });
    });

    // 3. Delayed Freight Shipments
    const delayedShipments = masterShipmentsList.filter((f: any) => 
      f.deliveryStatus === 'Delayed' || f.status === 'Delayed' || f.deliveryPerformance === 'MISSED'
    );
    delayedShipments.slice(0, 2).forEach((ds: any) => {
      items.push({
        id: `act-delayed-${ds.id}`,
        title: `Freight Delayed: ${ds.client || ds.clientName}`,
        subtitle: `Ref ${ds.referenceNumber || ds.podNumber} • POD ${ds.podNumber} • ${ds.consignee} (${ds.reasonForDelay || ds.delayReason || 'Transit / weather delay'})`,
        category: 'Delivery Delayed',
        severity: 'high',
        badgeText: 'DELIVERY DELAYED',
        actionLabel: 'INSPECT',
        onAction: () => {
          if (onSelectForwardingRecord && ds.referenceNumber) {
            onSelectForwardingRecord(ds);
          } else {
            onNavigate('forwarding_report');
          }
        }
      });
    });

    return items;
  }, [activePodNotifications, activeDispatchNotifications, masterShipmentsList, forwardingRecords, onNavigate, onSelectForwardingRecord]);

  // ---------------------------------------------------------------------------
  // 9. RECENT TABLES LISTS
  // ---------------------------------------------------------------------------
  const dispatchesDisplayList = useMemo(() => {
    return periodFilteredDispatches.slice(0, 6);
  }, [periodFilteredDispatches]);

  const recentShipmentsList = useMemo(() => {
    return masterShipmentsList.slice(0, 6);
  }, [masterShipmentsList]);

  // Helper for status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Delivered</span>;
      case 'In Transit':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">In Transit</span>;
      case 'Departed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Departed</span>;
      case 'In Loading':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">In Loading</span>;
      case 'Pending Pickup':
      case 'Pending Delivery':
      case 'Booked':
      case 'Pending':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">Pending</span>;
      case 'Delayed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Delayed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const isFilterActive = selectedPeriod !== 'ALL' || selectedClientFilter !== 'ALL';

  const handleResetFilters = () => {
    setSelectedPeriod('ALL');
    setSelectedClientFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* --------------------------------------------------------------------- */}
      {/* 1. HEADER & QUICK OPERATIONAL ACTIONS */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Good day, {currentUser.name}!</span>
              <span role="img" aria-label="wave">👋</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Central Operational Summary
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dynamic real-time summarization across Daily Dispatching, Forwarding Progressive Reports, Delivery SLA, and POD Monitoring.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onOpenAddDispatchModal && (
            <button
              id="dashboard-btn-add-dispatch"
              onClick={onOpenAddDispatchModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD DISPATCH</span>
            </button>
          )}

          {onOpenAddClientModal && (
            <button
              id="dashboard-btn-add-client"
              onClick={onOpenAddClientModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD CLIENT</span>
            </button>
          )}

          <button
            id="dashboard-btn-view-forwarding"
            onClick={() => onNavigate('forwarding_report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>FORWARDING REPORT</span>
          </button>

          <div className="relative group">
            <button
              id="dashboard-btn-download-template"
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer hover:text-blue-700"
              title="Download module-specific Excel template for bulk encoding"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Download Template ▾</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 w-56">
              <button
                type="button"
                onClick={() => downloadDailyDispatchTemplate(clients)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                <span>Daily Dispatch Template</span>
              </button>
              <button
                type="button"
                onClick={() => downloadForwardingTemplate(clients)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Forwarding Report Template</span>
              </button>
            </div>
          </div>

          {onOpenImportModal && (
            <div className="relative group">
              <button
                id="dashboard-btn-import-excel"
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer"
                title="Bulk Import Excel Records into Daily Dispatching or Forwarding"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>IMPORT EXCEL ▾</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 w-56">
                <button
                  type="button"
                  onClick={() => onOpenImportModal('dispatch')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Truck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import Daily Dispatching</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenImportModal('forwarding')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import Forwarding Report</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. CENTRALIZED FILTER TOOLBAR (Date & Client Controls) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>Date Filter:</span>
            </div>

            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                id="period-filter-all"
                onClick={() => setSelectedPeriod('ALL')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === 'ALL'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>

              <button
                id="period-filter-today"
                onClick={() => setSelectedPeriod('TODAY')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === 'TODAY'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>

              <button
                id="period-filter-week"
                onClick={() => setSelectedPeriod('WEEK')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === 'WEEK'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Week
              </button>

              <button
                id="period-filter-month"
                onClick={() => setSelectedPeriod('MONTH')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === 'MONTH'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>

              <button
                id="period-filter-custom"
                onClick={() => setSelectedPeriod('CUSTOM')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === 'CUSTOM'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Range
              </button>
            </div>

            {selectedPeriod === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-md border border-slate-300 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800 text-xs font-mono"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800 text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Client Filter Selector (Section 9) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
              <Building2 className="w-4 h-4 text-purple-700" />
              <span>Filter Client:</span>
            </div>

            <select
              id="dashboard-client-filter-select"
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Clients ({activeClients.length} Accounts)</option>
              {activeClients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name} ({client.code})
                </option>
              ))}
            </select>

            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                title="Reset all filters to All Time / All Clients"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

        </div>

        {/* Active Filter Status Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Active Scope:</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium text-[11px]">
              {selectedPeriod === 'ALL' && 'All available operations'}
              {selectedPeriod === 'TODAY' && 'Operations for Today'}
              {selectedPeriod === 'WEEK' && 'Current Operational Week'}
              {selectedPeriod === 'MONTH' && 'Current Month (August 2026)'}
              {selectedPeriod === 'CUSTOM' && `${customStartDate} → ${customEndDate}`}
            </span>
            {selectedClientFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold text-[11px] flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{selectedClientFilter}</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            <span>Synchronized with <strong>{masterShipmentsList.length}</strong> master records and <strong>{periodFilteredDispatches.length}</strong> dispatches</span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. DISPATCHING + DELIVERY RELATIONSHIP PIPELINE (Section 13) */}
      {/* Visual freight operational flow from Dispatch to POD Return */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Operational Freight Pipeline (Dispatch → Transit → Delivery → POD)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live Stage Handoffs</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Step 1: Dispatched */}
          <div 
            onClick={() => onNavigate('dispatch')}
            className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-800 uppercase">
              <span>1. Dispatched</span>
              <Truck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-blue-900">
              {dispatchMetrics.total}
            </div>
            <div className="mt-1 text-[10px] text-blue-700">
              {dispatchMetrics.todayCount} scheduled today
            </div>
          </div>

          {/* Step 2: In Transit */}
          <div 
            onClick={() => onNavigate('forwarding_report')}
            className="p-3 rounded-lg bg-cyan-50/60 border border-cyan-100 hover:border-cyan-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-cyan-800 uppercase">
              <span>2. In Transit</span>
              <Activity className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-cyan-900">
              {deliveryMetrics.inTransit}
            </div>
            <div className="mt-1 text-[10px] text-cyan-700">
              Linehaul freight en route
            </div>
          </div>

          {/* Step 3: Delivered */}
          <div 
            onClick={() => onNavigate('forwarding_report')}
            className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 hover:border-emerald-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase">
              <span>3. Delivered</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-emerald-900">
              {deliveryMetrics.delivered}
            </div>
            <div className="mt-1 text-[10px] text-emerald-700">
              {deliveryMetrics.deliveredPct}% completed
            </div>
          </div>

          {/* Step 4: Delivery SLA */}
          <div 
            onClick={() => onNavigate('forwarding_report')}
            className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 hover:border-indigo-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 uppercase">
              <span>4. Delivery SLA</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-indigo-900">
              {deliveryMetrics.deliveryPerformancePercentage !== null 
                ? `${deliveryMetrics.deliveryPerformancePercentage}%` 
                : 'N/A'}
            </div>
            <div className="mt-1 text-[10px] text-indigo-700">
              {deliveryMetrics.onTimeCount} Hit / {deliveryMetrics.delayedOutcomeCount} Missed
            </div>
          </div>

          {/* Step 5: POD SLA */}
          <div 
            onClick={() => onNavigate('forwarding_report')}
            className="p-3 rounded-lg bg-purple-50/60 border border-purple-100 hover:border-purple-300 transition-all cursor-pointer group col-span-2 md:col-span-1"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 uppercase">
              <span>5. POD Return SLA</span>
              <FileCheck className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-purple-900">
              {podMetrics.podPerformancePercentage !== null 
                ? `${podMetrics.podPerformancePercentage}%` 
                : 'N/A'}
            </div>
            <div className="mt-1 text-[10px] text-purple-700">
              {podMetrics.podHitCount} Hit / {podMetrics.podMissedCount} Missed
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. CORE SUMMARY CARDS (7 Dynamic Operational Cards) */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        
        {/* Card 1: TOTAL SHIPMENTS */}
        <div 
          id="summary-card-total-shipments"
          onClick={() => onNavigate('clients')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
          title="Click to view all shipments in Client Monitoring"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors">
              Total Shipments
            </span>
            <div className="p-1.5 rounded bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {deliveryMetrics.totalDeliveries}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium truncate flex items-center justify-between">
            <span>Shared dataset</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>

        {/* Card 2: TOTAL DISPATCHES */}
        <div 
          id="summary-card-total-dispatches"
          onClick={() => onNavigate('dispatch')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
          title="Click to open Daily Dispatching Monitoring"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors">
              Total Dispatches
            </span>
            <div className="p-1.5 rounded bg-blue-50 text-blue-700 group-hover:bg-blue-100 transition-colors">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-blue-700 font-mono">
              {dispatchMetrics.total}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-blue-600 font-medium truncate flex items-center justify-between">
            <span>{dispatchMetrics.todayCount} today</span>
            <ChevronRight className="w-3 h-3 text-blue-400 group-hover:text-blue-700 transition-colors" />
          </div>
        </div>

        {/* Card 3: DELIVERED */}
        <div 
          id="summary-card-delivered"
          onClick={() => onNavigate('forwarding_report')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
          title="Click to view Delivered records in Forwarding Report"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
              Delivered
            </span>
            <div className="p-1.5 rounded bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {deliveryMetrics.delivered}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium truncate flex items-center justify-between">
            <span>{deliveryMetrics.totalDeliveries > 0 ? `${deliveryMetrics.deliveredPct}% completed` : '—'}</span>
            <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:text-emerald-700 transition-colors" />
          </div>
        </div>

        {/* Card 4: IN TRANSIT */}
        <div 
          id="summary-card-in-transit"
          onClick={() => onNavigate('forwarding_report')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-cyan-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
          title="Click to view In-Transit shipments"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-cyan-700 transition-colors">
              In Transit
            </span>
            <div className="p-1.5 rounded bg-cyan-50 text-cyan-700 group-hover:bg-cyan-100 transition-colors">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-cyan-700 font-mono">
              {deliveryMetrics.inTransit}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-cyan-700 font-medium truncate flex items-center justify-between">
            <span>En route linehaul</span>
            <ChevronRight className="w-3 h-3 text-cyan-400 group-hover:text-cyan-700 transition-colors" />
          </div>
        </div>

        {/* Card 5: PENDING */}
        <div 
          id="summary-card-pending"
          onClick={() => onNavigate('forwarding_report')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
          title="Click to view Pending consignments"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors">
              Pending
            </span>
            <div className="p-1.5 rounded bg-amber-50 text-amber-700 group-hover:bg-amber-100 transition-colors">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-amber-700 font-mono">
              {deliveryMetrics.pending}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium truncate flex items-center justify-between">
            <span>Awaiting prep</span>
            <ChevronRight className="w-3 h-3 text-amber-400 group-hover:text-amber-700 transition-colors" />
          </div>
        </div>

        {/* Card 6: DELAYED DELIVERIES */}
        <div 
          id="summary-card-delayed"
          onClick={() => onNavigate('forwarding_report')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
          title="Click to inspect Delayed shipments requiring attention"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-700 transition-colors">
              Delayed
            </span>
            <div className="p-1.5 rounded bg-rose-50 text-rose-700 group-hover:bg-rose-100 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-rose-700 font-mono">
              {deliveryMetrics.delayed}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700 font-medium truncate flex items-center justify-between">
            <span>{deliveryMetrics.delayed > 0 ? 'Requires action' : 'Zero delays'}</span>
            <ChevronRight className="w-3 h-3 text-rose-400 group-hover:text-rose-700 transition-colors" />
          </div>
        </div>

        {/* Card 7: POD PENDING */}
        <div 
          id="summary-card-pod-pending"
          onClick={() => onNavigate('forwarding_report')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group col-span-2 sm:col-span-1"
          title="Click to track pending POD receipts"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-purple-700 transition-colors">
              POD Pending
            </span>
            <div className="p-1.5 rounded bg-purple-50 text-purple-700 group-hover:bg-purple-100 transition-colors">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-purple-700 font-mono">
              {podMetrics.podPending}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-purple-700 font-medium truncate flex items-center justify-between">
            <span>Awaiting hardcopy</span>
            <ChevronRight className="w-3 h-3 text-purple-400 group-hover:text-purple-700 transition-colors" />
          </div>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 5. DEDICATED DELIVERY OVERVIEW & PERFORMANCE SECTION (Section 3, 4, 7) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-blue-50 text-blue-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Delivery Performance Summary</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Calculated from Modules
                </span>
                {deliveryMetrics.hasRddCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Requested Delivery Dates are respected in lead time calculations">
                    RDD Respected ({deliveryMetrics.hasRddCount} Shipments)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Measures actual freight arrival adherence against expected delivery targets and customer requested dates (RDD).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">Completed Deliveries:</span>
              <span className="font-mono font-bold text-slate-800">{deliveryMetrics.totalCompleted}</span>
            </div>
            <button 
              onClick={() => onNavigate('forwarding_report')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Source</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 8 Connected Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          {/* 1. Total Deliveries */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Deliveries</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-slate-900">{deliveryMetrics.totalDeliveries}</span>
              <Package className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Monitored consignments</span>
          </div>

          {/* 2. Delivered */}
          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Delivered</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-emerald-700">{deliveryMetrics.delivered}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-[10px] text-emerald-600 mt-1">{deliveryMetrics.deliveredPct}% of total</span>
          </div>

          {/* 3. In Transit */}
          <div className="p-3 rounded-lg bg-cyan-50/50 border border-cyan-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-cyan-800 uppercase tracking-wider">In Transit</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-cyan-700">{deliveryMetrics.inTransit}</span>
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <span className="text-[10px] text-cyan-600 mt-1">{deliveryMetrics.inTransitPct}% of total</span>
          </div>

          {/* 4. Pending */}
          <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Pending</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-amber-700">{deliveryMetrics.pending}</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-[10px] text-amber-600 mt-1">{deliveryMetrics.pendingPct}% of total</span>
          </div>

          {/* 5. Delayed Shipments */}
          <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Delayed</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-rose-700">{deliveryMetrics.delayed}</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-[10px] text-rose-600 mt-1">{deliveryMetrics.delayedPct}% of total</span>
          </div>

          {/* 6. On-Time (HIT) */}
          <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wider">On-Time (HIT)</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-emerald-800">{deliveryMetrics.onTimeCount}</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-[10px] text-emerald-700 mt-1">TAT ≤ Target/RDD</span>
          </div>

          {/* 7. Delayed (MISSED) */}
          <div className="p-3 rounded-lg bg-rose-50/80 border border-rose-200 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-rose-900 uppercase tracking-wider">Delayed (MISSED)</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-rose-800">{deliveryMetrics.delayedOutcomeCount}</span>
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-[10px] text-rose-700 mt-1">TAT &gt; Target/RDD</span>
          </div>

          {/* 8. Delivery Performance Rate */}
          <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider">Performance Rate</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-blue-800">
                {deliveryMetrics.deliveryPerformancePercentage !== null 
                  ? `${deliveryMetrics.deliveryPerformancePercentage}%` 
                  : 'N/A'}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-[10px] text-blue-700 mt-1">On-Time ÷ Completed</span>
          </div>
        </div>

        {/* Visual Multi-Segment Status Distribution Bar */}
        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between items-center text-xs text-slate-600 flex-wrap gap-2">
            <span className="font-medium">Delivery Status Distribution</span>
            <div className="flex items-center gap-3 text-[11px] font-semibold flex-wrap">
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Delivered: {deliveryMetrics.delivered} ({deliveryMetrics.deliveredPct}%)</span>
              </span>
              <span className="text-cyan-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>In Transit: {deliveryMetrics.inTransit} ({deliveryMetrics.inTransitPct}%)</span>
              </span>
              <span className="text-amber-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Pending: {deliveryMetrics.pending} ({deliveryMetrics.pendingPct}%)</span>
              </span>
              {deliveryMetrics.delayed > 0 && (
                <span className="text-rose-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Delayed: {deliveryMetrics.delayed} ({deliveryMetrics.delayedPct}%)</span>
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            {deliveryMetrics.totalDeliveries > 0 ? (
              <>
                <div 
                  style={{ width: `${deliveryMetrics.deliveredPct}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  title={`Delivered: ${deliveryMetrics.deliveredPct}%`} 
                />
                <div 
                  style={{ width: `${deliveryMetrics.inTransitPct}%` }} 
                  className="bg-cyan-500 h-full transition-all duration-500" 
                  title={`In Transit: ${deliveryMetrics.inTransitPct}%`} 
                />
                <div 
                  style={{ width: `${deliveryMetrics.pendingPct}%` }} 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  title={`Pending: ${deliveryMetrics.pendingPct}%`} 
                />
                <div 
                  style={{ width: `${deliveryMetrics.delayedPct}%` }} 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  title={`Delayed: ${deliveryMetrics.delayedPct}%`} 
                />
              </>
            ) : (
              <div className="bg-slate-200 w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-medium">
                No delivery data available for the selected filters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 6. POD SUMMARY, DISPATCHING SUMMARY & ACTION ALERTS (Sections 2, 5, 12, 14) */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Box 1: SEPARATE POD SUMMARY SECTION (Section 5, 6, 12) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-purple-700" />
                  <span>POD Performance Summary</span>
                </h2>
                <p className="text-xs text-slate-500">Proof of Delivery tracking & hardcopy SLA adherence</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono">
                <span>
                  {podMetrics.podPerformancePercentage !== null 
                    ? `${podMetrics.podPerformancePercentage}% HIT` 
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* POD Metric Breakdown Cards */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded bg-purple-50/70 border border-purple-100">
                <div className="font-bold text-purple-800 font-mono text-base">{podMetrics.podPending}</div>
                <div className="text-[11px] text-purple-700 font-semibold mt-0.5">POD Pending</div>
              </div>
              <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-100">
                <div className="font-bold text-emerald-800 font-mono text-base">{podMetrics.podHitCount}</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">POD On Time (Hit)</div>
              </div>
              <div className="p-2.5 rounded bg-rose-50/70 border border-rose-100">
                <div className="font-bold text-rose-800 font-mono text-base">{podMetrics.podMissedCount}</div>
                <div className="text-[11px] text-rose-700 font-semibold mt-0.5">POD Delayed (Missed)</div>
              </div>
            </div>

            {/* Visual POD Distribution Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium">POD Return Fulfillment</span>
                <span className="font-bold font-mono text-slate-900">{podMetrics.podReturned} Returned ({podMetrics.returnFulfillmentPct}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${podMetrics.returnFulfillmentPct}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  title={`Returned: ${podMetrics.returnFulfillmentPct}%`} 
                />
                <div 
                  style={{ width: `${100 - podMetrics.returnFulfillmentPct}%` }} 
                  className="bg-purple-300 h-full transition-all duration-500" 
                  title={`Pending: ${100 - podMetrics.returnFulfillmentPct}%`} 
                />
              </div>
            </div>

            {/* Detailed POD Performance Metrics */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">POD Performance Rate:</span>
                <span className="font-bold text-purple-800 font-mono text-sm">
                  {podMetrics.podPerformancePercentage !== null 
                    ? `${podMetrics.podPerformancePercentage}%` 
                    : 'N/A (No completed PODs)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Completed / Evaluated PODs:</span>
                <span className="font-bold text-slate-800 font-mono">{podMetrics.totalCompletedPod} records</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Physical Hardcopies Verified:</span>
                <span className="font-bold text-emerald-700 font-mono">{podMetrics.podReturned} receipts</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                <span>Formula: POD HIT ÷ Total Completed PODs × 100</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Target Turnaround: <strong>3-5 Days</strong></span>
            <button 
              onClick={() => onNavigate('forwarding_report')}
              className="text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage PODs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Box 2: DISPATCHING SUMMARY (Section 2) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-700" />
                  <span>Dispatching Summary</span>
                </h2>
                <p className="text-xs text-slate-500">Daily Dispatching fleet & loading bay operations</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                <span>
                  {dispatchMetrics.completionRate !== null
                    ? `${dispatchMetrics.completionRate}% Done`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Dispatch Breakdown Cards */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded bg-blue-50/70 border border-blue-100">
                <div className="font-bold text-blue-800 font-mono text-base">{dispatchMetrics.total}</div>
                <div className="text-[11px] text-blue-700 font-semibold mt-0.5">Total Dispatches</div>
              </div>
              <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-100">
                <div className="font-bold text-emerald-800 font-mono text-base">{dispatchMetrics.completedDeparted}</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Departed/Done</div>
              </div>
              <div className="p-2.5 rounded bg-amber-50/70 border border-amber-100">
                <div className="font-bold text-amber-800 font-mono text-base">{dispatchMetrics.pendingTotal}</div>
                <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Pending/Loading</div>
              </div>
            </div>

            {/* Detailed Dispatch Metrics List */}
            <div className="mt-4 space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dispatches Today:</span>
                <span className="font-bold text-blue-800 font-mono">{dispatchMetrics.todayCount} active runs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">En Route / In Transit:</span>
                <span className="font-bold text-cyan-800 font-mono">{dispatchMetrics.inTransit} runs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">In Loading Bay:</span>
                <span className="font-bold text-amber-700 font-mono">{dispatchMetrics.inLoading} staging</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dispatch Delays:</span>
                <span className={`font-bold font-mono ${dispatchMetrics.delayed > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {dispatchMetrics.delayed} delayed
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Terminal Dispatch Operations</span>
            <button 
              onClick={() => onNavigate('dispatch')}
              className="text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Daily Dispatch View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Box 3: UNRESOLVED ALERTS / NOTIFICATION SUMMARY (Section 14) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900">Operational Alerts</h2>
              </div>
              {actionRequiredItems.length > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {actionRequiredItems.length} Unresolved
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  All Clear
                </span>
              )}
            </div>

            {/* Action Items List */}
            <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {actionRequiredItems.length > 0 ? (
                actionRequiredItems.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.category === 'Incomplete Dispatch' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : item.category === 'POD Overdue' || item.category === 'Delivery Delayed'
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                        }`}>
                          {item.badgeText}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>

                    <button
                      onClick={item.onAction}
                      className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded shrink-0 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">All Operations Clear</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No overdue PODs, dispatching blockers, or delayed deliveries.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Automated operational monitoring</span>
            <button 
              onClick={() => onNavigate('forwarding_report')}
              className="text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All Reports</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 7. CLIENT-LEVEL OPERATIONAL SUMMARY (Section 9) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Client-Level Operational Summary</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shipment volumes, delivery performance, and POD return rates broken down by client account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              {clientSummaries.length} Accounts Monitored
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Client Name</th>
                <th className="py-2.5 px-4">Coordinator</th>
                <th className="py-2.5 px-4 text-center">Total Shipments</th>
                <th className="py-2.5 px-4 text-center">Total Deliveries</th>
                <th className="py-2.5 px-4 text-center">Delayed Deliveries</th>
                <th className="py-2.5 px-4 text-center">Delivery SLA</th>
                <th className="py-2.5 px-4 text-center">POD Pending</th>
                <th className="py-2.5 px-4 text-center">POD Delayed</th>
                <th className="py-2.5 px-4 text-center">POD SLA</th>
                <th className="py-2.5 px-4 text-right">Filter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clientSummaries.length > 0 ? (
                clientSummaries.map((c) => {
                  const isSelected = selectedClientFilter.toLowerCase() === c.name.toLowerCase();

                  return (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/50 font-medium' : ''}`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectClientFromDashboard(c.name)}
                            className="hover:underline text-left text-slate-900 hover:text-blue-700 font-semibold"
                          >
                            {c.name}
                          </button>
                          <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.2 bg-slate-100 rounded border border-slate-200">
                            {c.code}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {c.assignedCoordinator}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-center">
                        {c.totalShipments}
                      </td>

                      <td className="py-3 px-4 font-mono text-emerald-800 font-semibold text-center">
                        {c.totalDeliveries}
                      </td>

                      <td className="py-3 px-4 font-mono text-center">
                        <span className={`font-semibold ${c.delayedDeliveries > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                          {c.delayedDeliveries}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-center">
                        <span className={c.deliverySlaRate !== 'N/A' && parseFloat(c.deliverySlaRate) < 90 ? 'text-rose-700' : 'text-emerald-700'}>
                          {c.deliverySlaRate}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-purple-700 font-semibold text-center">
                        {c.podPending}
                      </td>

                      <td className="py-3 px-4 font-mono text-center">
                        <span className={`font-semibold ${c.podDelayed > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                          {c.podDelayed}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-center">
                        <span className={c.podSlaRate !== 'N/A' && parseFloat(c.podSlaRate) < 90 ? 'text-rose-700' : 'text-purple-700'}>
                          {c.podSlaRate}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClientFilter('ALL');
                            } else {
                              setSelectedClientFilter(c.name);
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-blue-700 text-white border-blue-700' 
                              : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-300'
                          }`}
                        >
                          <Filter className="w-3 h-3" />
                          <span>{isSelected ? 'Filtered' : 'Filter'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-500 bg-slate-50/50">
                    No client records available for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 8. TODAY'S / PERIOD DISPATCHES TABLE */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Dispatches for Selected Scope</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {periodFilteredDispatches.length} Active Run{periodFilteredDispatches.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live fleet departures, loading bay activities, and consignee deliveries from Daily Dispatching
            </p>
          </div>
          <button
            id="btn-view-all-dispatches"
            onClick={() => onNavigate('dispatch')}
            className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 cursor-pointer px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
          >
            <span>VIEW ALL DISPATCHES ({activeDispatches.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Planned Delivery</th>
                <th className="py-2.5 px-4">Delivery Date</th>
                <th className="py-2.5 px-4">Client</th>
                <th className="py-2.5 px-4">Consignee</th>
                <th className="py-2.5 px-4">POD Number</th>
                <th className="py-2.5 px-4">Destination</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dispatchesDisplayList.length > 0 ? (
                dispatchesDisplayList.map((dispatch) => (
                  <tr 
                    key={dispatch.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onSelectDispatch(dispatch)}
                  >
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {dispatch.plannedDeliveryDate || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 font-medium">
                      {dispatch.deliveryDate || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClientFromDashboard(dispatch.clientName);
                        }}
                        className="hover:underline text-left text-slate-900 hover:text-blue-700 font-semibold"
                      >
                        {dispatch.clientName}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[180px] truncate" title={dispatch.consignee}>
                      {dispatch.consignee}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {dispatch.podNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={dispatch.destination}>
                      {dispatch.destination}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(dispatch.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDispatch(dispatch);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded border border-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500 bg-slate-50/50">
                    No dispatch records found for the selected filter period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 9. RECENT MASTER SHIPMENTS TABLE */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Recent Master Forwarding Shipments</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Shared Master List
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live freight movements across nationwide distribution routes with real-time lead time evaluations
            </p>
          </div>
          <button
            id="btn-view-all-shipments"
            onClick={() => onNavigate('forwarding_report')}
            className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 cursor-pointer px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
          >
            <span>VIEW FORWARDING REPORT ({activeForwarding.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Client</th>
                <th className="py-2.5 px-4">Consignee</th>
                <th className="py-2.5 px-4">Destination</th>
                <th className="py-2.5 px-4">POD Number</th>
                <th className="py-2.5 px-4">Dispatch Date</th>
                <th className="py-2.5 px-4">Delivery Status</th>
                <th className="py-2.5 px-4">POD Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentShipmentsList.length > 0 ? (
                recentShipmentsList.map((shipment: any) => (
                  <tr 
                    key={shipment.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => {
                      if (shipment.referenceNumber && onSelectForwardingRecord) {
                        onSelectForwardingRecord(shipment);
                      } else {
                        onSelectShipment(shipment);
                      }
                    }}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClientFromDashboard(shipment.client || shipment.clientName);
                        }}
                        className="hover:underline text-left text-slate-900 hover:text-blue-700 font-semibold"
                      >
                        {shipment.client || shipment.clientName}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[180px] truncate" title={shipment.consignee}>
                      {shipment.consignee}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={shipment.destination}>
                      {shipment.destination}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {shipment.podNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {shipment.actualDispatchDate || shipment.actualDeparture || shipment.bookedDate || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(shipment.deliveryStatus || shipment.status)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        shipment.podStatus === 'Returned' || shipment.podStatus === 'POD On Time' || shipment.podPerformance === 'HIT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : shipment.podStatus === 'POD Delayed' || shipment.podPerformance === 'MISSED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {shipment.podStatus || (shipment.dateOfPodReturn ? 'Returned' : 'Pending')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (shipment.referenceNumber && onSelectForwardingRecord) {
                            onSelectForwardingRecord(shipment);
                          } else {
                            onSelectShipment(shipment);
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded border border-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500 bg-slate-50/50">
                    No shipments available for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
