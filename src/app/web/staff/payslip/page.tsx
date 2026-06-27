"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Receipt, Calendar, DollarSign, TrendingUp, TrendingDown,
  ChevronDown, ChevronRight, Download, Clock, Award, Gift,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getLoansForStaff, type LoanRequest } from "@/lib/loan-store";

// ─── Types ────────────────────────────────────────────────────
interface PayslipData {
  month: string;
  year: number;
  basicSalary: number;
  regularHours: number;
  overtimeHours: number;
  overtimePay: number;
  performanceBonus: number;
  holidayBonus: number;
  taxDeduction: number;
  bpjsHealth: number;
  bpjsEmployment: number;
  loanDeduction: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

// ─── Constants ────────────────────────────────────────────────
const STANDARD_HOURS_PER_MONTH = 176; // 22 days × 8 hours
const TAX_RATE = 0.05;
const BPJS_HEALTH_RATE = 0.01; // 1% of basic
const BPJS_EMPLOYMENT_RATE = 0.02; // 2% of basic
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// ─── Generate mock payslip history ────────────────────────────
function generatePayslips(
  hourlyRate: number,
  staffId: string
): PayslipData[] {
  const loans = getLoansForStaff(staffId);
  const activeLoan = loans.find(
    (l: LoanRequest) => l.status === "repaying" || l.status === "approved"
  );
  const monthlyLoanDeduction = activeLoan?.monthlyDeduction ?? 0;

  // Generate 6 months of payslips (current month back)
  const now = new Date();
  const payslips: PayslipData[] = [];

  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();

    // Vary hours slightly for realism
    const overtimeMultiplier = [1.2, 0.8, 1.5, 1.0, 0.6, 1.3][i];
    const baseOvertimeHours = Math.round(12 * overtimeMultiplier);
    const regularHours = STANDARD_HOURS_PER_MONTH;
    const overtimeHours = baseOvertimeHours;

    const basicSalary = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5;

    // Bonuses: performance bonus varies, holiday bonus in Dec
    const performanceBonus = i === 0
      ? Math.round(basicSalary * 0.05)
      : Math.round(basicSalary * [0.05, 0.03, 0.08, 0.04, 0.06, 0.02][i]);
    const holidayBonus = date.getMonth() === 11 ? Math.round(basicSalary * 0.5) : 0;

    const grossPay = basicSalary + overtimePay + performanceBonus + holidayBonus;

    // Deductions
    const taxDeduction = Math.round(grossPay * TAX_RATE);
    const bpjsHealth = Math.round(basicSalary * BPJS_HEALTH_RATE);
    const bpjsEmployment = Math.round(basicSalary * BPJS_EMPLOYMENT_RATE);
    const loanDeduction = i < (activeLoan?.repaymentMonths ?? 0) ? monthlyLoanDeduction : 0;
    const totalDeductions = taxDeduction + bpjsHealth + bpjsEmployment + loanDeduction;
    const netPay = grossPay - totalDeductions;

    payslips.push({
      month, year, basicSalary, regularHours, overtimeHours, overtimePay,
      performanceBonus, holidayBonus, taxDeduction, bpjsHealth, bpjsEmployment,
      loanDeduction, grossPay, totalDeductions, netPay,
    });
  }

  return payslips;
}

// ─── Format USD ───────────────────────────────────────────────
function fmt(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Page Component ───────────────────────────────────────────
export default function PayslipPage() {
  const { user } = useAuth();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const payslips = useMemo(() => {
    if (!user?.hourlyRate) return [];
    return generatePayslips(user.hourlyRate, user.id);
  }, [user]);

  if (!user || !user.hourlyRate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/40">Payslip data unavailable.</p>
      </div>
    );
  }

  const selected = payslips[selectedIdx];
  if (!selected) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-serif text-white font-bold flex items-center gap-3">
          <Receipt size={24} className="text-heritage-gold" />
          Payslip
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Monthly salary breakdown and payment history
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <DollarSign size={16} />
            <span className="text-xs uppercase tracking-wider text-white/40">Net Pay</span>
          </div>
          <p className="text-2xl font-serif text-white">{fmt(selected.netPay)}</p>
          <p className="text-xs text-white/30 mt-1">{selected.month} {selected.year}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs uppercase tracking-wider text-white/40">Gross Pay</span>
          </div>
          <p className="text-2xl font-serif text-white">{fmt(selected.grossPay)}</p>
          <p className="text-xs text-white/30 mt-1">Before deductions</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <TrendingDown size={16} />
            <span className="text-xs uppercase tracking-wider text-white/40">Deductions</span>
          </div>
          <p className="text-2xl font-serif text-white">{fmt(selected.totalDeductions)}</p>
          <p className="text-xs text-white/30 mt-1">Tax, insurance, loans</p>
        </div>
      </div>

      {/* Payslip Detail */}
      <motion.div
        key={selectedIdx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
      >
        {/* Payslip Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-white font-serif text-lg">{selected.month} {selected.year}</h2>
            <p className="text-white/40 text-xs mt-0.5">{user.name} • {user.position}</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-heritage-gold/10 border border-heritage-gold/20 text-heritage-gold text-xs rounded-lg hover:bg-heritage-gold/20 transition-colors">
            <Download size={12} />
            Export
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Earnings */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" />
              Earnings
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-white/30" />
                  <span className="text-white/70 text-sm">Basic Salary</span>
                  <span className="text-white/30 text-xs">({selected.regularHours}h × ${user.hourlyRate}/h)</span>
                </div>
                <span className="text-white font-medium">{fmt(selected.basicSalary)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-white/30" />
                  <span className="text-white/70 text-sm">Overtime Pay</span>
                  <span className="text-white/30 text-xs">({selected.overtimeHours}h × ${Math.round(user.hourlyRate * 1.5)}/h)</span>
                </div>
                <span className="text-white font-medium">{fmt(selected.overtimePay)}</span>
              </div>
              {selected.performanceBonus > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-white/30" />
                    <span className="text-white/70 text-sm">Performance Bonus</span>
                  </div>
                  <span className="text-emerald-400 font-medium">+{fmt(selected.performanceBonus)}</span>
                </div>
              )}
              {selected.holidayBonus > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Gift size={14} className="text-white/30" />
                    <span className="text-white/70 text-sm">Holiday Bonus (THR)</span>
                  </div>
                  <span className="text-emerald-400 font-medium">+{fmt(selected.holidayBonus)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 bg-emerald-400/5 rounded-lg px-3 -mx-3">
                <span className="text-white font-medium text-sm">Total Earnings</span>
                <span className="text-emerald-400 font-bold">{fmt(selected.grossPay)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <TrendingDown size={14} className="text-red-400" />
              Deductions
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Minus size={14} className="text-white/30" />
                  <span className="text-white/70 text-sm">Income Tax (PPh 21)</span>
                  <span className="text-white/30 text-xs">(5%)</span>
                </div>
                <span className="text-red-400/80 font-medium">-{fmt(selected.taxDeduction)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Minus size={14} className="text-white/30" />
                  <span className="text-white/70 text-sm">BPJS Health Insurance</span>
                  <span className="text-white/30 text-xs">(1%)</span>
                </div>
                <span className="text-red-400/80 font-medium">-{fmt(selected.bpjsHealth)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Minus size={14} className="text-white/30" />
                  <span className="text-white/70 text-sm">BPJS Employment</span>
                  <span className="text-white/30 text-xs">(2%)</span>
                </div>
                <span className="text-red-400/80 font-medium">-{fmt(selected.bpjsEmployment)}</span>
              </div>
              {selected.loanDeduction > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Minus size={14} className="text-white/30" />
                    <span className="text-white/70 text-sm">Loan Repayment</span>
                  </div>
                  <span className="text-red-400/80 font-medium">-{fmt(selected.loanDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 bg-red-400/5 rounded-lg px-3 -mx-3">
                <span className="text-white font-medium text-sm">Total Deductions</span>
                <span className="text-red-400 font-bold">-{fmt(selected.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-heritage-gold/5 border border-heritage-gold/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-heritage-gold text-xs uppercase tracking-wider">Net Pay (Take Home)</p>
              <p className="text-white text-3xl font-serif mt-1">{fmt(selected.netPay)}</p>
            </div>
            <DollarSign size={40} className="text-heritage-gold/20" />
          </div>
        </div>
      </motion.div>

      {/* History */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-white font-serif flex items-center gap-2">
            <Calendar size={16} className="text-heritage-gold" />
            Payment History
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {payslips.map((slip, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 text-left transition-colors",
                i === selectedIdx
                  ? "bg-heritage-gold/5 border-l-2 border-heritage-gold"
                  : "hover:bg-white/[0.02] border-l-2 border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium",
                  i === selectedIdx ? "bg-heritage-gold/20 text-heritage-gold" : "bg-white/5 text-white/40"
                )}>
                  {slip.month.slice(0, 3)}
                </div>
                <div>
                  <p className={cn("text-sm font-medium", i === selectedIdx ? "text-white" : "text-white/70")}>
                    {slip.month} {slip.year}
                  </p>
                  <p className="text-xs text-white/30">{slip.regularHours + slip.overtimeHours} hours worked</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("font-medium text-sm", i === selectedIdx ? "text-heritage-gold" : "text-white/60")}>
                  {fmt(slip.netPay)}
                </span>
                <ChevronRight size={14} className={cn(i === selectedIdx ? "text-heritage-gold" : "text-white/20")} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
