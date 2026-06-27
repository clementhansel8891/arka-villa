'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  BarChart2,
} from 'lucide-react';
import type { FinancialSummaryData } from './types';
import { FINANCIAL_SUMMARY } from './mockData';

interface FinancialSummaryProps {
  villaId: string;
  onError?: (error: string) => void;
}

export default function FinancialSummary({ villaId, onError }: FinancialSummaryProps) {
  const [data, setData] = useState<FinancialSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [villaId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const result = FINANCIAL_SUMMARY[villaId];
      if (!result) throw new Error('Financial data not found');
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load financial data';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-44 bg-white/10 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded" />
          ))}
        </div>
        <div className="h-40 bg-white/5 rounded" />
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
              <p className="text-white text-sm font-medium">Financial Summary Unavailable</p>
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

  if (!data) return null;

  const maxNetIncome = Math.max(...data.netIncomeTrend.map((m) => m.netIncome));
  const isPositiveChange = data.periodComparison.changePercent >= 0;

  const financialKpis = [
    {
      label: 'MTD Revenue',
      value: `$${(data.mtdRevenue / 1000).toFixed(0)}k`,
      sub: 'month to date',
    },
    {
      label: 'YTD Revenue',
      value: `$${(data.ytdRevenue / 1000).toFixed(0)}k`,
      sub: 'year to date',
    },
    {
      label: 'MTD Expenses',
      value: `$${(data.mtdExpenses / 1000).toFixed(1)}k`,
      sub: 'month to date',
    },
    {
      label: 'Net Income',
      value: `$${((data.mtdRevenue - data.mtdExpenses) / 1000).toFixed(1)}k`,
      sub: isPositiveChange ? `+${data.periodComparison.changePercent}%` : `${data.periodComparison.changePercent}%`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
            <DollarSign size={16} className="text-heritage-gold" />
          </div>
          <h2 className="text-white font-serif text-lg">Financial Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          {isPositiveChange ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span className={`text-xs ${isPositiveChange ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositiveChange ? '+' : ''}{data.periodComparison.changePercent}% vs last month
          </span>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {financialKpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
            className="bg-white/3 border border-white/5 p-3"
          >
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-white font-serif text-lg">{kpi.value}</p>
            <p className="text-white/25 text-[10px] mt-0.5">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Net Income Trend Chart (12 months) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-heritage-gold" />
            <h3 className="text-white/60 text-xs uppercase tracking-widest">
              Net Income Trend (12 months)
            </h3>
          </div>
        </div>
        <div className="flex items-end gap-2 h-32">
          {data.netIncomeTrend.map((month, i) => {
            const pct = (month.netIncome / maxNetIncome) * 100;
            return (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1.5">
                <motion.div
                  className="w-full bg-heritage-gold/20 relative group cursor-pointer hover:bg-heritage-gold/40 transition-colors"
                  style={{ height: `${pct}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.04, ease: 'easeOut' }}
                  // eslint-disable-next-line react/style-prop-object
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-heritage-charcoal text-white text-[9px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                    ${(month.netIncome / 1000).toFixed(0)}k
                  </div>
                </motion.div>
                <span className="text-white/30 text-[9px]">{month.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div>
        <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">Expense Breakdown</h3>
        <div className="space-y-3">
          {data.expenseBreakdown.map((expense, i) => (
            <motion.div
              key={expense.category}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-white/60 text-xs">{expense.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-[10px]">{expense.percentage}%</span>
                  <span className="text-white text-xs font-mono">${expense.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-heritage-gold/50 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${expense.percentage}%` }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Period Comparison */}
      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-widest">Period Comparison</p>
            <p className="text-white/50 text-xs mt-1">Current vs Previous Month</p>
          </div>
          <div className="text-right">
            <p className="text-white font-serif text-lg">
              ${(data.periodComparison.currentMonth / 1000).toFixed(0)}k
              <span className="text-white/30 text-xs ml-2">
                vs ${(data.periodComparison.previousMonth / 1000).toFixed(0)}k
              </span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
