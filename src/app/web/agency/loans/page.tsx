"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  DollarSign,
  TrendingDown,
  User,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  getLoans,
  updateLoanStatus,
  formatIDR,
  type LoanRequest,
  type LoanStatus,
} from "@/lib/loan-store";

/**
 * Agency Dashboard — Loans Management
 * Approve/reject staff loan requests, track all active loans.
 */

const STATUS_CONFIG: Record<LoanStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  approved: { label: "Approved", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  repaying: { label: "Repaying", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  paid: { label: "Fully Paid", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
};

export default function AgencyLoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [filter, setFilter] = useState<LoanStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);

  useEffect(() => {
    setLoans(getLoans());
  }, []);

  const filtered = loans.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search && !l.staffName.toLowerCase().includes(search.toLowerCase()) && !l.reason.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    pending: loans.filter((l) => l.status === "pending").length,
    active: loans.filter((l) => l.status === "repaying" || l.status === "approved").length,
    totalOutstanding: loans.filter((l) => l.status === "repaying" || l.status === "approved").reduce((s, l) => s + (l.amount - l.totalRepaid), 0),
    totalDisbursed: loans.filter((l) => l.status !== "pending" && l.status !== "rejected").reduce((s, l) => s + l.amount, 0),
  };

  function handleApprove(id: string) {
    const updated = updateLoanStatus(id, "approved", user?.name);
    setLoans(updated);
    const loan = updated.find((l) => l.id === id);
    if (loan) setSelectedLoan(loan);
  }

  function handleReject(id: string) {
    const updated = updateLoanStatus(id, "rejected", undefined, "Loan limit exceeded or insufficient tenure");
    setLoans(updated);
    const loan = updated.find((l) => l.id === id);
    if (loan) setSelectedLoan(loan);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">Staff Loans</h1>
        <p className="text-sm text-white/40 mt-1">Manage loan requests and track repayments</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-yellow-400" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Pending Requests</span>
          </div>
          <p className="text-2xl font-serif text-yellow-400 font-bold">{stats.pending}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className="text-purple-400" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Active Loans</span>
          </div>
          <p className="text-2xl font-serif text-purple-400 font-bold">{stats.active}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Outstanding</span>
          </div>
          <p className="text-lg font-serif text-red-400 font-bold">{formatIDR(stats.totalOutstanding)}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-heritage-gold" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Total Disbursed</span>
          </div>
          <p className="text-lg font-serif text-heritage-gold font-bold">{formatIDR(stats.totalDisbursed)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search by staff name or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(["all", "pending", "approved", "repaying", "paid", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-2 text-xs uppercase tracking-wider font-bold rounded-lg transition-colors whitespace-nowrap",
                filter === s ? "bg-heritage-gold/10 text-heritage-gold border border-heritage-gold/30" : "text-white/40 hover:text-white border border-white/10"
              )}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loan List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">No loans found.</div>
        ) : (
          filtered.map((loan, i) => (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedLoan(loan)}
              className={cn(
                "border rounded-xl p-5 transition-colors cursor-pointer",
                loan.status === "pending" ? "border-yellow-400/20 bg-yellow-400/[0.02]" : "border-white/10 hover:border-heritage-gold/20"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white/20 text-xs font-mono">{loan.id}</span>
                    <span className="text-white font-medium">{loan.staffName}</span>
                    <span className="text-white/30 text-xs">{loan.department}</span>
                    <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded", STATUS_CONFIG[loan.status].bg)}>
                      {STATUS_CONFIG[loan.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-heritage-gold font-serif font-bold">{formatIDR(loan.amount)}</span>
                    <span className="text-white/30 text-xs">{loan.repaymentMonths} months</span>
                    <span className="text-white/30 text-xs">Requested: {loan.requestedAt}</span>
                  </div>
                  <p className="text-white/40 text-xs mt-1 truncate">{loan.reason}</p>
                </div>
                {loan.status === "pending" && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleApprove(loan.id)}
                      className="p-2 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-lg hover:bg-emerald-400/20 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      onClick={() => handleReject(loan.id)}
                      className="p-2 bg-red-400/10 text-red-400 border border-red-400/20 rounded-lg hover:bg-red-400/20 transition-colors"
                      title="Reject"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLoan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedLoan(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-heritage-charcoal border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <span className="text-white/30 text-xs font-mono">{selectedLoan.id}</span>
                  <h2 className="text-white font-serif text-xl mt-1">{selectedLoan.staffName}</h2>
                  <p className="text-white/40 text-xs">{selectedLoan.department}</p>
                </div>
                <button onClick={() => setSelectedLoan(null)} className="p-2 text-white/40 hover:text-white rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-heritage-gold font-serif text-2xl font-bold">{formatIDR(selectedLoan.amount)}</span>
                  <span className={cn("text-[10px] uppercase tracking-wider font-bold px-3 py-1 border rounded", STATUS_CONFIG[selectedLoan.status].bg)}>
                    {STATUS_CONFIG[selectedLoan.status].label}
                  </span>
                </div>

                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Reason</p>
                  <p className="text-white/80 text-sm">{selectedLoan.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Requested</p><p className="text-white">{selectedLoan.requestedAt}</p></div>
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Term</p><p className="text-white">{selectedLoan.repaymentMonths} months</p></div>
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Monthly Deduction</p><p className="text-heritage-gold">{formatIDR(selectedLoan.monthlyDeduction)}</p></div>
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Total Repaid</p><p className="text-emerald-400">{formatIDR(selectedLoan.totalRepaid)}</p></div>
                  {selectedLoan.approvedBy && <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Approved By</p><p className="text-white">{selectedLoan.approvedBy}</p></div>}
                  {selectedLoan.approvedAt && <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Approved Date</p><p className="text-white">{selectedLoan.approvedAt}</p></div>}
                </div>

                {/* Repayment Progress */}
                {(selectedLoan.status === "repaying" || selectedLoan.status === "paid") && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Repayment</p>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                      <div
                        className={cn("h-full rounded-full", selectedLoan.status === "paid" ? "bg-emerald-400" : "bg-purple-400/70")}
                        style={{ width: `${(selectedLoan.totalRepaid / selectedLoan.amount) * 100}%` }}
                      />
                    </div>
                    <p className="text-white/40 text-xs">{Math.round((selectedLoan.totalRepaid / selectedLoan.amount) * 100)}% complete</p>
                  </div>
                )}

                {/* Actions for pending */}
                {selectedLoan.status === "pending" && (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleApprove(selectedLoan.id)}
                      className="flex-1 py-2.5 text-xs uppercase tracking-widest font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-lg hover:bg-emerald-400/20 transition-colors"
                    >
                      Approve Loan
                    </button>
                    <button
                      onClick={() => handleReject(selectedLoan.id)}
                      className="flex-1 py-2.5 text-xs uppercase tracking-widest font-bold bg-red-400/10 text-red-400 border border-red-400/20 rounded-lg hover:bg-red-400/20 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {/* Payment History */}
                {selectedLoan.payments.length > 0 && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Payment History</p>
                    <div className="space-y-2">
                      {selectedLoan.payments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                          <span className="text-white/60">{p.month}</span>
                          <span className="text-emerald-400 font-medium">{formatIDR(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/10">
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="w-full py-2.5 text-xs uppercase tracking-widest font-bold text-white/60 border border-white/10 rounded-lg hover:text-white hover:border-white/30 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
