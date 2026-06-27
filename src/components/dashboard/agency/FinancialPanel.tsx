'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DateRangeFilter, { type DateRange } from './DateRangeFilter';

export type RevenueSource = 'direct' | 'booking.com' | 'airbnb' | 'expedia' | 'other';

export interface VillaFinancial {
  villaId: string;
  villaName: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  currency: string;
  revenueBySource: Record<RevenueSource, number>;
}

interface FinancialPanelProps {
  villaFinancials?: VillaFinancial[];
}

const sourceColors: Record<RevenueSource, string> = {
  direct: 'bg-heritage-gold',
  'booking.com': 'bg-blue-400',
  airbnb: 'bg-pink-400',
  expedia: 'bg-amber-400',
  other: 'bg-white/20',
};

const sourceLabels: Record<RevenueSource, string> = {
  direct: 'Direct',
  'booking.com': 'Booking.com',
  airbnb: 'Airbnb',
  expedia: 'Expedia',
  other: 'Other',
};

const defaultFinancials: VillaFinancial[] = [];

function getCurrentMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function FinancialPanel({ villaFinancials = defaultFinancials }: FinancialPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getCurrentMonthRange());

  const totals = useMemo(() => {
    const totalRevenue = villaFinancials.reduce((acc, v) => acc + v.revenue, 0);
    const totalExpenses = villaFinancials.reduce((acc, v) => acc + v.expenses, 0);
    const totalNetIncome = villaFinancials.reduce((acc, v) => acc + v.netIncome, 0);
    const revenueBySource: Record<RevenueSource, number> = {
      direct: 0,
      'booking.com': 0,
      airbnb: 0,
      expedia: 0,
      other: 0,
    };
    villaFinancials.forEach((v) => {
      Object.entries(v.revenueBySource).forEach(([source, amount]) => {
        revenueBySource[source as RevenueSource] += amount;
      });
    });
    return { totalRevenue, totalExpenses, totalNetIncome, revenueBySource };
  }, [villaFinancials]);

  const currency = villaFinancials[0]?.currency ?? 'USD';

  function formatAmount(amount: number): string {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <section aria-label="Cross-villa financial management" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-heritage-gold/10 text-heritage-gold">
            <DollarSign size={22} />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white">Financial Overview</h2>
            <p className="text-xs text-white/40">
              Revenue and expense comparisons across villas
            </p>
          </div>
        </div>
      </div>

      {/* Date range filter (up to 24 months for financial) */}
      <DateRangeFilter
        defaultRange={dateRange}
        maxMonths={24}
        onChange={setDateRange}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <p className="text-xs text-white/40 uppercase tracking-wide">Total Revenue</p>
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-400">
            {currency} {formatAmount(totals.totalRevenue)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-red-400" />
            <p className="text-xs text-white/40 uppercase tracking-wide">Total Expenses</p>
          </div>
          <p className="text-2xl font-serif font-bold text-red-400">
            {currency} {formatAmount(totals.totalExpenses)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-heritage-gold" />
            <p className="text-xs text-white/40 uppercase tracking-wide">Net Income</p>
          </div>
          <p className={cn(
            'text-2xl font-serif font-bold',
            totals.totalNetIncome >= 0 ? 'text-heritage-gold' : 'text-red-400'
          )}>
            {currency} {formatAmount(totals.totalNetIncome)}
          </p>
        </motion.div>
      </div>

      {/* Revenue breakdown by source (chart representation) */}
      <div className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-white/40" />
          <h3 className="text-sm font-medium text-white/70">Revenue Breakdown by Source</h3>
        </div>
        <div className="space-y-3">
          {(Object.entries(totals.revenueBySource) as [RevenueSource, number][])
            .filter(([, amount]) => amount > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([source, amount]) => {
              const pct =
                totals.totalRevenue > 0
                  ? Math.round((amount / totals.totalRevenue) * 100)
                  : 0;
              return (
                <div key={source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">{sourceLabels[source]}</span>
                    <span className="text-white/40">
                      {currency} {formatAmount(amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div
                      className={cn('h-full rounded-full transition-all', sourceColors[source])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          {totals.totalRevenue === 0 && (
            <p className="text-sm text-white/30 text-center py-4">
              No revenue data for the selected period.
            </p>
          )}
        </div>
      </div>

      {/* Per-villa comparison table */}
      <div className="rounded-xl border border-heritage-gold/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-heritage-charcoal/80 border-b border-heritage-gold/10">
          <BarChart3 size={16} className="text-white/40" />
          <h3 className="text-sm font-medium text-white/70">Villa Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" aria-label="Villa financial comparison">
            <thead className="bg-heritage-charcoal/60 border-b border-heritage-gold/5">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                  Villa
                </th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">
                  Revenue
                </th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">
                  Expenses
                </th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">
                  Net Income
                </th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-heritage-gold/5">
              {villaFinancials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-white/30">
                      <DollarSign size={32} />
                      <p className="text-sm">No financial data available for the selected period.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                villaFinancials.map((villa) => {
                  const margin =
                    villa.revenue > 0
                      ? Math.round((villa.netIncome / villa.revenue) * 100)
                      : 0;
                  return (
                    <tr
                      key={villa.villaId}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {villa.villaName}
                      </td>
                      <td className="px-4 py-3 text-emerald-400 text-right">
                        {villa.currency} {formatAmount(villa.revenue)}
                      </td>
                      <td className="px-4 py-3 text-red-400 text-right">
                        {villa.currency} {formatAmount(villa.expenses)}
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-right font-medium',
                        villa.netIncome >= 0 ? 'text-heritage-gold' : 'text-red-400'
                      )}>
                        {villa.currency} {formatAmount(villa.netIncome)}
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-right text-xs',
                        margin >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {margin}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
