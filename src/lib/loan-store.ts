/**
 * Loan Store — localStorage-backed personal loan management.
 * Staff can request loans, track repayment. Agency admin can approve/reject.
 * Shared across all dashboards via localStorage.
 */

export type LoanStatus = "pending" | "approved" | "rejected" | "repaying" | "paid";

export interface LoanRequest {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  amount: number;
  reason: string;
  requestedAt: string;
  status: LoanStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  monthlyDeduction: number;
  totalRepaid: number;
  repaymentMonths: number;
  payments: LoanPayment[];
}

export interface LoanPayment {
  month: string;
  amount: number;
  paidAt: string;
}

const STORAGE_KEY = "av_loans";

const DEFAULT_LOANS: LoanRequest[] = [
  {
    id: "LN-001",
    staffId: "staff-001",
    staffName: "Ketut Sastra",
    department: "Hospitality",
    amount: 5000000,
    reason: "Home renovation — roof repair after storm damage",
    requestedAt: "2026-05-15",
    status: "repaying",
    approvedBy: "Clement Hansel",
    approvedAt: "2026-05-17",
    monthlyDeduction: 500000,
    totalRepaid: 1000000,
    repaymentMonths: 10,
    payments: [
      { month: "Jun 2026", amount: 500000, paidAt: "2026-06-01" },
      { month: "May 2026", amount: 500000, paidAt: "2026-05-25" },
    ],
  },
  {
    id: "LN-002",
    staffId: "staff-003",
    staffName: "Nyoman Wijaya",
    department: "F&B",
    amount: 3000000,
    reason: "Child's school tuition payment",
    requestedAt: "2026-06-10",
    status: "approved",
    approvedBy: "Clement Hansel",
    approvedAt: "2026-06-12",
    monthlyDeduction: 500000,
    totalRepaid: 0,
    repaymentMonths: 6,
    payments: [],
  },
  {
    id: "LN-003",
    staffId: "staff-006",
    staffName: "Putu Agung",
    department: "Maintenance",
    amount: 2000000,
    reason: "Motorbike repair for work commute",
    requestedAt: "2026-06-20",
    status: "pending",
    monthlyDeduction: 400000,
    totalRepaid: 0,
    repaymentMonths: 5,
    payments: [],
  },
  {
    id: "LN-004",
    staffId: "staff-002",
    staffName: "Made Ariani",
    department: "Wellness",
    amount: 1500000,
    reason: "Medical expenses — dental procedure",
    requestedAt: "2026-04-01",
    status: "paid",
    approvedBy: "Ayu Dewi",
    approvedAt: "2026-04-03",
    monthlyDeduction: 500000,
    totalRepaid: 1500000,
    repaymentMonths: 3,
    payments: [
      { month: "Jun 2026", amount: 500000, paidAt: "2026-06-01" },
      { month: "May 2026", amount: 500000, paidAt: "2026-05-01" },
      { month: "Apr 2026", amount: 500000, paidAt: "2026-04-15" },
    ],
  },
  {
    id: "LN-005",
    staffId: "staff-004",
    staffName: "Wayan Sudarsana",
    department: "Concierge",
    amount: 4000000,
    reason: "Wedding ceremony costs",
    requestedAt: "2026-06-22",
    status: "pending",
    monthlyDeduction: 500000,
    totalRepaid: 0,
    repaymentMonths: 8,
    payments: [],
  },
];

export function getLoans(): LoanRequest[] {
  if (typeof window === "undefined") return DEFAULT_LOANS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LOANS));
      return DEFAULT_LOANS;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_LOANS;
  }
}

export function saveLoans(loans: LoanRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
}

export function addLoanRequest(loan: Omit<LoanRequest, "id" | "requestedAt" | "status" | "totalRepaid" | "payments">): LoanRequest[] {
  const loans = getLoans();
  const newLoan: LoanRequest = {
    ...loan,
    id: `LN-${String(loans.length + 1).padStart(3, "0")}`,
    requestedAt: new Date().toISOString().split("T")[0],
    status: "pending",
    totalRepaid: 0,
    payments: [],
  };
  const updated = [newLoan, ...loans];
  saveLoans(updated);
  return updated;
}

export function updateLoanStatus(id: string, status: LoanStatus, approvedBy?: string, rejectionReason?: string): LoanRequest[] {
  const loans = getLoans();
  const updated = loans.map((l) => {
    if (l.id !== id) return l;
    const changes: Partial<LoanRequest> = { status };
    if (approvedBy) {
      changes.approvedBy = approvedBy;
      changes.approvedAt = new Date().toISOString().split("T")[0];
    }
    if (rejectionReason) changes.rejectionReason = rejectionReason;
    return { ...l, ...changes };
  });
  saveLoans(updated);
  return updated;
}

export function getLoansForStaff(staffId: string): LoanRequest[] {
  return getLoans().filter((l) => l.staffId === staffId);
}

/** Format IDR amount */
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
