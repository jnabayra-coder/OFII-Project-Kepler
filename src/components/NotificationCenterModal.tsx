import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  Check, 
  Calendar, 
  User, 
  Building2, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Filter,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { PODNotification, PODNotificationType } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  podNotifications: PODNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onSelectRecord?: (recordId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  podNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectRecord,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | PODNotificationType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = useMemo(
    () => podNotifications.filter((n) => !n.isRead).length,
    [podNotifications]
  );

  const filteredNotifications = useMemo(() => {
    return podNotifications.filter((n) => {
      // 1. Tab / Type filter
      if (filterType === 'UNREAD' && n.isRead) return false;
      if (filterType !== 'ALL' && filterType !== 'UNREAD' && n.type !== filterType) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesClient = n.client?.toLowerCase().includes(q);
        const matchesRef = n.referenceNumber?.toLowerCase().includes(q);
        const matchesPod = n.podNumber?.toLowerCase().includes(q);
        const matchesCoordinator = n.coordinator?.toLowerCase().includes(q);
        const matchesConsignee = n.consignee?.toLowerCase().includes(q);
        const matchesMsg = n.message?.toLowerCase().includes(q);
        return matchesClient || matchesRef || matchesPod || matchesCoordinator || matchesConsignee || matchesMsg;
      }

      return true;
    });
  }, [podNotifications, filterType, searchQuery]);

  if (!isOpen) return null;

  const getTypeBadge = (type: PODNotificationType) => {
    switch (type) {
      case 'POD_DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            Due Soon
          </span>
        );
      case 'POD_OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
            Overdue
          </span>
        );
      case 'POD_RETURNED_LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            Returned Late
          </span>
        );
      case 'POD_RETURNED_ONTIME':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Returned On Time
          </span>
        );
    }
  };

  const getSlaBadge = (sla: string) => {
    if (sla === 'HIT') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">SLA: HIT</span>;
    }
    if (sla === 'MISSED') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">SLA: MISSED</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">SLA: PENDING</span>;
  };

  return (
    <div 
      id="pod-notification-center-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="pod-notification-center-modal"
        className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-200 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  POD Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time operational alerts for POD approaching due dates, overdues, and return performance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                id="btn-mark-all-notifications-read"
                onClick={onMarkAllAsRead}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer border border-white/10"
              >
                <Check className="w-3.5 h-3.5" />
                Mark All Read
              </button>
            )}
            <button
              id="btn-close-notification-center"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              All ({podNotifications.length})
            </button>
            <button
              onClick={() => setFilterType('UNREAD')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'UNREAD'
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilterType('POD_DUE_SOON')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                filterType === 'POD_DUE_SOON'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              🟡 Due Soon
            </button>
            <button
              onClick={() => setFilterType('POD_OVERDUE')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                filterType === 'POD_OVERDUE'
                  ? 'bg-rose-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              🔴 Overdue
            </button>
            <button
              onClick={() => setFilterType('POD_RETURNED_LATE')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                filterType === 'POD_RETURNED_LATE'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              🔴 Late Return
            </button>
            <button
              onClick={() => setFilterType('POD_RETURNED_ONTIME')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                filterType === 'POD_RETURNED_ONTIME'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              🟢 On Time
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client, ref, coordinator..."
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Notification List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Notifications Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {filterType === 'UNREAD' 
                  ? 'Great job! You have no unread POD notifications.' 
                  : 'All POD deadlines are up to date and monitored.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.isRead;
              return (
                <div
                  key={notif.id}
                  id={`notif-card-${notif.id}`}
                  onClick={() => {
                    if (isUnread) onMarkAsRead(notif.id);
                  }}
                  className={`p-4 rounded-lg transition-all border text-left cursor-pointer flex flex-col gap-2 relative ${
                    isUnread
                      ? 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-200 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Top Row: Type Badge + Title + Coordinator + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(notif.type)}
                      <h4 className="text-sm font-bold text-slate-900">
                        {notif.title}
                      </h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread notification" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getSlaBadge(notif.podSla)}
                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notif.id);
                          }}
                          className="text-[11px] font-medium text-blue-700 hover:text-blue-900 underline px-1 cursor-pointer"
                          title="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Message */}
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {notif.message}
                  </p>

                  {/* Operational Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded border border-slate-200/70">
                    <div>
                      <span className="text-slate-400 block font-normal">Client:</span>
                      <strong className="text-slate-800 font-semibold truncate block">
                        {notif.client}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-normal">Project Ref / POD:</span>
                      <span className="font-mono font-medium text-slate-900 block truncate">
                        {notif.referenceNumber || '—'} {notif.podNumber ? `• ${notif.podNumber}` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-normal">Assigned Coordinator:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-900 truncate">
                        <User className="w-3 h-3 text-blue-600 shrink-0" />
                        {notif.coordinator || 'Unassigned'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-normal">POD Due Date:</span>
                      <span className="font-medium text-slate-900 block">
                        {notif.podReturnDueDateFormatted || notif.podReturnDueDate || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Footer: Delivery Date, Return Date & Action Link */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span>Delivered: <strong>{notif.actualDeliveryDate || '—'}</strong></span>
                      {notif.actualPodReturnDate && (
                        <span>Returned: <strong>{notif.actualPodReturnDate}</strong></span>
                      )}
                      <span>Status: <strong className="text-slate-800">{notif.podStatus}</strong></span>
                    </div>

                    {onSelectRecord && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isUnread) onMarkAsRead(notif.id);
                          onSelectRecord(notif.recordId);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 cursor-pointer ml-auto"
                      >
                        <span>View Shipment Record</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong>{filteredNotifications.length}</strong> of <strong>{podNotifications.length}</strong> alerts
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-blue-700 hover:text-blue-900 font-medium underline cursor-pointer"
              >
                Mark all {unreadCount} as read
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
