'use client';

import { motion } from 'framer-motion';
import {
  Building2,
  CalendarCheck,
  DollarSign,
  BarChart3,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PortfolioMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

interface PortfolioOverviewProps {
  metrics?: PortfolioMetric[];
  compact?: boolean;
}

const defaultMetrics: PortfolioMetric[] = [
  {
    label: 'Total Villas',
    value: 0,
    icon: <Building2 size={22} />,
    color: 'text-emerald-400',
  },
  {
    label: 'Active Bookings',
    value: 0,
    icon: <CalendarCheck size={22} />,
    color: 'text-blue-400',
  },
  {
    label: 'Aggregate Revenue',
    value: '$0',
    change: 0,
    icon: <DollarSign size={22} />,
    color: 'text-heritage-gold',
  },
  {
    label: 'Occupancy Rate',
    value: '0%',
    change: 0,
    icon: <BarChart3 size={22} />,
    color: 'text-purple-400',
  },
  {
    label: 'Active Employees',
    value: 0,
    icon: <Users size={22} />,
    color: 'text-cyan-400',
  },
  {
    label: 'Unresolved Issues',
    value: 0,
    icon: <AlertTriangle size={22} />,
    color: 'text-red-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as const } },
};

export default function PortfolioOverview({
  metrics = defaultMetrics,
  compact = false,
}: PortfolioOverviewProps) {
  return (
    <section aria-label="Portfolio overview metrics">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={cn(
          'grid gap-4',
          compact
            ? 'grid-cols-2 gap-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
        )}
      >
        {metrics.map((metric) => (
          <motion.div
            key={metric.label}
            variants={cardVariants}
            className={cn(
              'relative overflow-hidden rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 backdrop-blur-sm p-4',
              compact ? 'p-3' : 'p-5'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-white/40 font-medium tracking-wide uppercase">
                  {metric.label}
                </p>
                <p
                  className={cn(
                    'font-serif font-bold text-white',
                    compact ? 'text-lg' : 'text-2xl'
                  )}
                >
                  {metric.value}
                </p>
                {metric.change !== undefined && (
                  <p
                    className={cn(
                      'text-xs font-medium',
                      metric.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {metric.change >= 0 ? '+' : ''}
                    {metric.change}% from last month
                  </p>
                )}
              </div>
              <div
                className={cn(
                  'p-2 rounded-lg bg-white/5',
                  metric.color
                )}
              >
                {metric.icon}
              </div>
            </div>
            {/* Decorative gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-heritage-gold/20 to-transparent" />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
