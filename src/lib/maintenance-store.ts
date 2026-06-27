export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  villa: string;
  status: "open" | "in_progress" | "resolved" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  assignee: string;
  createdBy: string;
  createdAt: string;
  dueDate: string;
  category: string;
}

const STORAGE_KEY = "av_maintenance_tickets";

const DEFAULT_TICKETS: MaintenanceTicket[] = [
  { id: "MT-001", title: "Pool pump replacement", description: "The main pool pump is making unusual noises and losing pressure. Needs replacement before it fails completely.", villa: "Villa Harmony", status: "overdue", priority: "critical", assignee: "Putu Agung", createdBy: "system", createdAt: "2026-06-18", dueDate: "2026-06-23", category: "Pool" },
  { id: "MT-002", title: "AC unit servicing - Master bedroom", description: "AC unit in the master bedroom is not cooling efficiently. Needs filter cleaning and gas recharge.", villa: "Arka Villa", status: "in_progress", priority: "high", assignee: "Dewa Putra", createdBy: "Ketut Sastra", createdAt: "2026-06-22", dueDate: "2026-06-27", category: "HVAC" },
  { id: "MT-003", title: "Garden irrigation system leak", description: "Leak detected in the south garden irrigation line. Water pressure dropping in that zone.", villa: "Villa Tropicana", status: "open", priority: "medium", assignee: "Ketut Darma", createdBy: "Kadek Rina", createdAt: "2026-06-24", dueDate: "2026-06-30", category: "Garden" },
  { id: "MT-004", title: "Bathroom faucet replacement - Room 3", description: "Guest reported dripping faucet in Room 3 bathroom. Washer replacement needed.", villa: "Villa Serenity", status: "resolved", priority: "medium", assignee: "Putu Agung", createdBy: "Wayan Sudarsana", createdAt: "2026-06-20", dueDate: "2026-06-24", category: "Plumbing" },
  { id: "MT-005", title: "WiFi router firmware update", description: "Scheduled firmware update for all WiFi access points to fix connectivity issues.", villa: "Villa Coral", status: "resolved", priority: "low", assignee: "I Made Bagus", createdBy: "system", createdAt: "2026-06-21", dueDate: "2026-06-25", category: "IT" },
  { id: "MT-006", title: "Roof tile repair after storm", description: "Several roof tiles displaced during last week's storm. Water ingress risk if not fixed.", villa: "Villa Jade", status: "open", priority: "high", assignee: "Dewa Putra", createdBy: "Putu Agung", createdAt: "2026-06-25", dueDate: "2026-06-28", category: "Structural" },
  { id: "MT-007", title: "Hot water heater inspection", description: "Annual inspection of the solar hot water system. Check for sediment buildup.", villa: "Arka Villa", status: "in_progress", priority: "medium", assignee: "Putu Agung", createdBy: "system", createdAt: "2026-06-23", dueDate: "2026-06-28", category: "Plumbing" },
  { id: "MT-008", title: "Outdoor lighting replacement - pathway", description: "3 pathway LED lights burnt out. Replace with matching warm white 3000K fixtures.", villa: "Villa Tropicana", status: "open", priority: "low", assignee: "Ketut Darma", createdBy: "Gede Surya", createdAt: "2026-06-25", dueDate: "2026-07-02", category: "Electrical" },
  { id: "MT-009", title: "Termite inspection - annual", description: "Annual termite inspection due. External pest control company to be scheduled.", villa: "Villa Harmony", status: "open", priority: "high", assignee: "External Vendor", createdBy: "system", createdAt: "2026-06-26", dueDate: "2026-06-30", category: "Pest Control" },
  { id: "MT-010", title: "Pool chemical rebalancing", description: "Weekly pool chemical check. pH levels slightly high, needs adjustment.", villa: "Villa Serenity", status: "resolved", priority: "low", assignee: "I Made Bagus", createdBy: "system", createdAt: "2026-06-22", dueDate: "2026-06-23", category: "Pool" },
];

export function getTickets(): MaintenanceTicket[] {
  if (typeof window === "undefined") return DEFAULT_TICKETS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TICKETS));
      return DEFAULT_TICKETS;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_TICKETS;
  }
}

export function saveTickets(tickets: MaintenanceTicket[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function updateTicketStatus(id: string, status: MaintenanceTicket["status"]): MaintenanceTicket[] {
  const tickets = getTickets();
  const updated = tickets.map((t) => (t.id === id ? { ...t, status } : t));
  saveTickets(updated);
  return updated;
}

export function addTicket(ticket: Omit<MaintenanceTicket, "id" | "createdAt">): MaintenanceTicket[] {
  const tickets = getTickets();
  const newTicket: MaintenanceTicket = {
    ...ticket,
    id: `MT-${String(tickets.length + 1).padStart(3, "0")}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  const updated = [newTicket, ...tickets];
  saveTickets(updated);
  return updated;
}
