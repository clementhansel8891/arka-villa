'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Users,
  Wrench,
  MessageSquare,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  CheckCircle,
  UserPlus,
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: 'staff_assignment' | 'maintenance' | 'guest_communication' | 'booking' | 'task_completion';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
}

interface ActivityTimelineProps {
  villaId: string;
  onError?: (error: string) => void;
}

const DEFAULT_DAYS = 90;
const LOAD_MORE_DAYS = 90;

function getActivityIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'staff_assignment':
      return UserPlus;
    case 'maintenance':
      return Wrench;
    case 'guest_communication':
      return MessageSquare;
    case 'booking':
      return Calendar;
    case 'task_completion':
      return CheckCircle;
  }
}

function getActivityColor(type: ActivityEvent['type']) {
  switch (type) {
    case 'staff_assignment':
      return 'text-blue-400 bg-blue-400/10';
    case 'maintenance':
      return 'text-amber-400 bg-amber-400/10';
    case 'guest_communication':
      return 'text-purple-400 bg-purple-400/10';
    case 'booking':
      return 'text-emerald-400 bg-emerald-400/10';
    case 'task_completion':
      return 'text-heritage-gold bg-heritage-gold/10';
  }
}

function generateMockActivities(villaId: string, daysBack: number): ActivityEvent[] {
  const activities: ActivityEvent[] = [];
  const now = new Date();
  const baseActivities: Omit<ActivityEvent, 'id' | 'timestamp'>[] = [
    { type: 'booking', title: 'New booking confirmed', description: 'Royal Heritage Suite booked by James Whitmore', actor: 'System' },
    { type: 'staff_assignment', title: 'Staff assigned to villa', description: 'Ketut Sastra assigned as Head Butler', actor: 'Agency Admin' },
    { type: 'maintenance', title: 'Maintenance completed', description: 'Pool filter replacement finished', actor: 'Maintenance Team' },
    { type: 'guest_communication', title: 'Guest message received', description: 'Pre-arrival request from Yuki Tanaka', actor: 'Guest' },
    { type: 'task_completion', title: 'Housekeeping completed', description: 'Suite deep cleaning for checkout', actor: 'Made Ariani' },
    { type: 'maintenance', title: 'Maintenance scheduled', description: 'Quarterly AC service scheduled', actor: 'Agency Admin' },
    { type: 'booking', title: 'Booking cancelled', description: 'Cancellation for Garden Bungalow', actor: 'System' },
    { type: 'staff_assignment', title: 'Shift schedule updated', description: 'Weekly schedule published for all staff', actor: 'Agency Admin' },
    { type: 'task_completion', title: 'Inspection completed', description: 'Monthly property inspection by manager', actor: 'Putu Dharma' },
    { type: 'guest_communication', title: 'Review received', description: '5-star review from Maria Santos', actor: 'Guest' },
    { type: 'maintenance', title: 'Urgent repair reported', description: 'Water heater malfunction in Suite 2', actor: 'Ketut Sastra' },
    { type: 'booking', title: 'Direct booking received', description: 'Sacred Lotus Pavilion — 7 nights', actor: 'Website' },
  ];

  // Generate events spread across the time period
  const totalEvents = Math.min(daysBack * 2, 60);
  for (let i = 0; i < totalEvents; i++) {
    const daysAgo = Math.floor(Math.random() * daysBack);
    const hoursAgo = Math.floor(Math.random() * 24);
    const date = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
    const baseActivity = baseActivities[i % baseActivities.length];

    activities.push({
      ...baseActivity,
      id: `${villaId}-ACT-${i.toString().padStart(4, '0')}`,
      timestamp: date.toISOString(),
    });
  }

  // Sort by most recent first
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ActivityTimeline({ villaId, onError }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysLoaded, setDaysLoaded] = useState(DEFAULT_DAYS);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = generateMockActivities(villaId, DEFAULT_DAYS);
      setActivities(result);
      setDaysLoaded(DEFAULT_DAYS);
      setHasMore(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activity timeline';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [villaId, onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const newDays = daysLoaded + LOAD_MORE_DAYS;
      const moreActivities = generateMockActivities(villaId, newDays);
      setActivities(moreActivities);
      setDaysLoaded(newDays);
      // Limit to 1 year of data
      if (newDays >= 365) {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-44 bg-white/10 rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-white/5 rounded mb-2" />
                <div className="h-3 w-32 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/3 border border-red-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400" />
            <div>
              <p className="text-white text-sm font-medium">Activity Timeline Unavailable</p>
              <p className="text-white/40 text-xs mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-heritage-gold border border-heritage-gold/30 hover:bg-heritage-gold/10 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
            <Clock size={16} className="text-heritage-gold" />
          </div>
          <div>
            <h2 className="text-white font-serif text-lg">Activity Timeline</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">
              Last {daysLoaded} days · {activities.length} events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <Users size={12} />
          Staff, maintenance, guests
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />

        <div className="space-y-4">
          {activities.slice(0, 20).map((activity, i) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.03 }}
                className="relative flex items-start gap-4 pl-1"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${colorClass}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0 pb-4 border-b border-white/5 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm">{activity.title}</p>
                      <p className="text-white/40 text-xs mt-0.5 truncate">{activity.description}</p>
                    </div>
                    <span className="text-white/25 text-[10px] whitespace-nowrap flex-shrink-0">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-white/20 text-[10px] mt-1">{activity.actor}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs text-heritage-gold border border-heritage-gold/30 hover:bg-heritage-gold/10 transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <ChevronDown size={12} />
            )}
            {loadingMore ? 'Loading...' : 'Load Earlier Activities'}
          </button>
          <p className="text-white/20 text-[10px] mt-2">
            Currently showing {daysLoaded} days of activity
          </p>
        </div>
      )}

      {!hasMore && (
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <p className="text-white/20 text-[10px]">All available activity loaded</p>
        </div>
      )}
    </motion.div>
  );
}
