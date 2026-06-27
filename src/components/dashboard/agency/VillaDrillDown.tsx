'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  CalendarCheck,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VillaSummary {
  id: string;
  name: string;
  location: string;
  occupancyRate: number;
  activeBookings: number;
  monthlyRevenue: number;
  taskCompletionRate: number;
  openTickets: number;
}

export interface VillaDetail extends VillaSummary {
  upcomingBookings: number;
  totalEmployees: number;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

interface VillaDrillDownProps {
  villas?: VillaSummary[];
  onSelectVilla?: (villaId: string) => Promise<VillaDetail | null>;
}

const defaultVillas: VillaSummary[] = [];

export default function VillaDrillDown({
  villas = defaultVillas,
  onSelectVilla,
}: VillaDrillDownProps) {
  const [selectedVilla, setSelectedVilla] = useState<VillaDetail | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelectVilla(villaId: string) {
    startTransition(async () => {
      if (onSelectVilla) {
        const detail = await onSelectVilla(villaId);
        setSelectedVilla(detail);
      }
    });
  }

  function handleBack() {
    setSelectedVilla(null);
  }

  return (
    <section aria-label="Villa drill-down" className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-serif text-white font-semibold">
          {selectedVilla ? selectedVilla.name : 'Managed Villas'}
        </h2>
        {selectedVilla && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-heritage-gold hover:text-heritage-gold/80 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to portfolio
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedVilla ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Villa detail metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <DetailCard
                icon={<CalendarCheck size={18} />}
                label="Active Bookings"
                value={String(selectedVilla.activeBookings)}
              />
              <DetailCard
                icon={<DollarSign size={18} />}
                label="Monthly Revenue"
                value={`$${selectedVilla.monthlyRevenue.toLocaleString()}`}
              />
              <DetailCard
                icon={<CheckCircle size={18} />}
                label="Task Completion"
                value={`${selectedVilla.taskCompletionRate}%`}
              />
              <DetailCard
                icon={<AlertTriangle size={18} />}
                label="Open Tickets"
                value={String(selectedVilla.openTickets)}
              />
            </div>

            {/* Recent activity */}
            {selectedVilla.recentActivity.length > 0 && (
              <div className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-4">
                <h3 className="text-sm font-medium text-white/60 mb-3 uppercase tracking-wide">
                  Recent Activity
                </h3>
                <ul className="space-y-2">
                  {selectedVilla.recentActivity.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <span className="text-sm text-white/80">
                        {activity.message}
                      </span>
                      <span className="text-xs text-white/30">
                        {activity.timestamp}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {villas.length === 0 ? (
              <div className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-8 text-center">
                <Building2 size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/40 text-sm">
                  No villas registered yet. Add your first villa to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {villas.map((villa) => (
                  <button
                    key={villa.id}
                    onClick={() => handleSelectVilla(villa.id)}
                    disabled={isPending}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 hover:bg-heritage-charcoal/80 hover:border-heritage-gold/20 transition-all duration-200 group',
                      isPending && 'opacity-60 cursor-wait'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-heritage-gold/10 flex items-center justify-center text-heritage-gold">
                        <Building2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">
                          {villa.name}
                        </p>
                        <p className="text-xs text-white/40">{villa.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:block text-right">
                        <p className="text-xs text-white/40">Occupancy</p>
                        <p className="text-sm font-medium text-white">
                          {villa.occupancyRate}%
                        </p>
                      </div>
                      <div className="hidden md:block text-right">
                        <p className="text-xs text-white/40">Revenue</p>
                        <p className="text-sm font-medium text-heritage-gold">
                          ${villa.monthlyRevenue.toLocaleString()}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-white/30 group-hover:text-heritage-gold transition-colors"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-heritage-gold/10 bg-heritage-charcoal/40 p-3">
      <div className="flex items-center gap-2 mb-1 text-white/40">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-serif font-bold text-white">{value}</p>
    </div>
  );
}
