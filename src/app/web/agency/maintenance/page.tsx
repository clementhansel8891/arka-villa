"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Building2,
  User,
  X,
  Calendar,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTickets,
  updateTicketStatus,
  type MaintenanceTicket,
} from "@/lib/maintenance-store";

/**
 * Agency Maintenance Page — Track and manage maintenance tickets across villas.
 */

type TicketStatus = MaintenanceTicket["status"];
type Priority = MaintenanceTicket["priority"];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  in_progress: { label: "In Progress", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  resolved: { label: "Resolved", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  overdue: { label: "Overdue", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
};

const PRIORITY_CONFIG: Record<Priority, { color: string }> = {
  low: { color: "text-white/40" },
  medium: { color: "text-yellow-400" },
  high: { color: "text-orange-400" },
  critical: { color: "text-red-400" },
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  useEffect(() => {
    setTickets(getTickets());
  }, []);

  const filtered = tickets.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.villa.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    overdue: tickets.filter((t) => t.status === "overdue").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  function handleStatusChange(id: string, status: TicketStatus) {
    const updated = updateTicketStatus(id, status);
    setTickets(updated);
    const updatedTicket = updated.find((t) => t.id === id);
    if (updatedTicket) setSelectedTicket(updatedTicket);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white font-bold">Maintenance</h1>
          <p className="text-sm text-white/40 mt-1">Track repairs, inspections, and preventive maintenance across all properties</p>
        </div>
        <button className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-4 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors">
          <Plus size={14} /> New Ticket
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open", value: stats.open, icon: Clock, color: "text-blue-400" },
          { label: "In Progress", value: stats.inProgress, icon: Wrench, color: "text-yellow-400" },
          { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-red-400" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-400" },
        ].map((stat) => (
          <div key={stat.label} className="border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className={stat.color} />
              <span className="text-white/30 text-[10px] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-serif text-white font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "open", "in_progress", "overdue", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-2 text-xs uppercase tracking-wider font-bold rounded-lg transition-colors",
                filter === s ? "bg-heritage-gold/10 text-heritage-gold border border-heritage-gold/30" : "text-white/40 hover:text-white border border-white/10"
              )}
            >
              {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">No tickets match your filters.</div>
        ) : (
          filtered.map((ticket, i) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedTicket(ticket)}
              className="border border-white/10 rounded-xl p-5 hover:border-heritage-gold/20 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white/20 text-xs font-mono">{ticket.id}</span>
                    <h3 className="text-white font-medium">{ticket.title}</h3>
                    <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded", STATUS_CONFIG[ticket.status].bg)}>
                      {STATUS_CONFIG[ticket.status].label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-white/30 text-xs">
                    <span className="flex items-center gap-1"><Building2 size={12} /> {ticket.villa}</span>
                    <span className="flex items-center gap-1"><User size={12} /> {ticket.assignee}</span>
                    <span>{ticket.category}</span>
                    <span className={PRIORITY_CONFIG[ticket.priority].color}>● {ticket.priority}</span>
                    <span>Due: {new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-heritage-charcoal border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <span className="text-white/30 text-xs font-mono">{selectedTicket.id}</span>
                  <h2 className="text-white font-serif text-xl mt-1">{selectedTicket.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Status & Priority */}
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] uppercase tracking-wider font-bold px-3 py-1 border rounded", STATUS_CONFIG[selectedTicket.status].bg)}>
                    {STATUS_CONFIG[selectedTicket.status].label}
                  </span>
                  <span className={cn("text-xs font-bold", PRIORITY_CONFIG[selectedTicket.priority].color)}>
                    ● {selectedTicket.priority} priority
                  </span>
                </div>

                {/* Description */}
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white/80 text-sm leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1"><Building2 size={10} /> Villa</p>
                    <p className="text-white text-sm">{selectedTicket.villa}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1"><User size={10} /> Assignee</p>
                    <p className="text-white text-sm">{selectedTicket.assignee}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1"><Tag size={10} /> Category</p>
                    <p className="text-white text-sm">{selectedTicket.category}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={10} /> Created</p>
                    <p className="text-white text-sm">{new Date(selectedTicket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={10} /> Due Date</p>
                    <p className="text-white text-sm">{new Date(selectedTicket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Created By</p>
                    <p className="text-white text-sm">{selectedTicket.createdBy}</p>
                  </div>
                </div>

                {/* Status Change Buttons */}
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-3">Change Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(["open", "in_progress", "resolved"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(selectedTicket.id, status)}
                        disabled={selectedTicket.status === status}
                        className={cn(
                          "px-4 py-2 text-xs uppercase tracking-wider font-bold rounded-lg border transition-colors",
                          selectedTicket.status === status
                            ? "opacity-40 cursor-not-allowed border-white/10 text-white/30"
                            : cn(STATUS_CONFIG[status].bg, STATUS_CONFIG[status].color, "hover:opacity-80")
                        )}
                      >
                        {STATUS_CONFIG[status].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/10">
                <button
                  onClick={() => setSelectedTicket(null)}
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
