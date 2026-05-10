// ============================================================
// Arka Villa — Client-Side Mock Auth Store
// localStorage-backed user management (no backend required)
// ============================================================

export type UserRole = "admin" | "staff" | "guest";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  // Staff / Admin fields
  position?: string;
  department?: string;
  startDate?: string;
  hourlyRate?: number;
  // Guest fields
  phone?: string;
  nationality?: string;
};

export type ScheduleEntry = {
  date: string;
  shift: "Morning" | "Afternoon" | "Evening" | "Off";
  hours: number;
  overtime?: number;
};

export type BookingRecord = {
  id: string;
  suite: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  status: "Confirmed" | "Completed" | "Pending" | "Cancelled";
};

// ─── Seed Data ───────────────────────────────────────────────

const DEFAULT_USERS: User[] = [
  {
    id: "admin-001",
    name: "Wayan Budiana",
    email: "admin@heritagehaven.com",
    role: "admin",
    position: "General Manager",
    department: "Management",
    startDate: "2020-01-15",
    hourlyRate: 85,
  },
  {
    id: "staff-001",
    name: "Ketut Sastra",
    email: "staff@heritagehaven.com",
    role: "staff",
    position: "Villa Attendant",
    department: "Hospitality",
    startDate: "2022-03-01",
    hourlyRate: 45,
  },
  {
    id: "staff-002",
    name: "Made Ariani",
    email: "made@heritagehaven.com",
    role: "staff",
    position: "Spa Therapist",
    department: "Wellness",
    startDate: "2023-06-10",
    hourlyRate: 55,
  },
  {
    id: "guest-001",
    name: "James Whitmore",
    email: "guest@example.com",
    role: "guest",
    phone: "+1 555 0102",
    nationality: "American",
  },
];

const DEFAULT_PASSWORDS: Record<string, string> = {
  "admin@heritagehaven.com": "admin123",
  "staff@heritagehaven.com": "staff123",
  "made@heritagehaven.com": "staff123",
  "guest@example.com": "guest123",
};

export const MOCK_SCHEDULES: Record<string, ScheduleEntry[]> = {
  "admin-001": [
    { date: "2026-05-06", shift: "Morning", hours: 8, overtime: 0 },
    { date: "2026-05-07", shift: "Morning", hours: 8, overtime: 2 },
    { date: "2026-05-08", shift: "Afternoon", hours: 8, overtime: 0 },
    { date: "2026-05-09", shift: "Off", hours: 0 },
    { date: "2026-05-10", shift: "Morning", hours: 8, overtime: 1 },
    { date: "2026-05-11", shift: "Morning", hours: 8, overtime: 0 },
    { date: "2026-05-12", shift: "Off", hours: 0 },
  ],
  "staff-001": [
    { date: "2026-05-06", shift: "Afternoon", hours: 8, overtime: 1 },
    { date: "2026-05-07", shift: "Afternoon", hours: 8, overtime: 0 },
    { date: "2026-05-08", shift: "Evening", hours: 8, overtime: 0 },
    { date: "2026-05-09", shift: "Off", hours: 0 },
    { date: "2026-05-10", shift: "Morning", hours: 8, overtime: 3 },
    { date: "2026-05-11", shift: "Afternoon", hours: 8, overtime: 0 },
    { date: "2026-05-12", shift: "Off", hours: 0 },
  ],
  "staff-002": [
    { date: "2026-05-06", shift: "Morning", hours: 8, overtime: 0 },
    { date: "2026-05-07", shift: "Off", hours: 0 },
    { date: "2026-05-08", shift: "Morning", hours: 8, overtime: 0 },
    { date: "2026-05-09", shift: "Afternoon", hours: 8, overtime: 1 },
    { date: "2026-05-10", shift: "Evening", hours: 8, overtime: 0 },
    { date: "2026-05-11", shift: "Off", hours: 0 },
    { date: "2026-05-12", shift: "Morning", hours: 8, overtime: 2 },
  ],
};

export const MOCK_GUEST_BOOKINGS: Record<string, BookingRecord[]> = {
  "guest-001": [
    {
      id: "HH-0201",
      suite: "Royal Heritage Suite",
      checkIn: "2025-12-20",
      checkOut: "2025-12-25",
      nights: 5,
      total: 6000,
      status: "Completed",
    },
    {
      id: "HH-0228",
      suite: "Jungle Horizon Villa",
      checkIn: "2026-03-10",
      checkOut: "2026-03-13",
      nights: 3,
      total: 2850,
      status: "Completed",
    },
    {
      id: "HH-0241",
      suite: "Royal Heritage Suite",
      checkIn: "2026-06-15",
      checkOut: "2026-06-20",
      nights: 5,
      total: 6000,
      status: "Confirmed",
    },
  ],
};

// ─── Storage Keys ─────────────────────────────────────────────

const USERS_KEY = "hh_users";
const PASSWORDS_KEY = "hh_passwords";

// ─── Storage Helpers ──────────────────────────────────────────

function getUsers(): User[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (!stored) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_USERS;
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getPasswords(): Record<string, string> {
  if (typeof window === "undefined") return DEFAULT_PASSWORDS;
  try {
    const stored = localStorage.getItem(PASSWORDS_KEY);
    if (!stored) {
      localStorage.setItem(PASSWORDS_KEY, JSON.stringify(DEFAULT_PASSWORDS));
      return DEFAULT_PASSWORDS;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_PASSWORDS;
  }
}

function savePasswords(passwords: Record<string, string>): void {
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
}

// ─── Auth Functions ───────────────────────────────────────────

export function loginUser(email: string, password: string): User | null {
  const users = getUsers();
  const passwords = getPasswords();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  if (passwords[user.email] !== password) return null;
  return user;
}

export function registerGuest(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  nationality?: string;
}): { user: User | null; error?: string } {
  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    return { user: null, error: "An account with this email already exists." };
  }
  const newUser: User = {
    id: `guest-${Date.now()}`,
    name: data.name,
    email: data.email,
    role: "guest",
    phone: data.phone,
    nationality: data.nationality,
  };
  users.push(newUser);
  saveUsers(users);
  const passwords = getPasswords();
  passwords[data.email] = data.password;
  savePasswords(passwords);
  return { user: newUser };
}

export function registerStaff(data: {
  name: string;
  email: string;
  password: string;
  position: string;
  department: string;
  startDate: string;
  hourlyRate: number;
}): { user: User | null; error?: string } {
  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    return { user: null, error: "A staff member with this email already exists." };
  }
  const newUser: User = {
    id: `staff-${Date.now()}`,
    name: data.name,
    email: data.email,
    role: "staff",
    position: data.position,
    department: data.department,
    startDate: data.startDate,
    hourlyRate: data.hourlyRate,
  };
  users.push(newUser);
  saveUsers(users);
  const passwords = getPasswords();
  passwords[data.email] = data.password;
  savePasswords(passwords);
  return { user: newUser };
}

export function updateUserData(id: string, updates: Partial<User>): User | null {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function getAllStaff(): User[] {
  return getUsers().filter((u) => u.role === "admin" || u.role === "staff");
}

export function getAllGuests(): User[] {
  return getUsers().filter((u) => u.role === "guest");
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getScheduleForUser(userId: string): ScheduleEntry[] {
  return MOCK_SCHEDULES[userId] ?? [];
}

export function getBookingsForGuest(userId: string): BookingRecord[] {
  return MOCK_GUEST_BOOKINGS[userId] ?? [];
}

export function computeWageSummary(userId: string) {
  const user = getUserById(userId);
  const schedule = getScheduleForUser(userId);
  if (!user || !user.hourlyRate) return null;

  const regularHours = schedule.reduce((sum, s) => sum + s.hours, 0);
  const overtimeHours = schedule.reduce((sum, s) => sum + (s.overtime ?? 0), 0);
  const regularPay = regularHours * user.hourlyRate;
  const overtimePay = overtimeHours * user.hourlyRate * 1.5;

  return {
    regularHours,
    overtimeHours,
    regularPay,
    overtimePay,
    totalPay: regularPay + overtimePay,
    hourlyRate: user.hourlyRate,
  };
}
