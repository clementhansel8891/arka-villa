// Owner Portal Dashboard Types

export interface Villa {
  id: string;
  name: string;
  location: string;
}

export interface ManagementOverviewData {
  occupancyRate: number;
  upcomingBookings: UpcomingBooking[];
  maintenanceTickets: MaintenanceTicketSummary;
  employeeCompletionRate: number;
  satisfactionScore: number;
}

export interface UpcomingBooking {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  status: 'confirmed' | 'pending';
}

export interface MaintenanceTicketSummary {
  open: number;
  inProgress: number;
  completed: number;
  critical: number;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  replacementCost: number;
}

export interface AssetTrackingData {
  categories: AssetCategory[];
  totalAssets: number;
  totalReplacementValue: number;
}

export interface AssetCategory {
  name: string;
  count: number;
  assets: Asset[];
}

export interface AccessLogEntry {
  id: string;
  staffName: string;
  role: string;
  accessType: 'entry' | 'exit';
  timestamp: string;
  area: string;
}

export interface SecurityAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface SecurityAccessData {
  accessLog: AccessLogEntry[];
  activeAlerts: SecurityAlert[];
  usersWithPermissions: PermissionUser[];
}

export interface PermissionUser {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  lastActive: string;
}

export interface MonthlyFinancial {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinancialSummaryData {
  mtdRevenue: number;
  ytdRevenue: number;
  mtdExpenses: number;
  ytdExpenses: number;
  netIncomeTrend: MonthlyFinancial[];
  expenseBreakdown: ExpenseBreakdown[];
  periodComparison: {
    currentMonth: number;
    previousMonth: number;
    changePercent: number;
  };
}

export interface SectionError {
  section: string;
  message: string;
}
