export type NavigationTab = 
  | 'dashboard' 
  | 'dispatch' 
  | 'client_management'
  | 'clients' 
  | 'forwarding_report'
  | 'reports' 
  | 'trash'
  | 'settings';

export type DeliveryType = 'GADC' | 'ISCI' | 'XSEED' | 'LTL' | 'FTL' | 'Inter-Island' | 'Air Freight';

export type DispatchStatus = 
  | 'In Loading' 
  | 'Departed' 
  | 'In Transit' 
  | 'Arrived at Hub' 
  | 'Delivered' 
  | 'Delayed' 
  | 'Pending Pickup';

export type ShipmentStatus = 
  | 'Booked' 
  | 'In Transit' 
  | 'Out for Delivery' 
  | 'Delivered' 
  | 'Delayed' 
  | 'Under Customs/Documentation';

export type PhilippineArea = 'Luzon' | 'Visayas' | 'Mindanao' | 'NCR';

export type ForwardingMode = 'Sea Freight' | 'Air Freight' | 'RORO' | 'Land Freight';

export type ForwardingDeliveryStatus = 'On Time' | 'In Transit' | 'Delayed' | 'Delivered' | 'Pending Delivery';

export type AutomaticPodStatus = 'Not Applicable' | 'POD Pending' | 'POD On Time' | 'POD Delayed';

export type PODStatus = 'Returned' | 'Pending Return' | 'Transmitted' | 'Under Review' | AutomaticPodStatus;

export type PerformanceResult = 'HIT' | 'MISSED' | 'PENDING';

export type DelayReason = 
  | 'Client Reschedule'
  | 'Weather Condition'
  | 'Operational Issue'
  | 'Port / Shipping Delay'
  | 'Vehicle Issue'
  | 'Documentation Issue'
  | 'Other';

export const DELAY_REASON_OPTIONS: DelayReason[] = [
  'Client Reschedule',
  'Weather Condition',
  'Operational Issue',
  'Port / Shipping Delay',
  'Vehicle Issue',
  'Documentation Issue',
  'Other',
];

export type ForwardingDispatchNotificationStatus = 'NEW' | 'IN PROGRESS' | 'COMPLETED';

export type PODNotificationType = 
  | 'POD_DUE_SOON'        // 🟡 POD Approaching Due / Due Tomorrow
  | 'POD_OVERDUE'         // 🔴 POD Overdue (Pending & past due date)
  | 'POD_RETURNED_LATE'   // 🔴 POD Returned Late (Entered after due date)
  | 'POD_RETURNED_ONTIME'; // 🟢 POD Returned On Time (Entered on or before due date)

export interface PODNotification {
  id: string;
  dedupKey: string; // Unique deduplication key e.g. `${recordId}_${type}`
  type: PODNotificationType;
  title: string;
  message: string;
  recordId: string;
  client: string;
  clientId?: string;
  coordinator: string;
  referenceNumber: string;
  podNumber?: string;
  consignee: string;
  destination?: string;
  area?: PhilippineArea;
  actualDeliveryDate?: string;
  podReturnDueDate?: string;
  podReturnDueDateFormatted?: string;
  actualPodReturnDate?: string;
  podSla: PerformanceResult;
  podStatus: PODStatus;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
}

export interface ForwardingDispatchNotification {
  id: string;
  forwardingRecordId: string;
  client: string;
  clientId?: string;
  consignee: string;
  podNumber: string;
  referenceNumber?: string;
  deliveryDate?: string;
  modeOfShipment?: ForwardingMode;
  area?: PhilippineArea;
  quantity?: number;
  unit?: string;
  destination?: string;
  destinationCode?: string;
  source: 'Forwarding Progressive Report';
  message: string;
  status: ForwardingDispatchNotificationStatus;
  createdAt: string;
  completedAt?: string;
  completedDispatchId?: string;
  isDismissed?: boolean;
}

export interface ForwardingProgressiveRecord {
  id: string;
  // 1. PROJECT / CLIENT INFORMATION
  month: string;
  coordinator: string;
  client: string;
  clientId?: string;
  modeOfShipment: ForwardingMode;
  area: PhilippineArea;
  referenceNumber: string; // Project Code / Ref

  // 2. DISPATCH & DESTINATION
  actualDispatchDate: string;
  consignee: string;
  destinationCode: string;
  destination?: string;
  plannedDeliveryDate?: string;
  expectedDeliveryDate?: string; // Centralized Leadtime Calculation Result (Prompt 2E-1)
  expectedDeliveryDateFormatted?: string;
  requestDeliveryDate?: string; // Request Delivery Date (RDD - Prompt 2E-2: Client Specific Requirement, Optional)
  leadtimeStatus?: string;
  leadtimeMessage?: string;
  quantity: number;
  unit?: string;
  courier: string;
  truckProvider?: string;
  plateNumber?: string;
  driverName?: string;
  deliveryType?: DeliveryType;
  timeArrived?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDepartureTime?: string;
  truckArrivalTime?: string;
  loadingStartTime?: string;
  loadingEndTime?: string;
  departureTime?: string;

  // 3. CARGO INFORMATION (Conditional)
  cbm?: number; // Sea Freight
  volumeWeightKg?: number; // Air Freight
  actualWeightKg?: number; // Air Freight / General
  chargeableWeightFees: string;
  declaredValue: string;

  // 4. SHIPMENT REFERENCES
  podNumber: string;
  awbCourierRefNumber: string;

  // 5. DELIVERY INFORMATION
  deliveryStatus: ForwardingDeliveryStatus;
  receiversName: string;
  actualDeliveryDate: string;

  // 6. DELIVERY PERFORMANCE (Calculated)
  deliveryLeadTimeDays: number;
  deliveryTatDays: number;
  deliveryPerformance: PerformanceResult;
  reasonForDelay?: string;
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;

  // 7. POD MONITORING (Calculated)
  podStatus: PODStatus;
  dateOfPodReturn: string;
  actualPodReturnDate?: string;
  podLeadTimeDays: number;
  podReturnDueDate?: string; // YYYY-MM-DD
  podReturnDueDateFormatted?: string;
  podTatDays: number;
  podPerformance: PerformanceResult;
  podReasonForDelay?: string;

  // 8. SAFE DELETE & RECOVERY AUDIT
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;

  // 9. IMPORT SOURCE & AUDIT
  importSource?: 'Manual Entry' | 'Excel Import';
  importedAt?: string;
}

export interface UnifiedShipment {
  id: string; // e.g. "DSP-2026-0801" or "FPR-2026-001"
  
  // 1. Account & Consignment Identification
  client: string;
  clientId?: string;
  coordinator?: string;
  month?: string;
  deliveryType?: DeliveryType;
  modeOfShipment: ForwardingMode | 'Multimodal';
  area: PhilippineArea;
  referenceNumber: string;

  // 2. Dispatch & Origin / Destination
  originPickupPoint?: string;
  destination: string;
  destinationCode?: string;
  consignee: string;
  contactNumber?: string;
  
  // 3. Cargo Details
  itemDescription?: string;
  quantity: number;
  unit: string;
  declaredValue?: string;
  chargeableWeightFees?: string;
  chargePerWeight?: string;
  cbm?: number;
  volumeWeightKg?: number;
  actualWeightKg?: number;

  // 4. Transport & Equipment Assignment
  truckProvider?: string;
  courier?: string;
  plateNumber?: string;
  vanNumber?: string;
  driverName?: string;
  driverContact?: string;
  vesselFlightNo?: string;

  // 5. Operational Timeline & Clock
  bookedDate?: string;
  pickupDate?: string;
  actualDispatchDate: string;
  deliveryDate?: string;
  plannedDeliveryDate: string;
  expectedDeliveryDate?: string;
  requestDeliveryDate?: string; // Request Delivery Date (RDD - Client Specific Requirement, Optional)
  actualDeliveryDate?: string;
  truckArrivalTime?: string;
  loadingStartTime?: string;
  loadingEndTime?: string;
  departureTime?: string;
  timeArrived?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDepartureTime?: string;
  dateTransmitted?: string;

  // 6. Documentation References
  podNumber: string;
  manifestNumber?: string;
  awbNumber?: string;
  awbCourierRefNumber?: string;
  drNumber?: string;
  sealNumber?: string;
  billOfLandingNumber?: string;
  remarks?: string;
  deliveryRemarks?: string;

  // 7. Multi-View Operational Statuses
  dispatchStatus: DispatchStatus;
  shipmentStatus: ShipmentStatus;
  deliveryStatus: ForwardingDeliveryStatus;
  receiversName?: string;

  // 8. Automated Performance & SLA Metrics
  deliveryLeadTimeDays: number;
  deliveryTatDays: number;
  deliveryPerformance: PerformanceResult;
  reasonForDelay?: string;
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;
  numberOfDays?: number;
  tatNumber?: string;

  // 9. Automated POD Return Monitoring
  podStatus: PODStatus;
  dateOfPodReturn?: string;
  actualPodReturnDate?: string;
  podLeadTimeDays: number;
  podReturnDueDate?: string; // YYYY-MM-DD
  podReturnDueDateFormatted?: string;
  podTatDays: number;
  podPerformance: PerformanceResult;
  podReasonForDelay?: string;

  // 10. Safe Delete & Audit
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export interface DispatchRecord {
  id: string;
  deliveryDate: string;
  deliveryArea?: PhilippineArea;
  area?: PhilippineArea;
  modeOfShipment?: ForwardingMode | string;
  podNumber: string;
  quantityCasesBoxes: number;
  unit: string;
  deliveryType: DeliveryType;
  destination: string;
  consignee: string;
  truckProvider: string;
  plateNumber: string;
  truckArrivalTime?: string;
  loadingStartTime?: string;
  loadingEndTime?: string;
  departureTime?: string;
  timeArrived?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDepartureTime?: string;
  plannedDeliveryDate: string;
  expectedDeliveryDate?: string;
  requestDeliveryDate?: string;
  manifestNumber: string;
  remarks: string;
  status: DispatchStatus;
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;
  driverName?: string;
  driverContact?: string;
  clientName: string;
  totalWeightKg?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  importSource?: 'Manual Entry' | 'Excel Import';
  importedAt?: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  code: string;
  assignedCoordinator?: string;
  accountManager?: string;
  industry?: string;
  activeShipments?: number;
  deliveredThisMonth?: number;
  onTimeRate?: number; // e.g. 98.4%
  primaryContact: string;
  email: string;
  phone: string;
  address?: string;
  area?: string;
  remarks?: string;
  notes?: string;
  tin?: string;
  isDeactivated?: boolean;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export interface ShipmentRecord {
  id: string;
  // 1. Booking / Client Information
  client: string;
  clientId: string;
  monthStarted: string;
  bookedDate: string;
  pickupDate: string;
  consignee: string;
  contactNumber: string;
  modeOfShipment: ForwardingMode | 'Multimodal';
  
  // 2. Origin and Destination
  originPickupPoint: string;
  destination: string;
  area: PhilippineArea;
  requestedDeliveryDate: string; // RDD
  
  // 3. Cargo Information
  itemDescription: string;
  quantityBoxes: number;
  amount: string;
  actualCbm: number;
  volumeWeight: number;
  actualWeightKg: number;
  chargePerWeight: string;

  // 4. Transport Information
  vanNumber: string;
  truckPlate?: string;
  vesselFlightNo?: string;
  estimatedDeparture: string;
  actualDeparture: string;
  estimatedArrival: string;
  actualArrival: string;

  // 5. Delivery and Documentation
  podNumber: string;
  awbNumber: string;
  drNumber: string;
  sealNumber: string;
  billOfLandingNumber: string;
  manifestNumber: string;
  plannedDeliveryDate: string; // Planned Delivery Date
  expectedDeliveryDate?: string; // Centralized Leadtime Calculation Result
  requestDeliveryDate?: string; // Request Delivery Date (RDD)
  actualDeliveryDate: string;  // Actual Delivery Date
  deliveryDate: string;        // Delivery Date / Actual Delivery Date reference
  receiversName: string;
  datePodReceived: string;
  dateTransmitted: string;
  deliveryRemarks: string;

  // 6. Performance
  status: ShipmentStatus;
  leadTime: string; // e.g. "3 Days"
  podLeadTimeDays?: number;
  podReturnDueDate?: string;
  podReturnDueDateFormatted?: string;
  tatNumber: string; // Turn Around Time e.g. "TAT-0482"
  deliveryPerformance: 'On-Time' | 'Delayed' | 'Within SLA' | 'Pending Delivery';
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;
  numberOfDays: number;

  // 7. Safe Delete & Audit
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export type OperationalRecordType = 'dispatch' | 'shipment' | 'forwarding_report' | 'client';

export interface TrashItem {
  id: string;
  recordType: OperationalRecordType;
  recordIdentifier: string; // e.g. POD-884920, PRJ-ISCI-049, or Client Code
  title: string;
  clientName: string;
  originalDate?: string;
  originalStatus?: string;
  deletedAt: string;
  deletedBy: string;
  deleteReason?: string;
  additionalDetails?: string;
}

export interface DashboardSummary {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  onTimePercentage: number;
  activeTrucks: number;
  totalBoxesToday: number;
}

export interface UserProfile {
  name: string;
  role: string;
  department: string;
  email: string;
  employeeId: string;
  hubLocation: string;
}

export interface BusinessRule {
  id: string;
  clientName?: string;
  modeOfShipment?: ForwardingMode | string;
  area?: PhilippineArea | string;
  deliveryMethod?: string;
  deliveryLeadTimeDays: number;
  podLeadTimeDays?: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  provider: 'supabase' | 'shared-cloud-sync';
  errorMessage?: string | null;
}

export interface ImportHistoryRecord {
  id: string;
  fileName: string;
  fileSize?: string;
  importedAt: string;
  importedBy: string;
  totalRows: number;
  successfullyImported: number;
  warnings: number;
  skipped: number;
  status: 'Completed' | 'Partially Completed' | 'Failed';
  details?: string;
}

export type OFIIFieldKey =
  | 'none'
  | 'month'
  | 'coordinator'
  | 'client'
  | 'modeOfShipment'
  | 'area'
  | 'actualDispatchDate'
  | 'expectedDeliveryDate'
  | 'requestDeliveryDate'
  | 'plannedDeliveryDate'
  | 'consignee'
  | 'destination'
  | 'destinationCode'
  | 'quantity'
  | 'unit'
  | 'cbm'
  | 'referenceNumber'
  | 'volumeWeightKg'
  | 'actualWeightKg'
  | 'chargeableWeightFees'
  | 'declaredValue'
  | 'courier'
  | 'truckProvider'
  | 'plateNumber'
  | 'driverName'
  | 'podNumber'
  | 'awbCourierRefNumber'
  | 'deliveryStatus'
  | 'receiversName'
  | 'actualDeliveryDate'
  | 'podStatus'
  | 'dateOfPodReturn'
  | 'deliveryTatDays'
  | 'deliveryLeadTimeDays'
  | 'deliveryPerformance'
  | 'reasonForDelay'
  | 'podTatDays'
  | 'podLeadTimeDays'
  | 'podPerformance'
  | 'podReasonForDelay'
  | 'timeArrived'
  | 'startLoadingTime'
  | 'endLoadingTime'
  | 'actualDepartureTime'
  | 'truckArrivalTime'
  | 'loadingStartTime'
  | 'loadingEndTime'
  | 'departureTime'
  | 'deliveryType';

