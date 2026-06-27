// Owner Portal Mock Data
import type {
  Villa,
  ManagementOverviewData,
  AssetTrackingData,
  SecurityAccessData,
  FinancialSummaryData,
} from './types';

export const OWNER_VILLAS: Villa[] = [
  { id: 'villa-001', name: 'Arka Villa', location: 'Ubud, Bali' },
  { id: 'villa-002', name: 'Surya Villa', location: 'Canggu, Bali' },
  { id: 'villa-003', name: 'Chandra Villa', location: 'Seminyak, Bali' },
];

export const MANAGEMENT_OVERVIEW: Record<string, ManagementOverviewData> = {
  'villa-001': {
    occupancyRate: 88,
    upcomingBookings: [
      { id: 'BK-0301', guestName: 'James Whitmore', checkIn: '2026-06-05', checkOut: '2026-06-10', roomType: 'Royal Heritage Suite', status: 'confirmed' },
      { id: 'BK-0302', guestName: 'Yuki Tanaka', checkIn: '2026-06-08', checkOut: '2026-06-11', roomType: 'Jungle Horizon Villa', status: 'pending' },
      { id: 'BK-0303', guestName: 'Maria Santos', checkIn: '2026-06-12', checkOut: '2026-06-19', roomType: 'Sacred Lotus Pavilion', status: 'confirmed' },
      { id: 'BK-0304', guestName: 'Ravi Mehta', checkIn: '2026-06-15', checkOut: '2026-06-19', roomType: 'Royal Heritage Suite', status: 'confirmed' },
      { id: 'BK-0305', guestName: 'Chloe Dupont', checkIn: '2026-06-20', checkOut: '2026-06-22', roomType: 'Jungle Horizon Villa', status: 'pending' },
    ],
    maintenanceTickets: { open: 3, inProgress: 2, completed: 12, critical: 1 },
    employeeCompletionRate: 94,
    satisfactionScore: 4.8,
  },
  'villa-002': {
    occupancyRate: 72,
    upcomingBookings: [
      { id: 'BK-0401', guestName: 'Alex Chen', checkIn: '2026-06-06', checkOut: '2026-06-09', roomType: 'Ocean View Suite', status: 'confirmed' },
      { id: 'BK-0402', guestName: 'Sophie Martin', checkIn: '2026-06-10', checkOut: '2026-06-14', roomType: 'Garden Bungalow', status: 'pending' },
      { id: 'BK-0403', guestName: 'Tom Williams', checkIn: '2026-06-18', checkOut: '2026-06-22', roomType: 'Ocean View Suite', status: 'confirmed' },
    ],
    maintenanceTickets: { open: 1, inProgress: 1, completed: 8, critical: 0 },
    employeeCompletionRate: 89,
    satisfactionScore: 4.6,
  },
  'villa-003': {
    occupancyRate: 95,
    upcomingBookings: [
      { id: 'BK-0501', guestName: 'Emma Thompson', checkIn: '2026-06-04', checkOut: '2026-06-08', roomType: 'Penthouse Suite', status: 'confirmed' },
      { id: 'BK-0502', guestName: 'Liam O\'Brien', checkIn: '2026-06-07', checkOut: '2026-06-12', roomType: 'Beach Front Villa', status: 'confirmed' },
      { id: 'BK-0503', guestName: 'Anna Kowalski', checkIn: '2026-06-14', checkOut: '2026-06-17', roomType: 'Penthouse Suite', status: 'pending' },
      { id: 'BK-0504', guestName: 'David Kim', checkIn: '2026-06-19', checkOut: '2026-06-25', roomType: 'Beach Front Villa', status: 'confirmed' },
    ],
    maintenanceTickets: { open: 0, inProgress: 1, completed: 15, critical: 0 },
    employeeCompletionRate: 97,
    satisfactionScore: 4.9,
  },
};


export const ASSET_TRACKING: Record<string, AssetTrackingData> = {
  'villa-001': {
    totalAssets: 156,
    totalReplacementValue: 245000,
    categories: [
      {
        name: 'Furniture',
        count: 48,
        assets: [
          { id: 'A-001', name: 'King Bed Frame - Teak', category: 'Furniture', purchaseDate: '2024-03-15', condition: 'excellent', replacementCost: 3200 },
          { id: 'A-002', name: 'Dining Table - 8 Seater', category: 'Furniture', purchaseDate: '2024-03-15', condition: 'good', replacementCost: 2800 },
          { id: 'A-003', name: 'Lounge Sofa Set', category: 'Furniture', purchaseDate: '2024-06-01', condition: 'excellent', replacementCost: 4500 },
        ],
      },
      {
        name: 'Electronics',
        count: 32,
        assets: [
          { id: 'A-010', name: '75" OLED TV', category: 'Electronics', purchaseDate: '2025-01-10', condition: 'excellent', replacementCost: 2400 },
          { id: 'A-011', name: 'Sound System - Bose', category: 'Electronics', purchaseDate: '2025-01-10', condition: 'good', replacementCost: 1800 },
          { id: 'A-012', name: 'Smart Home Hub', category: 'Electronics', purchaseDate: '2025-03-20', condition: 'excellent', replacementCost: 450 },
        ],
      },
      {
        name: 'Kitchen Equipment',
        count: 28,
        assets: [
          { id: 'A-020', name: 'Commercial Espresso Machine', category: 'Kitchen Equipment', purchaseDate: '2024-08-01', condition: 'good', replacementCost: 3500 },
          { id: 'A-021', name: 'Wine Refrigerator', category: 'Kitchen Equipment', purchaseDate: '2024-08-01', condition: 'excellent', replacementCost: 1200 },
        ],
      },
      {
        name: 'Pool & Spa',
        count: 18,
        assets: [
          { id: 'A-030', name: 'Infinity Pool Filter System', category: 'Pool & Spa', purchaseDate: '2024-02-01', condition: 'good', replacementCost: 8500 },
          { id: 'A-031', name: 'Hot Tub - 6 Person', category: 'Pool & Spa', purchaseDate: '2024-02-01', condition: 'fair', replacementCost: 6200 },
        ],
      },
      {
        name: 'Linens & Textiles',
        count: 30,
        assets: [
          { id: 'A-040', name: 'Egyptian Cotton Sheets Set x20', category: 'Linens & Textiles', purchaseDate: '2025-04-01', condition: 'excellent', replacementCost: 4000 },
          { id: 'A-041', name: 'Bath Towel Collection', category: 'Linens & Textiles', purchaseDate: '2025-04-01', condition: 'good', replacementCost: 1500 },
        ],
      },
    ],
  },
  'villa-002': {
    totalAssets: 124,
    totalReplacementValue: 189000,
    categories: [
      {
        name: 'Furniture',
        count: 38,
        assets: [
          { id: 'A-100', name: 'Bamboo Bed Frame - Queen', category: 'Furniture', purchaseDate: '2024-05-10', condition: 'excellent', replacementCost: 2100 },
          { id: 'A-101', name: 'Outdoor Dining Set', category: 'Furniture', purchaseDate: '2024-05-10', condition: 'good', replacementCost: 3200 },
        ],
      },
      {
        name: 'Electronics',
        count: 26,
        assets: [
          { id: 'A-110', name: '65" Smart TV', category: 'Electronics', purchaseDate: '2025-02-15', condition: 'excellent', replacementCost: 1800 },
        ],
      },
      {
        name: 'Kitchen Equipment',
        count: 22,
        assets: [
          { id: 'A-120', name: 'Professional Oven', category: 'Kitchen Equipment', purchaseDate: '2024-07-01', condition: 'good', replacementCost: 2800 },
        ],
      },
      {
        name: 'Pool & Spa',
        count: 15,
        assets: [
          { id: 'A-130', name: 'Pool Heating System', category: 'Pool & Spa', purchaseDate: '2024-04-01', condition: 'good', replacementCost: 5500 },
        ],
      },
      {
        name: 'Linens & Textiles',
        count: 23,
        assets: [
          { id: 'A-140', name: 'Silk Pillow Set x15', category: 'Linens & Textiles', purchaseDate: '2025-03-01', condition: 'excellent', replacementCost: 2200 },
        ],
      },
    ],
  },
  'villa-003': {
    totalAssets: 178,
    totalReplacementValue: 312000,
    categories: [
      {
        name: 'Furniture',
        count: 55,
        assets: [
          { id: 'A-200', name: 'Custom Italian Sofa', category: 'Furniture', purchaseDate: '2024-01-20', condition: 'excellent', replacementCost: 8500 },
          { id: 'A-201', name: 'Handcrafted Dining Table', category: 'Furniture', purchaseDate: '2024-01-20', condition: 'excellent', replacementCost: 5200 },
        ],
      },
      {
        name: 'Electronics',
        count: 40,
        assets: [
          { id: 'A-210', name: '85" OLED TV', category: 'Electronics', purchaseDate: '2025-01-05', condition: 'excellent', replacementCost: 4200 },
          { id: 'A-211', name: 'Home Theater System', category: 'Electronics', purchaseDate: '2025-01-05', condition: 'excellent', replacementCost: 6500 },
        ],
      },
      {
        name: 'Kitchen Equipment',
        count: 35,
        assets: [
          { id: 'A-220', name: 'Sub-Zero Refrigerator', category: 'Kitchen Equipment', purchaseDate: '2024-06-01', condition: 'excellent', replacementCost: 7800 },
        ],
      },
      {
        name: 'Pool & Spa',
        count: 22,
        assets: [
          { id: 'A-230', name: 'Olympic-Style Pool System', category: 'Pool & Spa', purchaseDate: '2024-01-15', condition: 'excellent', replacementCost: 15000 },
        ],
      },
      {
        name: 'Linens & Textiles',
        count: 26,
        assets: [
          { id: 'A-240', name: 'Italian Linen Collection', category: 'Linens & Textiles', purchaseDate: '2025-02-01', condition: 'excellent', replacementCost: 6800 },
        ],
      },
    ],
  },
};

export const SECURITY_ACCESS: Record<string, SecurityAccessData> = {
  'villa-001': {
    accessLog: [
      { id: 'LOG-001', staffName: 'Ketut Sastra', role: 'Head Butler', accessType: 'entry', timestamp: '2026-06-01T08:00:00', area: 'Main Villa' },
      { id: 'LOG-002', staffName: 'Made Ariani', role: 'Spa Lead', accessType: 'entry', timestamp: '2026-06-01T09:30:00', area: 'Wellness Center' },
      { id: 'LOG-003', staffName: 'Nyoman Wijaya', role: 'Executive Chef', accessType: 'entry', timestamp: '2026-06-01T06:00:00', area: 'Kitchen' },
      { id: 'LOG-004', staffName: 'Wayan Sudarsana', role: 'Concierge', accessType: 'entry', timestamp: '2026-06-01T07:45:00', area: 'Reception' },
      { id: 'LOG-005', staffName: 'Ketut Sastra', role: 'Head Butler', accessType: 'exit', timestamp: '2026-06-01T17:00:00', area: 'Main Villa' },
      { id: 'LOG-006', staffName: 'Made Ariani', role: 'Spa Lead', accessType: 'exit', timestamp: '2026-06-01T18:30:00', area: 'Wellness Center' },
    ],
    activeAlerts: [
      { id: 'ALT-001', type: 'warning', message: 'Unusual access attempt at pool area after hours', timestamp: '2026-06-01T22:15:00', resolved: false },
      { id: 'ALT-002', type: 'info', message: 'New staff access card registered', timestamp: '2026-06-01T10:00:00', resolved: true },
    ],
    usersWithPermissions: [
      { id: 'P-001', name: 'Ketut Sastra', role: 'Head Butler', permissions: ['full_access', 'key_management', 'guest_services'], lastActive: '2026-06-01T17:00:00' },
      { id: 'P-002', name: 'Made Ariani', role: 'Spa Lead', permissions: ['wellness_center', 'guest_services'], lastActive: '2026-06-01T18:30:00' },
      { id: 'P-003', name: 'Nyoman Wijaya', role: 'Executive Chef', permissions: ['kitchen', 'storage', 'deliveries'], lastActive: '2026-06-01T15:00:00' },
      { id: 'P-004', name: 'Wayan Sudarsana', role: 'Concierge', permissions: ['reception', 'guest_services', 'vehicle_access'], lastActive: '2026-06-01T16:30:00' },
    ],
  },
  'villa-002': {
    accessLog: [
      { id: 'LOG-101', staffName: 'Putu Dharma', role: 'Villa Manager', accessType: 'entry', timestamp: '2026-06-01T07:30:00', area: 'Main Building' },
      { id: 'LOG-102', staffName: 'Komang Sari', role: 'Housekeeper', accessType: 'entry', timestamp: '2026-06-01T08:00:00', area: 'Guest Rooms' },
      { id: 'LOG-103', staffName: 'Putu Dharma', role: 'Villa Manager', accessType: 'exit', timestamp: '2026-06-01T18:00:00', area: 'Main Building' },
    ],
    activeAlerts: [
      { id: 'ALT-101', type: 'info', message: 'Scheduled maintenance access granted', timestamp: '2026-06-01T14:00:00', resolved: true },
    ],
    usersWithPermissions: [
      { id: 'P-101', name: 'Putu Dharma', role: 'Villa Manager', permissions: ['full_access', 'key_management'], lastActive: '2026-06-01T18:00:00' },
      { id: 'P-102', name: 'Komang Sari', role: 'Housekeeper', permissions: ['guest_rooms', 'laundry', 'storage'], lastActive: '2026-06-01T16:00:00' },
    ],
  },
  'villa-003': {
    accessLog: [
      { id: 'LOG-201', staffName: 'Agung Pratama', role: 'Security Lead', accessType: 'entry', timestamp: '2026-06-01T06:00:00', area: 'Security Office' },
      { id: 'LOG-202', staffName: 'Dewi Lestari', role: 'Villa Manager', accessType: 'entry', timestamp: '2026-06-01T07:00:00', area: 'Main Villa' },
      { id: 'LOG-203', staffName: 'Kadek Surya', role: 'Chef', accessType: 'entry', timestamp: '2026-06-01T05:30:00', area: 'Kitchen' },
      { id: 'LOG-204', staffName: 'Agung Pratama', role: 'Security Lead', accessType: 'exit', timestamp: '2026-06-01T18:00:00', area: 'Security Office' },
    ],
    activeAlerts: [],
    usersWithPermissions: [
      { id: 'P-201', name: 'Agung Pratama', role: 'Security Lead', permissions: ['full_access', 'cctv', 'alarm_system'], lastActive: '2026-06-01T18:00:00' },
      { id: 'P-202', name: 'Dewi Lestari', role: 'Villa Manager', permissions: ['full_access', 'key_management', 'guest_services'], lastActive: '2026-06-01T17:30:00' },
      { id: 'P-203', name: 'Kadek Surya', role: 'Chef', permissions: ['kitchen', 'storage', 'deliveries'], lastActive: '2026-06-01T14:00:00' },
    ],
  },
};

export const FINANCIAL_SUMMARY: Record<string, FinancialSummaryData> = {
  'villa-001': {
    mtdRevenue: 67000,
    ytdRevenue: 385000,
    mtdExpenses: 22400,
    ytdExpenses: 128000,
    netIncomeTrend: [
      { month: 'Jul', revenue: 52000, expenses: 18000, netIncome: 34000 },
      { month: 'Aug', revenue: 58000, expenses: 19500, netIncome: 38500 },
      { month: 'Sep', revenue: 45000, expenses: 17000, netIncome: 28000 },
      { month: 'Oct', revenue: 48000, expenses: 17800, netIncome: 30200 },
      { month: 'Nov', revenue: 55000, expenses: 19000, netIncome: 36000 },
      { month: 'Dec', revenue: 72000, expenses: 24000, netIncome: 48000 },
      { month: 'Jan', revenue: 68000, expenses: 22000, netIncome: 46000 },
      { month: 'Feb', revenue: 62000, expenses: 20500, netIncome: 41500 },
      { month: 'Mar', revenue: 58000, expenses: 19800, netIncome: 38200 },
      { month: 'Apr', revenue: 64000, expenses: 21000, netIncome: 43000 },
      { month: 'May', revenue: 55000, expenses: 19200, netIncome: 35800 },
      { month: 'Jun', revenue: 67000, expenses: 22400, netIncome: 44600 },
    ],
    expenseBreakdown: [
      { category: 'Staff Wages', amount: 9800, percentage: 43.7 },
      { category: 'Maintenance', amount: 4200, percentage: 18.8 },
      { category: 'Utilities', amount: 3100, percentage: 13.8 },
      { category: 'Supplies', amount: 2800, percentage: 12.5 },
      { category: 'Marketing', amount: 1500, percentage: 6.7 },
      { category: 'Insurance', amount: 1000, percentage: 4.5 },
    ],
    periodComparison: {
      currentMonth: 67000,
      previousMonth: 55000,
      changePercent: 21.8,
    },
  },
  'villa-002': {
    mtdRevenue: 48000,
    ytdRevenue: 268000,
    mtdExpenses: 16800,
    ytdExpenses: 95000,
    netIncomeTrend: [
      { month: 'Jul', revenue: 38000, expenses: 14000, netIncome: 24000 },
      { month: 'Aug', revenue: 42000, expenses: 15000, netIncome: 27000 },
      { month: 'Sep', revenue: 35000, expenses: 13000, netIncome: 22000 },
      { month: 'Oct', revenue: 40000, expenses: 14500, netIncome: 25500 },
      { month: 'Nov', revenue: 44000, expenses: 15200, netIncome: 28800 },
      { month: 'Dec', revenue: 52000, expenses: 18000, netIncome: 34000 },
      { month: 'Jan', revenue: 49000, expenses: 17000, netIncome: 32000 },
      { month: 'Feb', revenue: 45000, expenses: 16000, netIncome: 29000 },
      { month: 'Mar', revenue: 42000, expenses: 15500, netIncome: 26500 },
      { month: 'Apr', revenue: 46000, expenses: 16200, netIncome: 29800 },
      { month: 'May', revenue: 43000, expenses: 15800, netIncome: 27200 },
      { month: 'Jun', revenue: 48000, expenses: 16800, netIncome: 31200 },
    ],
    expenseBreakdown: [
      { category: 'Staff Wages', amount: 7200, percentage: 42.9 },
      { category: 'Maintenance', amount: 3400, percentage: 20.2 },
      { category: 'Utilities', amount: 2500, percentage: 14.9 },
      { category: 'Supplies', amount: 2000, percentage: 11.9 },
      { category: 'Marketing', amount: 1100, percentage: 6.5 },
      { category: 'Insurance', amount: 600, percentage: 3.6 },
    ],
    periodComparison: {
      currentMonth: 48000,
      previousMonth: 43000,
      changePercent: 11.6,
    },
  },
  'villa-003': {
    mtdRevenue: 89000,
    ytdRevenue: 498000,
    mtdExpenses: 28500,
    ytdExpenses: 162000,
    netIncomeTrend: [
      { month: 'Jul', revenue: 68000, expenses: 22000, netIncome: 46000 },
      { month: 'Aug', revenue: 75000, expenses: 24000, netIncome: 51000 },
      { month: 'Sep', revenue: 62000, expenses: 20000, netIncome: 42000 },
      { month: 'Oct', revenue: 70000, expenses: 22500, netIncome: 47500 },
      { month: 'Nov', revenue: 78000, expenses: 25000, netIncome: 53000 },
      { month: 'Dec', revenue: 95000, expenses: 30000, netIncome: 65000 },
      { month: 'Jan', revenue: 88000, expenses: 28000, netIncome: 60000 },
      { month: 'Feb', revenue: 82000, expenses: 26500, netIncome: 55500 },
      { month: 'Mar', revenue: 76000, expenses: 24800, netIncome: 51200 },
      { month: 'Apr', revenue: 84000, expenses: 27000, netIncome: 57000 },
      { month: 'May', revenue: 79000, expenses: 25500, netIncome: 53500 },
      { month: 'Jun', revenue: 89000, expenses: 28500, netIncome: 60500 },
    ],
    expenseBreakdown: [
      { category: 'Staff Wages', amount: 12500, percentage: 43.9 },
      { category: 'Maintenance', amount: 5200, percentage: 18.2 },
      { category: 'Utilities', amount: 4100, percentage: 14.4 },
      { category: 'Supplies', amount: 3500, percentage: 12.3 },
      { category: 'Marketing', amount: 2000, percentage: 7.0 },
      { category: 'Insurance', amount: 1200, percentage: 4.2 },
    ],
    periodComparison: {
      currentMonth: 89000,
      previousMonth: 79000,
      changePercent: 12.7,
    },
  },
};
