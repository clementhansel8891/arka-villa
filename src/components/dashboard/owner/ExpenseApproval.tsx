'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';

const DEFAULT_THRESHOLD_USD = 500;

interface ExpenseApprovalRequest {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  requestedBy: string;
  requestedAt: string;
  deadline: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  villaId: string;
}

interface ExpenseApprovalProps {
  villaId: string;
  ownerThreshold?: number | null;
  onError?: (error: string) => void;
}

// Mock expense approval data
function getMockExpenses(villaId: string): ExpenseApprovalRequest[] {
  const baseExpenses: Record<string, ExpenseApprovalRequest[]> = {
    'villa-001': [
      {
        id: 'EXP-001',
        description: 'Pool pump replacement',
        amount: 1200,
        currency: 'USD',
        category: 'Maintenance',
        requestedBy: 'Ketut Sastra',
        requestedAt: '2026-06-01T10:00:00Z',
        deadline: '2026-06-03T10:00:00Z',
        status: 'pending',
        villaId: 'villa-001',
      },
      {
        id: 'EXP-002',
        description: 'Emergency roof repair',
        amount: 3500,
        currency: 'USD',
        category: 'Maintenance',
        requestedBy: 'Nyoman Wijaya',
        requestedAt: '2026-05-28T14:30:00Z',
        deadline: '2026-05-30T14:30:00Z',
        status: 'escalated',
        villaId: 'villa-001',
      },
      {
        id: 'EXP-003',
        description: 'Garden landscaping refresh',
        amount: 800,
        currency: 'USD',
        category: 'Operational',
        requestedBy: 'Made Ariani',
        requestedAt: '2026-06-02T09:00:00Z',
        deadline: '2026-06-04T09:00:00Z',
        status: 'pending',
        villaId: 'villa-001',
      },
      {
        id: 'EXP-004',
        description: 'New coffee machine',
        amount: 650,
        currency: 'USD',
        category: 'Equipment',
        requestedBy: 'Nyoman Wijaya',
        requestedAt: '2026-05-20T11:00:00Z',
        deadline: '2026-05-22T11:00:00Z',
        status: 'approved',
        villaId: 'villa-001',
      },
    ],
    'villa-002': [
      {
        id: 'EXP-101',
        description: 'AC unit service and repair',
        amount: 900,
        currency: 'USD',
        category: 'Maintenance',
        requestedBy: 'Putu Dharma',
        requestedAt: '2026-06-01T08:00:00Z',
        deadline: '2026-06-03T08:00:00Z',
        status: 'pending',
        villaId: 'villa-002',
      },
    ],
    'villa-003': [
      {
        id: 'EXP-201',
        description: 'Infinity pool tile repair',
        amount: 2800,
        currency: 'USD',
        category: 'Maintenance',
        requestedBy: 'Agung Pratama',
        requestedAt: '2026-06-02T07:30:00Z',
        deadline: '2026-06-04T07:30:00Z',
        status: 'pending',
        villaId: 'villa-003',
      },
      {
        id: 'EXP-202',
        description: 'Security camera upgrade',
        amount: 1500,
        currency: 'USD',
        category: 'Equipment',
        requestedBy: 'Agung Pratama',
        requestedAt: '2026-05-30T10:00:00Z',
        deadline: '2026-06-01T10:00:00Z',
        status: 'approved',
        villaId: 'villa-003',
      },
    ],
  };

  return baseExpenses[villaId] ?? [];
}

function getTimeRemaining(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
}

function getStatusStyles(status: ExpenseApprovalRequest['status']) {
  switch (status) {
    case 'pending':
      return 'bg-amber-500/15 text-amber-400';
    case 'approved':
      return 'bg-emerald-500/15 text-emerald-400';
    case 'rejected':
      return 'bg-red-500/15 text-red-400';
    case 'escalated':
      return 'bg-purple-500/15 text-purple-400';
  }
}

export default function ExpenseApproval({ villaId, ownerThreshold, onError }: ExpenseApprovalProps) {
  const [expenses, setExpenses] = useState<ExpenseApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const threshold = ownerThreshold ?? DEFAULT_THRESHOLD_USD;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const result = getMockExpenses(villaId);
      setExpenses(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load expense approvals';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [villaId, onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = (expenseId: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, status: 'approved' as const } : e))
    );
  };

  const handleReject = (expenseId: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, status: 'rejected' as const } : e))
    );
  };

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-52 bg-white/10 rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded" />
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
              <p className="text-white text-sm font-medium">Expense Approvals Unavailable</p>
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

  const pendingExpenses = expenses.filter((e) => e.status === 'pending');
  const otherExpenses = expenses.filter((e) => e.status !== 'pending');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
            <ShieldCheck size={16} className="text-heritage-gold" />
          </div>
          <div>
            <h2 className="text-white font-serif text-lg">Expense Approvals</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">
              Threshold-based workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/3 border border-white/5">
          <DollarSign size={12} className="text-heritage-gold" />
          <span className="text-white/60 text-xs">
            Threshold: <span className="text-heritage-gold font-mono">${threshold}</span>
            {ownerThreshold === null || ownerThreshold === undefined ? (
              <span className="text-white/30 ml-1">(default)</span>
            ) : null}
          </span>
        </div>
      </div>

      {/* Info about 48h timeout */}
      <div className="mb-6 p-3 bg-blue-500/5 border border-blue-500/10 flex items-start gap-2">
        <Clock size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-white/50 text-xs">
          Expenses above your threshold require approval. If no response within{' '}
          <span className="text-blue-400 font-medium">48 hours</span>, the request escalates to
          the Agency Admin for resolution.
        </p>
      </div>

      {/* Pending Approvals */}
      {pendingExpenses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">
            Pending Approval ({pendingExpenses.length})
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {pendingExpenses.map((expense, i) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/3 border border-amber-500/20 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white text-sm font-medium">{expense.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/40 text-xs">{expense.category}</span>
                        <span className="text-white/20">·</span>
                        <span className="text-white/40 text-xs">by {expense.requestedBy}</span>
                      </div>
                    </div>
                    <p className="text-amber-400 font-serif text-lg">
                      ${expense.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-amber-400" />
                      <span className="text-amber-400/80 text-[11px]">
                        {getTimeRemaining(expense.deadline)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(expense.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(expense.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Approve
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {pendingExpenses.length === 0 && (
        <div className="mb-6 p-6 text-center bg-white/2 border border-white/5">
          <CheckCircle size={24} className="text-emerald-400/60 mx-auto mb-2" />
          <p className="text-white/50 text-sm">No pending approvals</p>
          <p className="text-white/25 text-xs mt-1">All expense requests have been handled</p>
        </div>
      )}

      {/* Recent History */}
      {otherExpenses.length > 0 && (
        <div>
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">Recent History</h3>
          <div className="space-y-2">
            {otherExpenses.map((expense, i) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between p-3 bg-white/2 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${getStatusStyles(expense.status)}`}>
                    {expense.status}
                  </span>
                  <div>
                    <p className="text-white/70 text-xs">{expense.description}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">{expense.requestedBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs font-mono">
                    ${expense.amount.toLocaleString()}
                  </span>
                  {expense.status === 'escalated' && (
                    <ArrowUpRight size={12} className="text-purple-400" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
