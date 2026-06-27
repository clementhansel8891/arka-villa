'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  CalendarX,
  Wrench,
  MessageSquare,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'booking' | 'maintenance' | 'escalation' | 'message';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  villaName: string;
  timestamp: string;
  read: boolean;
}

interface AlertsCenterProps {
  alerts?: Alert[];
  pollingIntervalMs?: number;
  onFetchAlerts?: () => Promise<Alert[]>;
  onDismiss?: (alertId: string) => void;
  compact?: boolean;
}

const severityOrder: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const severityStyles: Record<AlertSeverity, string> = {
  critical: 'border-red-500/40 bg-red-500/5',
  high: 'border-amber-500/40 bg-amber-500/5',
  medium: 'border-blue-500/30 bg-blue-500/5',
  low: 'border-white/10 bg-white/5',
};

const typeIcons: Record<AlertType, React.ReactNode> = {
  booking: <CalendarX size={16} />,
  maintenance: <Wrench size={16} />,
  escalation: <AlertTriangle size={16} />,
  message: <MessageSquare size={16} />,
};

export default function AlertsCenter({
  alerts: initialAlerts = [],
  pollingIntervalMs = 30000,
  onFetchAlerts,
  onDismiss,
  compact = false,
}: AlertsCenterProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [expanded, setExpanded] = useState(!compact);
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');

  // Real-time polling for alerts (within 30-second requirement)
  const fetchAlerts = useCallback(async () => {
    if (onFetchAlerts) {
      try {
        const newAlerts = await onFetchAlerts();
        setAlerts(newAlerts);
      } catch {
        // Silently handle fetch errors — alerts will retry on next interval
      }
    }
  }, [onFetchAlerts]);

  useEffect(() => {
    if (!onFetchAlerts) return;

    // Initial fetch
    fetchAlerts();

    // Poll every pollingIntervalMs (default 30s for the 30-second SLA)
    const interval = setInterval(fetchAlerts, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [fetchAlerts, pollingIntervalMs, onFetchAlerts]);

  // Update local state when initial alerts prop changes
  useEffect(() => {
    if (initialAlerts.length > 0) {
      setAlerts(initialAlerts);
    }
  }, [initialAlerts]);

  const sortedAlerts = [...alerts]
    .filter((a) => filter === 'all' || a.severity === filter)
    .sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const unreadCount = alerts.filter((a) => !a.read).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  function handleDismiss(alertId: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    onDismiss?.(alertId);
  }

  return (
    <section
      aria-label="Alerts center"
      className={cn(
        'rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 backdrop-blur-sm overflow-hidden',
        compact ? 'mt-4' : 'mt-6'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={20} className="text-heritage-gold" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="text-left">
            <h2 className="text-sm font-medium text-white">Alerts Center</h2>
            {criticalCount > 0 && (
              <p className="text-xs text-red-400">
                {criticalCount} critical alert{criticalCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'text-white/40 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-4 pb-3 border-b border-white/5">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors capitalize',
                    filter === f
                      ? 'bg-heritage-gold/10 text-heritage-gold'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Alert list */}
            <div className={cn('overflow-y-auto', compact ? 'max-h-60' : 'max-h-80')}>
              {sortedAlerts.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell size={28} className="mx-auto text-white/15 mb-2" />
                  <p className="text-sm text-white/30">No alerts to display</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {sortedAlerts.map((alert) => (
                    <motion.li
                      key={alert.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      className={cn(
                        'flex items-start gap-3 p-3 mx-2 my-1 rounded-lg border transition-colors',
                        severityStyles[alert.severity],
                        !alert.read && 'ring-1 ring-inset ring-white/5'
                      )}
                    >
                      <div className="shrink-0 mt-0.5 text-white/50">
                        {typeIcons[alert.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {alert.title}
                          </p>
                          <span
                            className={cn(
                              'shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded',
                              alert.severity === 'critical' &&
                                'bg-red-500/20 text-red-400',
                              alert.severity === 'high' &&
                                'bg-amber-500/20 text-amber-400',
                              alert.severity === 'medium' &&
                                'bg-blue-500/20 text-blue-400',
                              alert.severity === 'low' &&
                                'bg-white/10 text-white/50'
                            )}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5 truncate">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-heritage-gold/60">
                            {alert.villaName}
                          </span>
                          <span className="text-[10px] text-white/20">•</span>
                          <span className="text-[10px] text-white/30">
                            {alert.timestamp}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="shrink-0 text-white/20 hover:text-white/60 transition-colors"
                        aria-label={`Dismiss alert: ${alert.title}`}
                      >
                        <X size={14} />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
