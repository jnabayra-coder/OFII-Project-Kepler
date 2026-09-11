import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  UserCheck, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Package, 
  ShieldCheck, 
  Phone, 
  Radio, 
  SlidersHorizontal, 
  FileCheck,
  Building2,
  X,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { 
  ForwardingProgressiveRecord, 
  DispatchRecord, 
  UserProfile, 
  OFIIDriver, 
  OFIIHelper 
} from '../types';
import { OFII_DRIVERS_ROSTER } from '../data/mockData';
import { OFII_HELPERS_ROSTER, getRegisteredUsers } from '../data/userAccounts';
import { AssignDriverModal, DeliveryAssignTarget } from './AssignDriverModal';

interface DriverHeadPortalViewProps {
  currentUser: UserProfile;
  forwardingRecords: ForwardingProgressiveRecord[];
  dispatches: DispatchRecord[];
  onSelectForwardingRecord?: (record: ForwardingProgressiveRecord) => void;
}

type MainTab = 'DELIVERY_ASSIGNMENT' | 'DRIVERS_ROSTER' | 'HELPERS_ROSTER';
type StatusFilter = 'All' | 'Unassigned' | 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered';

export const DriverHeadPortalView: React.FC<DriverHeadPortalViewProps> = ({
  currentUser,
  forwardingRecords,
  dispatches,
  onSelectForwardingRecord,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<MainTab>('DELIVERY_ASSIGNMENT');

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [driverFilter, setDriverFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assignment Modal
  const [assignModalTarget, setAssignModalTarget] = useState<DeliveryAssignTarget | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

  // Role permissions check (Requirement 13)
  const canPerformAssignment = currentUser.userRole === 'driver_head' || currentUser.userRole === 'office_head';

  // 1. Consolidated delivery records with driver/helper assignment fields
  const deliveryList = useMemo(() => {
    return forwardingRecords.filter(f => !f.isDeleted).map(f => {
      const matchingDispatch = dispatches.find(d => d.id === f.id || d.podNumber === f.podNumber);
      
      const rawDriver = f.driverName || f.assignedDriver || matchingDispatch?.driverName || matchingDispatch?.assignedDriver || '';
      const isAssigned = Boolean(rawDriver && rawDriver.trim() !== '' && rawDriver.toLowerCase() !== 'unassigned' && rawDriver.toLowerCase() !== 'tbd');
      
      const driver = isAssigned ? rawDriver : '';
      const driverId = f.assignedDriverId || matchingDispatch?.assignedDriverId || '';
      const helper = f.helperName || f.assignedHelper || matchingDispatch?.helperName || matchingDispatch?.assignedHelper || '';
      const helperId = f.assignedHelperId || matchingDispatch?.assignedHelperId || '';
      const plate = f.plateNumber || matchingDispatch?.plateNumber || '';
      const vehicle = f.courier || f.truckProvider || matchingDispatch?.truckProvider || 'OFII Dedicated Transport';
      const assignmentStatus: 'Unassigned' | 'Assigned' = isAssigned ? 'Assigned' : 'Unassigned';

      // Current delivery status
      const deliveryStatus = f.deliveryStatus || matchingDispatch?.status || (isAssigned ? 'Assigned' : 'Unassigned');

      return {
        id: f.id,
        podNumber: f.podNumber,
        referenceNumber: f.referenceNumber || matchingDispatch?.manifestNumber || f.id,
        client: f.client || matchingDispatch?.clientName || 'OFII Client',
        consignee: f.consignee || matchingDispatch?.consignee || 'Consignee Site',
        area: f.area || matchingDispatch?.area || 'NCR',
        destination: f.destination || f.destinationCode || matchingDispatch?.destination || f.area,
        plannedDeliveryDate: f.plannedDeliveryDate || f.deliveryDate || matchingDispatch?.plannedDeliveryDate || '',
        actualDispatchDate: f.actualDispatchDate || matchingDispatch?.deliveryDate || '',
        rdd: f.requestDeliveryDate || matchingDispatch?.requestDeliveryDate || 'Standard SLA',
        modeOfShipment: f.deliveryType || f.modeOfShipment || matchingDispatch?.modeOfShipment || 'Land Freight',
        quantity: f.quantity || matchingDispatch?.quantityCasesBoxes || 0,
        unit: f.unit || matchingDispatch?.unit || 'cases',
        driverName: driver,
        driverId,
        helperName: helper,
        helperId,
        plateNumber: plate,
        vehicleType: vehicle,
        deliveryStatus,
        currentLocation: f.currentLocation || matchingDispatch?.currentLocation || '',
        driverProgressStatus: f.driverProgressStatus || matchingDispatch?.driverProgressStatus || (isAssigned ? 'Assigned' : 'Pending'),
        progressUpdatedAt: f.progressUpdatedAt || matchingDispatch?.progressUpdatedAt,
        assignmentStatus,
        isAssigned,
      };
    });
  }, [forwardingRecords, dispatches]);

  // 2. Summary KPI Metrics from REAL delivery records (Requirement 11)
  const summary = useMemo(() => {
    return {
      unassigned: deliveryList.filter(d => !d.isAssigned || d.assignmentStatus === 'Unassigned').length,
      assigned: deliveryList.filter(d => d.isAssigned || d.assignmentStatus === 'Assigned').length,
      inTransit: deliveryList.filter(d => d.deliveryStatus === 'In Transit' || d.driverProgressStatus === 'In Transit').length,
      outForDelivery: deliveryList.filter(d => d.deliveryStatus === 'Out for Delivery' || d.driverProgressStatus === 'Out for Delivery').length,
      delivered: deliveryList.filter(d => d.deliveryStatus === 'Delivered').length,
    };
  }, [deliveryList]);

  // 3. Unique client names for filter dropdown
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    deliveryList.forEach(d => {
      if (d.client) set.add(d.client);
    });
    return Array.from(set).sort();
  }, [deliveryList]);

  // 4. Distinct drivers for filter dropdown
  const uniqueDrivers = useMemo(() => {
    const list = OFII_DRIVERS_ROSTER.map(d => d.name);
    return list;
  }, []);

  // 5. Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveryList.filter(item => {
      // Status Filter
      if (statusFilter === 'Unassigned' && (item.isAssigned || item.assignmentStatus === 'Assigned')) {
        return false;
      }
      if (statusFilter === 'Assigned' && (!item.isAssigned || item.assignmentStatus === 'Unassigned')) {
        return false;
      }
      if (statusFilter === 'In Transit' && item.deliveryStatus !== 'In Transit' && item.driverProgressStatus !== 'In Transit') {
        return false;
      }
      if (statusFilter === 'Out for Delivery' && item.deliveryStatus !== 'Out for Delivery' && item.driverProgressStatus !== 'Out for Delivery') {
        return false;
      }
      if (statusFilter === 'Delivered' && item.deliveryStatus !== 'Delivered') {
        return false;
      }

      // Client Filter
      if (clientFilter !== 'All' && item.client.toLowerCase() !== clientFilter.toLowerCase()) {
        return false;
      }

      // Area Filter
      if (areaFilter !== 'All' && item.area.toLowerCase() !== areaFilter.toLowerCase()) {
        return false;
      }

      // Driver Filter
      if (driverFilter !== 'All') {
        if (driverFilter === 'Unassigned') {
          if (item.isAssigned) return false;
        } else if (item.driverName.toLowerCase() !== driverFilter.toLowerCase()) {
          return false;
        }
      }

      // Date Filter
      if (dateFilter) {
        const itemDate = item.plannedDeliveryDate || item.actualDispatchDate || '';
        if (!itemDate.startsWith(dateFilter)) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          item.podNumber.toLowerCase().includes(q) ||
          item.referenceNumber.toLowerCase().includes(q) ||
          item.client.toLowerCase().includes(q) ||
          item.consignee.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          item.area.toLowerCase().includes(q) ||
          item.driverName.toLowerCase().includes(q) ||
          item.helperName.toLowerCase().includes(q) ||
          item.plateNumber.toLowerCase().includes(q) ||
          item.modeOfShipment.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [deliveryList, statusFilter, clientFilter, areaFilter, driverFilter, dateFilter, searchQuery]);

  // Handle open Assign Modal
  const handleOpenAssign = (item: typeof deliveryList[0]) => {
    setAssignModalTarget({
      id: item.id,
      podNumber: item.podNumber,
      referenceNumber: item.referenceNumber,
      client: item.client,
      consignee: item.consignee,
      area: item.area,
      destination: item.destination,
      plannedDeliveryDate: item.plannedDeliveryDate,
      actualDispatchDate: item.actualDispatchDate,
      rdd: item.rdd,
      modeOfShipment: item.modeOfShipment,
      quantity: item.quantity,
      unit: item.unit,
      driverName: item.driverName,
      driverId: item.driverId,
      helperName: item.helperName,
      helperId: item.helperId,
      plateNumber: item.plateNumber,
      vehicleType: item.vehicleType,
      deliveryStatus: item.deliveryStatus,
      assignmentStatus: item.assignmentStatus,
    });
    setIsAssignModalOpen(true);
  };

  // Reset all filters helper
  const handleResetFilters = () => {
    setStatusFilter('All');
    setClientFilter('All');
    setAreaFilter('All');
    setDriverFilter('All');
    setDateFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'All' || clientFilter !== 'All' || areaFilter !== 'All' || driverFilter !== 'All' || dateFilter !== '' || searchQuery !== '';

  return (
    <div className="space-y-6 pb-12" id="driver-head-portal-root">
      {/* ========================================================================= */}
      {/* 1. HEADER & IDENTITY BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-xl p-6 text-white shadow-lg border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
              <Truck className="w-3.5 h-3.5" />
              Driver Head & Fleet Dispatch Authority
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>{currentUser.name}</span>
              <span className="text-xs font-semibold text-blue-200 bg-white/10 px-2.5 py-1 rounded-md border border-white/10">
                {currentUser.role || 'Fleet Dispatch & Driver Head'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-3xl leading-relaxed">
              Authorized central dispatcher for assigning OFII Fleet Drivers, designated Cargo Helpers, vehicle assets, and managing real-time delivery telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-black/30 p-3 rounded-lg border border-white/10 shrink-0">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Active Drivers:</span> {OFII_DRIVERS_ROSTER.length}
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Helper Crew:</span> {OFII_HELPERS_ROSTER.length}
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="text-xs text-blue-300 font-medium">
              Yard: <span className="font-mono text-white">Paranaque Central Transport Hub</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. OPERATIONAL SUMMARY KPI CARDS (Requirement 11) */}
      {/* Real delivery records: Unassigned, Assigned, In Transit, Out for Delivery, Delivered */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5" id="driver-head-summary-kpis">
        {/* Card 1: Unassigned Deliveries */}
        <div 
          onClick={() => {
            setActiveTab('DELIVERY_ASSIGNMENT');
            setStatusFilter('Unassigned');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'Unassigned' && activeTab === 'DELIVERY_ASSIGNMENT'
              ? 'bg-rose-50 border-rose-300 shadow-sm ring-2 ring-rose-500/30' 
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Unassigned Deliveries
            </span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-rose-700">{summary.unassigned}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Require Driver & Helper</div>
        </div>

        {/* Card 2: Assigned Deliveries */}
        <div 
          onClick={() => {
            setActiveTab('DELIVERY_ASSIGNMENT');
            setStatusFilter('Assigned');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'Assigned' && activeTab === 'DELIVERY_ASSIGNMENT'
              ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-500/30' 
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Assigned Deliveries
            </span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-blue-700">{summary.assigned}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Driver Designated</div>
        </div>

        {/* Card 3: In Transit */}
        <div 
          onClick={() => {
            setActiveTab('DELIVERY_ASSIGNMENT');
            setStatusFilter('In Transit');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'In Transit' && activeTab === 'DELIVERY_ASSIGNMENT'
              ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-2 ring-indigo-500/30' 
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
              In Transit
            </span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-indigo-700">{summary.inTransit}</div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">En Route to Hub/Location</div>
        </div>

        {/* Card 4: Out for Delivery */}
        <div 
          onClick={() => {
            setActiveTab('DELIVERY_ASSIGNMENT');
            setStatusFilter('Out for Delivery');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'Out for Delivery' && activeTab === 'DELIVERY_ASSIGNMENT'
              ? 'bg-amber-50 border-amber-300 shadow-sm ring-2 ring-amber-500/30' 
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Out for Delivery
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-amber-700">{summary.outForDelivery}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Final Consignee Leg</div>
        </div>

        {/* Card 5: Delivered */}
        <div 
          onClick={() => {
            setActiveTab('DELIVERY_ASSIGNMENT');
            setStatusFilter('Delivered');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            statusFilter === 'Delivered' && activeTab === 'DELIVERY_ASSIGNMENT'
              ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-500/30' 
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Delivered
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-emerald-700">{summary.delivered}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">POD Completed</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRIMARY VIEW NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('DELIVERY_ASSIGNMENT')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DELIVERY_ASSIGNMENT'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Delivery Assignment ({deliveryList.length})
          </button>

          <button
            onClick={() => setActiveTab('DRIVERS_ROSTER')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DRIVERS_ROSTER'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            OFII Fleet Drivers ({OFII_DRIVERS_ROSTER.length})
          </button>

          <button
            onClick={() => setActiveTab('HELPERS_ROSTER')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HELPERS_ROSTER'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Helper Crew ({OFII_HELPERS_ROSTER.length})
          </button>
        </div>

        {/* Quick count indicator */}
        <div className="text-xs text-slate-500 font-medium px-2 flex items-center gap-2">
          <span>Showing: <strong className="text-slate-800">{filteredDeliveries.length}</strong> of {deliveryList.length} orders</span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT VIEW: DELIVERY ASSIGNMENT (Requirement 2 & 10) */}
      {/* ========================================================================= */}
      {activeTab === 'DELIVERY_ASSIGNMENT' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-0" id="delivery-assignment-section">
          {/* Section Subheader & Controls */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Delivery Assignment Operations</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    Live Operational Dispatch
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign OFII drivers and cargo helpers to deliveries. Changes are synchronized to driver portals and dispatch boards in real time.
                </p>
              </div>

              {/* Text Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search client, destination, consignee, POD, driver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Toolbars (Requirement 10) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
              {/* Status Filter Dropdown / Pills */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assignment Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses ({deliveryList.length})</option>
                  <option value="Unassigned">Unassigned ({summary.unassigned})</option>
                  <option value="Assigned">Assigned ({summary.assigned})</option>
                  <option value="In Transit">In Transit ({summary.inTransit})</option>
                  <option value="Out for Delivery">Out for Delivery ({summary.outForDelivery})</option>
                  <option value="Delivered">Delivered ({summary.delivered})</option>
                </select>
              </div>

              {/* Client Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Client Account
                </label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Clients ({uniqueClients.length})</option>
                  {uniqueClients.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Area Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Delivery Area
                </label>
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Delivery Areas</option>
                  <option value="NCR">NCR / Metro Manila</option>
                  <option value="South Luzon">South Luzon</option>
                  <option value="North Luzon">North Luzon</option>
                  <option value="Visayas">Visayas</option>
                  <option value="Mindanao">Mindanao</option>
                </select>
              </div>

              {/* Driver Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assigned Driver
                </label>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Assigned & Unassigned</option>
                  <option value="Unassigned">-- Unassigned Only --</option>
                  {uniqueDrivers.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Date Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Delivery Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THE DEDICATED DELIVERY ASSIGNMENT TABLE (Requirement 2 & 3 & 7) */}
          {/* ========================================================================= */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1300px]" id="delivery-assignment-table">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Delivery Date</th>
                  <th className="py-3.5 px-4">Client Name</th>
                  <th className="py-3.5 px-4">Delivery Area</th>
                  <th className="py-3.5 px-4">Destination / Location</th>
                  <th className="py-3.5 px-4">Consignee</th>
                  <th className="py-3.5 px-4 text-center">Qty</th>
                  <th className="py-3.5 px-4">Shipment Mode</th>
                  <th className="py-3.5 px-4">Actual Dispatched</th>
                  <th className="py-3.5 px-4">RDD (SLA)</th>
                  <th className="py-3.5 px-4">Vehicle & Plate</th>
                  <th className="py-3.5 px-4">Delivery Status</th>
                  <th className="py-3.5 px-4">Assigned Driver</th>
                  <th className="py-3.5 px-4">Assigned Helper</th>
                  <th className="py-3.5 px-4 text-center">Assignment</th>
                  <th className="py-3.5 px-4 text-center sticky right-0 bg-slate-100 shadow-xs">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-500">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <p className="font-semibold text-slate-700 text-sm">
                        No delivery records found matching your filters
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try resetting filters or adjusting your search keywords.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-3 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((item) => {
                    const isUnassigned = !item.isAssigned || item.assignmentStatus === 'Unassigned';

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-blue-50/40 transition-colors ${
                          isUnassigned ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {/* 1. DELIVERY DATE */}
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.plannedDeliveryDate || item.actualDispatchDate || '—'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            POD: {item.podNumber}
                          </div>
                        </td>

                        {/* 2. CLIENT NAME (HIGH VISIBILITY) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-bold text-blue-950 text-sm tracking-tight truncate max-w-[160px]">
                              {item.client}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[160px]">
                            Ref: {item.referenceNumber || item.podNumber}
                          </div>
                        </td>

                        {/* 3. DELIVERY AREA (HIGH VISIBILITY) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 shadow-xs">
                            <MapPin className="w-3 h-3 text-amber-700" />
                            {item.area}
                          </span>
                        </td>

                        {/* 4. DESTINATION / DELIVERY LOCATION (HIGH VISIBILITY) */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[180px]">
                            {item.destination}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            Consignee delivery destination
                          </div>
                        </td>

                        {/* 5. CONSIGNEE */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 truncate max-w-[160px]">
                            {item.consignee}
                          </div>
                        </td>

                        {/* 6. QUANTITY */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="font-bold text-slate-900 font-mono">
                            {item.quantity}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase">
                            {item.unit}
                          </div>
                        </td>

                        {/* 7. MODE OF SHIPMENT */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {item.modeOfShipment}
                          </span>
                        </td>

                        {/* 8. ACTUAL DISPATCHED DATE */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {item.actualDispatchDate || 'Pending dispatch'}
                        </td>

                        {/* 9. RDD (REQUEST DELIVERY DATE / SLA) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.rdd}
                          </span>
                        </td>

                        {/* 10. VEHICLE / TRUCK & PLATE NUMBER */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-blue-800">
                            {item.plateNumber || 'TBD'}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {item.vehicleType}
                          </div>
                        </td>

                        {/* 11. CURRENT DELIVERY STATUS */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.deliveryStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.deliveryStatus === 'In Transit'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : item.deliveryStatus === 'Out for Delivery'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : item.deliveryStatus === 'Assigned'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {item.deliveryStatus}
                          </span>
                        </td>

                        {/* 12. ASSIGNED DRIVER */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.driverName ? (
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{item.driverName}</span>
                              </div>
                              {item.driverId && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  ID: {item.driverId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              UNASSIGNED
                            </span>
                          )}
                        </td>

                        {/* 13. ASSIGNED HELPER */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.helperName ? (
                            <div className="font-medium text-slate-800 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{item.helperName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No helper</span>
                          )}
                        </td>

                        {/* 14. ASSIGNMENT STATUS */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            !isUnassigned
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {item.assignmentStatus}
                          </span>
                        </td>

                        {/* 15. ACTION BUTTON (Requirement 3 & 7) */}
                        <td className="py-3.5 px-4 text-center sticky right-0 bg-white/95 backdrop-blur-xs shadow-xs">
                          {isUnassigned ? (
                            <button
                              onClick={() => handleOpenAssign(item)}
                              disabled={!canPerformAssignment}
                              title={canPerformAssignment ? "Assign driver & helper to this delivery" : "Only Driver Head can assign drivers"}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs transition-all flex items-center gap-1.5 mx-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>ASSIGN DRIVER</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenAssign(item)}
                              disabled={!canPerformAssignment}
                              title={canPerformAssignment ? "View or modify driver assignment" : "View assignment details"}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 transition-all flex items-center gap-1.5 mx-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>VIEW / EDIT ASSIGNMENT</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FLEET DRIVERS ROSTER TAB */}
      {/* ========================================================================= */}
      {activeTab === 'DRIVERS_ROSTER' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="drivers-roster-tab">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h2 className="text-base font-bold text-slate-900">OFII Dedicated Drivers Fleet Directory</h2>
              <p className="text-xs text-slate-500">
                Driver account profiles, assigned default vehicles, contact numbers, and real-time operational status
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Roster: <strong className="text-slate-900">{OFII_DRIVERS_ROSTER.length}</strong> Drivers
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {OFII_DRIVERS_ROSTER.map((driver) => {
              const activeCount = deliveryList.filter(
                d => d.driverName.toLowerCase() === driver.name.toLowerCase() && d.deliveryStatus !== 'Delivered'
              ).length;
              
              return (
                <div key={driver.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                        {driver.id}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1.5">{driver.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {driver.contactNumber}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      driver.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : driver.status === 'On Delivery'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {driver.status}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Default Truck:</span>
                      <span className="font-semibold text-slate-800">{driver.vehicleType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Plate Number:</span>
                      <span className="font-mono font-bold text-blue-700">{driver.defaultPlate}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Assigned Deliveries:</span>
                      <span className="font-bold text-slate-900 bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                        {activeCount} active load{activeCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. HELPERS ROSTER TAB */}
      {/* ========================================================================= */}
      {activeTab === 'HELPERS_ROSTER' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="helpers-roster-tab">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h2 className="text-base font-bold text-slate-900">OFII Cargo Assistants & Helper Crew Directory</h2>
              <p className="text-xs text-slate-500">
                Helpers available for truck loading, cargo securing, and consignee delivery assistance
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Helpers: <strong className="text-slate-900">{OFII_HELPERS_ROSTER.length}</strong> Crew Members
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {OFII_HELPERS_ROSTER.map((helper) => {
              const activeCount = deliveryList.filter(
                d => d.helperName.toLowerCase() === helper.name.toLowerCase() && d.deliveryStatus !== 'Delivered'
              ).length;

              return (
                <div key={helper.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                        {helper.id}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1.5">{helper.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {helper.contactNumber}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      helper.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {helper.status}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Assignment Status:</span>
                      <span className="font-semibold text-slate-800">
                        {activeCount > 0 ? `Assigned (${activeCount} load)` : 'Standby / Available'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DRIVER & HELPER ASSIGNMENT MODAL (Prompt 2J-1B Requirements 3, 4, 5, 6, 12, 15) */}
      {/* ========================================================================= */}
      <AssignDriverModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignModalTarget(null);
        }}
        target={assignModalTarget}
      />
    </div>
  );
};
