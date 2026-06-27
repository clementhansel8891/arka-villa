'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  FileText,
  Loader2,
} from 'lucide-react';
import { FINANCIAL_SUMMARY } from './mockData';

interface DateRange {
  start: string;
  end: string;
}

interface FinancialReportData {
  grossRevenue: number;
  agencyFees: number;
  operationalExpenses: number;
  maintenanceExpenses: number;
  netIncome: number;
  currency: string;
  period: string;
  monthlyBreakdown: {
    month: string;
    grossRevenue: number;
    agencyFees: number;
    expenses: number;
    netIncome: number;
  }[];
}

interface FinancialReportsProps {
  villaId: string;
  onError?: (error: string) => void;
}

function getCurrentMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function generateReportData(villaId: string): FinancialReportData | null {
  const summaryData = FINANCIAL_SUMMARY[villaId];
  if (!summaryData) return null;

  const agencyFeeRate = 0.15;
  const grossRevenue = summaryData.mtdRevenue;
  const agencyFees = Math.round(grossRevenue * agencyFeeRate * 100) / 100;
  const maintenanceExpense = summaryData.expenseBreakdown.find(
    (e) => e.category === 'Maintenance'
  );
  const maintenanceExpenses = maintenanceExpense?.amount ?? 0;
  const operationalExpenses = summaryData.mtdExpenses - maintenanceExpenses;
  const netIncome = grossRevenue - agencyFees - summaryData.mtdExpenses;

  const monthlyBreakdown = summaryData.netIncomeTrend.map((m) => ({
    month: m.month,
    grossRevenue: m.revenue,
    agencyFees: Math.round(m.revenue * agencyFeeRate * 100) / 100,
    expenses: m.expenses,
    netIncome: m.revenue - Math.round(m.revenue * agencyFeeRate * 100) / 100 - m.expenses,
  }));

  return {
    grossRevenue,
    agencyFees,
    operationalExpenses,
    maintenanceExpenses,
    netIncome,
    currency: 'USD',
    period: 'Current Month',
    monthlyBreakdown,
  };
}

export default function FinancialReports({ villaId, onError }: FinancialReportsProps) {
  const [data, setData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getCurrentMonthRange);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfType, setPdfType] = useState<'monthly' | 'annual' | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const result = generateReportData(villaId);
      if (!result) throw new Error('Financial report data not found');
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load financial reports';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [villaId, onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyRange = () => {
    loadData();
  };

  const handleDownloadPdf = async (type: 'monthly' | 'annual') => {
    setPdfGenerating(true);
    setPdfType(type);
    try {
      // Simulate PDF generation within 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // In production, this would call an API endpoint to generate the PDF
      const blob = new Blob(
        [`Financial Statement (${type}) - Villa: ${villaId}\nGenerated: ${new Date().toISOString()}\n\nGross Revenue: $${data?.grossRevenue?.toLocaleString()}\nAgency Fees: $${data?.agencyFees?.toLocaleString()}\nOperational Expenses: $${data?.operationalExpenses?.toLocaleString()}\nMaintenance Expenses: $${data?.maintenanceExpenses?.toLocaleString()}\nNet Income: $${data?.netIncome?.toLocaleString()}`],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial-statement-${type}-${villaId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setPdfGenerating(false);
      setPdfType(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-48 bg-white/10 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded" />
          ))}
        </div>
        <div className="h-48 bg-white/5 rounded" />
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
              <p className="text-white text-sm font-medium">Financial Reports Unavailable</p>
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

  const isPositiveIncome = data.netIncome >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
            <DollarSign size={16} className="text-heritage-gold" />
          </div>
          <div>
            <h2 className="text-white font-serif text-lg">Financial Reports</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">
              {data.period}
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-white/2 border border-white/5">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-heritage-gold" />
          <span className="text-white/40 text-xs uppercase tracking-widest">Date Range</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-xs px-3 py-1.5 focus:border-heritage-gold/50 focus:outline-none"
          />
          <span className="text-white/30 text-xs">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-xs px-3 py-1.5 focus:border-heritage-gold/50 focus:outline-none"
          />
          <button
            onClick={handleApplyRange}
            className="px-3 py-1.5 text-xs text-heritage-gold border border-heritage-gold/30 hover:bg-heritage-gold/10 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/3 border border-white/5 p-4"
        >
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Gross Revenue</p>
          <p className="text-emerald-400 font-serif text-lg">${data.grossRevenue.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/3 border border-white/5 p-4"
        >
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Agency Fees</p>
          <p className="text-orange-400 font-serif text-lg">${data.agencyFees.toLocaleString()}</p>
          <p className="text-white/25 text-[10px] mt-0.5">15% commission</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/3 border border-white/5 p-4"
        >
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Operational</p>
          <p className="text-red-400 font-serif text-lg">${data.operationalExpenses.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/3 border border-white/5 p-4"
        >
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Maintenance</p>
          <p className="text-amber-400 font-serif text-lg">${data.maintenanceExpenses.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/3 border border-white/5 p-4"
        >
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Net Income</p>
          <div className="flex items-center gap-2">
            {isPositiveIncome ? (
              <TrendingUp size={14} className="text-emerald-400" />
            ) : (
              <TrendingDown size={14} className="text-red-400" />
            )}
            <p className={`font-serif text-lg ${isPositiveIncome ? 'text-emerald-400' : 'text-red-400'}`}>
              ${Math.abs(data.netIncome).toLocaleString()}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="mb-6">
        <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">Monthly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-white/25 text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="text-left pb-3 font-normal">Month</th>
                <th className="text-right pb-3 font-normal">Revenue</th>
                <th className="text-right pb-3 font-normal hidden sm:table-cell">Agency Fees</th>
                <th className="text-right pb-3 font-normal hidden md:table-cell">Expenses</th>
                <th className="text-right pb-3 font-normal">Net Income</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.monthlyBreakdown.map((month, i) => (
                <motion.tr
                  key={month.month}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.03 }}
                  className="hover:bg-white/3 transition-colors"
                >
                  <td className="py-2.5 text-white text-xs">{month.month}</td>
                  <td className="py-2.5 text-emerald-400 text-xs text-right font-mono">
                    ${month.grossRevenue.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-orange-400 text-xs text-right font-mono hidden sm:table-cell">
                    ${month.agencyFees.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-red-400 text-xs text-right font-mono hidden md:table-cell">
                    ${month.expenses.toLocaleString()}
                  </td>
                  <td className={`py-2.5 text-xs text-right font-mono ${month.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${Math.abs(month.netIncome).toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Download Section */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <FileText size={14} className="text-heritage-gold" />
          <h3 className="text-white/60 text-xs uppercase tracking-widest">Download Statements</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleDownloadPdf('monthly')}
            disabled={pdfGenerating}
            className="flex items-center gap-2 px-4 py-2 text-xs text-heritage-gold border border-heritage-gold/30 hover:bg-heritage-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfGenerating && pdfType === 'monthly' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            Monthly Statement (PDF)
          </button>
          <button
            onClick={() => handleDownloadPdf('annual')}
            disabled={pdfGenerating}
            className="flex items-center gap-2 px-4 py-2 text-xs text-white/60 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfGenerating && pdfType === 'annual' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            Annual Statement (PDF)
          </button>
        </div>
      </div>
    </motion.div>
  );
}
