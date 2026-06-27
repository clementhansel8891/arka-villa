"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Plus,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  getLoansForStaff,
  addLoanRequest,
  formatIDR,
  type LoanRequest,
  type LoanStatus,
} from "@/lib/loan-store";

/**
 * Staff Portal — Loans Page
 * Request personal loans and track repayment progress.
 */

const STATUS_CONFIG: Record<LoanStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending Approval", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  approved: { label: "Approved", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  repaying: { label: "Repaying", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  paid: { label: "Fully Paid", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
};

export default function StaffLoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);

  useEffect(() => {
    if (user?.id) {
      setLoans(getLoansForStaff(user.id));
    }
  }, [user?.id]);

  function handleRequestLoan(data: { amount: number; reason: string; repaymentMonths: number }) {
    if (!user) return;
    const monthlyDeduction = Math.ceil(data.amount / data.repaymentMonths);
    addLoanRequest({
      staffId: user.id,
      staffName: user.name,
      department: user.department || "General",
      amount: data.amount,
      reason: data.reason,
      monthlyDeduction,
      repaymentMonths: data.repaymentMonths,
    });
    setLoans(getLoansForStaff(user.id));
    setShowRequestForm(false);
  }

  const activeLoans = loans.filter((l) => l.status === "repaying" || l.status === "approved");
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.amount - l.totalRepaid), 0);
  const totalMonthlyDeduction = activeLoans.reduce((sum, l) => sum + l.monthlyDeduction, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white font-bold">Personal Loans</h1>
          <p className="text-sm text-white/40 mt-1">Request and track your salary advance loans</p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-4 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
        >
          <Plus size={14} /> Request Loan
        </button>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className="text-heritage-gold" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Total Loans</span>
          </div>
          <p className="text-2xl font-serif text-white font-bold">{loans.length}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-red-400" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Outstanding</span>
          </div>
          <p className="text-xl font-serif text-red-400 font-bold">{formatIDR(totalOutstanding)}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-yellow-400" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Monthly Deduction</span>
          </div>
          <p className="text-xl font-serif text-yellow-400 font-bold">{formatIDR(totalMonthlyDeduction)}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-400" />
            <span className="text-white/30 text-[10px] uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-serif text-blue-400 font-bold">{loans.filter((l) => l.status === "pending").length}</p>
        </div>
      </div>

      {/* Loan List */}
      <div className="space-y-3">
        {loans.length === 0 ? (
          <div className="text-center py-16 border border-white/10 rounded-xl">
            <Wallet size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40 text-sm">You haven&apos;t requested any loans yet.</p>
            <button
              onClick={() => setShowRequestForm(true)}
              className="mt-4 text-heritage-gold text-xs uppercase tracking-widest font-bold hover:text-white transition-colors"
            >
              Request Your First Loan
            </button>
          </div>
        ) : (
          loans.map((loan, i) => (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedLoan(loan)}
              className="border border-white/10 rounded-xl p-5 hover:border-heritage-gold/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-white/20 text-xs font-mono">{loan.id}</span>
                    <span className="text-heritage-gold font-serif text-lg font-bold">{formatIDR(loan.amount)}</span>
                    <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded", STATUS_CONFIG[loan.status].bg)}>
                      {STATUS_CONFIG[loan.status].label}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mt-1">{loan.reason}</p>
                  <div className="flex items-center gap-4 mt-2 text-white/30 text-xs">
                    <span>Requested: {new Date(loan.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    {loan.status === "repaying" && (
                      <span className="text-purple-400">{formatIDR(loan.totalRepaid)} / {formatIDR(loan.amount)} repaid</span>
                    )}
                    <span>{loan.repaymentMonths} months</span>
                  </div>
                  {/* Progress bar for repaying */}
                  {loan.status === "repaying" && (
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden max-w-xs">
                      <div
                        className="h-full rounded-full bg-purple-400/70"
                        style={{ width: `${(loan.totalRepaid / loan.amount) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Loan Detail Modal */}
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
              className="bg-heritage-charcoal border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <span className="text-white/30 text-xs font-mono">{selectedLoan.id}</span>
                  <h2 className="text-white font-serif text-xl mt-1">{formatIDR(selectedLoan.amount)}</h2>
                </div>
                <button onClick={() => setSelectedLoan(null)} className="p-2 text-white/40 hover:text-white rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <span className={cn("text-[10px] uppercase tracking-wider font-bold px-3 py-1 border rounded inline-block", STATUS_CONFIG[selectedLoan.status].bg)}>
                  {STATUS_CONFIG[selectedLoan.status].label}
                </span>

                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Reason</p>
                  <p className="text-white/80 text-sm">{selectedLoan.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Requested</p>
                    <p className="text-white">{selectedLoan.requestedAt}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Term</p>
                    <p className="text-white">{selectedLoan.repaymentMonths} months</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Monthly Deduction</p>
                    <p className="text-heritage-gold">{formatIDR(selectedLoan.monthlyDeduction)}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Total Repaid</p>
                    <p className="text-emerald-400">{formatIDR(selectedLoan.totalRepaid)}</p>
                  </div>
                  {selectedLoan.approvedBy && (
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Approved By</p>
                      <p className="text-white">{selectedLoan.approvedBy}</p>
                    </div>
                  )}
                  {selectedLoan.rejectionReason && (
                    <div className="col-span-2">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Rejection Reason</p>
                      <p className="text-red-400 text-sm">{selectedLoan.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Repayment Progress */}
                {(selectedLoan.status === "repaying" || selectedLoan.status === "paid") && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Repayment Progress</p>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                      <div
                        className={cn("h-full rounded-full", selectedLoan.status === "paid" ? "bg-emerald-400" : "bg-purple-400/70")}
                        style={{ width: `${(selectedLoan.totalRepaid / selectedLoan.amount) * 100}%` }}
                      />
                    </div>
                    <p className="text-white/40 text-xs">{formatIDR(selectedLoan.totalRepaid)} of {formatIDR(selectedLoan.amount)} ({Math.round((selectedLoan.totalRepaid / selectedLoan.amount) * 100)}%)</p>
                  </div>
                )}

                {/* Payment History */}
                {selectedLoan.payments.length > 0 && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Payment History</p>
                    <div className="space-y-2">
                      {selectedLoan.payments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <span className="text-white/60 text-sm">{p.month}</span>
                          <span className="text-emerald-400 text-sm font-medium">{formatIDR(p.amount)}</span>
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

      {/* Request Form Modal */}
      <AnimatePresence>
        {showRequestForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowRequestForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-heritage-charcoal border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <LoanRequestForm onSubmit={handleRequestLoan} onCancel={() => setShowRequestForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoanRequestForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { amount: number; reason: string; repaymentMonths: number }) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [months, setMonths] = useState("6");

  const numAmount = parseInt(amount.replace(/\D/g, "")) || 0;
  const numMonths = parseInt(months) || 6;
  const monthlyDeduction = numAmount > 0 ? Math.ceil(numAmount / numMonths) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (numAmount <= 0 || !reason.trim()) return;
    onSubmit({ amount: numAmount, reason, repaymentMonths: numMonths });
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-serif text-lg">Request Personal Loan</h2>
        <button type="button" onClick={onCancel} className="p-2 text-white/40 hover:text-white rounded-lg">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Amount (IDR) *</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          required
          placeholder="e.g. 5000000"
          className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
        />
        {numAmount > 0 && (
          <p className="text-heritage-gold text-xs mt-1">{formatIDR(numAmount)}</p>
        )}
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={3}
          placeholder="Explain why you need this loan..."
          className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30 resize-none"
        />
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Repayment Period</label>
        <select
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50"
        >
          <option value="3">3 months</option>
          <option value="6">6 months</option>
          <option value="9">9 months</option>
          <option value="12">12 months</option>
        </select>
      </div>

      {monthlyDeduction > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Estimated Monthly Deduction</p>
          <p className="text-heritage-gold font-serif text-lg font-bold">{formatIDR(monthlyDeduction)}/month</p>
          <p className="text-white/30 text-xs mt-0.5">Deducted from salary for {numMonths} months</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-heritage-gold text-heritage-charcoal py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors rounded-lg"
        >
          Submit Request
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 text-xs uppercase tracking-widest font-bold text-white/60 border border-white/10 rounded-lg hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
