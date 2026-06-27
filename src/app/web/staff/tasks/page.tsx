"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo,
  Plus,
  X,
  Clock,
  CheckCircle2,
  Play,
  AlertTriangle,
  Building2,
  Tag,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  getTickets,
  saveTickets,
  addTicket,
  updateTicketStatus,
  type MaintenanceTicket,
} from "@/lib/maintenance-store";

/**
 * Staff Portal — Tasks Page
 * View and manage maintenance/task requests assigned to logged-in staff.
 */

const STATUS_CONFIG = {
  open: { label: "Pending", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  in_progress: { label: "In Progress", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  resolved: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  overdue: { label: "Overdue", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
};

const PRIORITY_CONFIG = {
  low: { color: "text-white/40" },
  medium: { color: "text-yellow-400" },
  high: { color: "text-orange-400" },
  critical: { color: "text-red-400" },
};

export default function StaffTasksPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "overdue">("all");

  useEffect(() => {
    setTickets(getTickets());
  }, []);

  // Filter tickets assigned to this staff member (or show all for admins)
  const myTickets = tickets.filter((t) => {
    const nameMatch = user?.name && t.assignee.toLowerCase().includes(user.name.split(" ")[0].toLowerCase());
    const isAdmin = user?.role === "admin";
    return nameMatch || isAdmin;
  });

  const filteredTickets = myTickets.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  function handleStart(id: string) {
    const updated = updateTicketStatus(id, "in_progress");
    setTickets(updated);
    const t = updated.find((x) => x.id === id);
    if (t && selectedTicket?.id === id) setSelectedTicket(t);
  }

  function handleComplete(id: string) {
    const updated = updateTicketStatus(id, "resolved");
    setTickets(updated);
    const t = updated.find((x) => x.id === id);
    if (t && selectedTicket?.id === id) setSelectedTicket(t);
  }

  function handleCreateTicket(data: { title: string; description: string; villa: string; priority: MaintenanceTicket["priority"]; category: string }) {
    const updated = addTicket({
      ...data,
      status: "open",
      assignee: user?.name || "Unassigned",
      createdBy: user?.name || "Staff",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    });
    setTickets(updated);
    setShowCreateForm(false);
  }

  const stats = {
    pending: myTickets.filter((t) => t.status === "open").length,
    inProgress: myTickets.filter((t) => t.status === "in_progress").length,
    completed: myTickets.filter((t) => t.status === "resolved").length,
    overdue: myTickets.filter((t) => t.status === "overdue").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white font-bold">My Tasks</h1>
          <p className="text-sm text-white/40 mt-1">Maintenance requests and assignments</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-4 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
        >
          <Plus size={14} /> Create Request
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-blue-400" },
          { label: "In Progress", value: stats.inProgress, icon: Play, color: "text-yellow-400" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-red-400" },
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
      <div className="flex gap-2 overflow-x-auto">
        {(["all", "open", "in_progress", "overdue", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-2 text-xs uppercase tracking-wider font-bold rounded-lg transition-colors whitespace-nowrap",
              filter === s ? "bg-heritage-gold/10 text-heritage-gold border border-heritage-gold/30" : "text-white/40 hover:text-white border border-white/10"
            )}
          >
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s === "open" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">No tasks found.</div>
        ) : (
          filteredTickets.map((ticket, i) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedTicket(ticket)}
              className="border border-white/10 rounded-xl p-4 hover:border-heritage-gold/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white/20 text-xs font-mono">{ticket.id}</span>
                    <h3 className="text-white font-medium text-sm">{ticket.title}</h3>
                    <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded", STATUS_CONFIG[ticket.status].bg)}>
                      {STATUS_CONFIG[ticket.status].label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-white/30 text-xs">
                    <span className="flex items-center gap-1"><Building2 size={11} /> {ticket.villa}</span>
                    <span>{ticket.category}</span>
                    <span className={PRIORITY_CONFIG[ticket.priority].color}>● {ticket.priority}</span>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {(ticket.status === "open" || ticket.status === "overdue") && (
                    <button
                      onClick={() => handleStart(ticket.id)}
                      className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-lg hover:bg-yellow-400/20 transition-colors"
                    >
                      Start
                    </button>
                  )}
                  {ticket.status === "in_progress" && (
                    <button
                      onClick={() => handleComplete(ticket.id)}
                      className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-lg hover:bg-emerald-400/20 transition-colors"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Task Detail Modal */}
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
              onClick={(e) => e.stopPropagation()}
              className="bg-heritage-charcoal border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <span className="text-white/30 text-xs font-mono">{selectedTicket.id}</span>
                  <h2 className="text-white font-serif text-lg mt-1">{selectedTicket.title}</h2>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-2 text-white/40 hover:text-white rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] uppercase tracking-wider font-bold px-3 py-1 border rounded", STATUS_CONFIG[selectedTicket.status].bg)}>
                    {STATUS_CONFIG[selectedTicket.status].label}
                  </span>
                  <span className={cn("text-xs font-bold", PRIORITY_CONFIG[selectedTicket.priority].color)}>
                    ● {selectedTicket.priority}
                  </span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{selectedTicket.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Villa</p><p className="text-white">{selectedTicket.villa}</p></div>
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Category</p><p className="text-white">{selectedTicket.category}</p></div>
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Due Date</p><p className="text-white">{selectedTicket.dueDate}</p></div>
                  <div><p className="text-white/30 text-[10px] uppercase tracking-wider">Created</p><p className="text-white">{selectedTicket.createdAt}</p></div>
                </div>
                <div className="flex gap-2 pt-2">
                  {(selectedTicket.status === "open" || selectedTicket.status === "overdue") && (
                    <button onClick={() => handleStart(selectedTicket.id)} className="flex-1 py-2.5 text-xs uppercase tracking-widest font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-lg hover:bg-yellow-400/20 transition-colors">
                      Start Task
                    </button>
                  )}
                  {selectedTicket.status === "in_progress" && (
                    <button onClick={() => handleComplete(selectedTicket.id)} className="flex-1 py-2.5 text-xs uppercase tracking-widest font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-lg hover:bg-emerald-400/20 transition-colors">
                      Mark Complete
                    </button>
                  )}
                  <button onClick={() => setSelectedTicket(null)} className="flex-1 py-2.5 text-xs uppercase tracking-widest font-bold text-white/60 border border-white/10 rounded-lg hover:text-white hover:border-white/30 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Request Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-heritage-charcoal border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <CreateRequestForm onSubmit={handleCreateTicket} onCancel={() => setShowCreateForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateRequestForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string; description: string; villa: string; priority: MaintenanceTicket["priority"]; category: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [villa, setVilla] = useState("Arka Villa");
  const [priority, setPriority] = useState<MaintenanceTicket["priority"]>("medium");
  const [category, setCategory] = useState("General");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, villa, priority, category });
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-serif text-lg">New Maintenance Request</h2>
        <button type="button" onClick={onCancel} className="p-2 text-white/40 hover:text-white rounded-lg">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30" placeholder="Brief description of the issue" />
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30 resize-none h-20" placeholder="Detailed description..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Villa</label>
          <select value={villa} onChange={(e) => setVilla(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50">
            <option value="Arka Villa">Arka Villa</option>
            <option value="Villa Harmony">Villa Harmony</option>
            <option value="Villa Tropicana">Villa Tropicana</option>
            <option value="Villa Serenity">Villa Serenity</option>
            <option value="Villa Coral">Villa Coral</option>
            <option value="Villa Jade">Villa Jade</option>
          </select>
        </div>
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as MaintenanceTicket["priority"])} className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50">
          <option value="General">General</option>
          <option value="Plumbing">Plumbing</option>
          <option value="Electrical">Electrical</option>
          <option value="HVAC">HVAC</option>
          <option value="Pool">Pool</option>
          <option value="Garden">Garden</option>
          <option value="Structural">Structural</option>
          <option value="IT">IT</option>
          <option value="Pest Control">Pest Control</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-heritage-gold text-heritage-charcoal py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors rounded-lg">
          Submit Request
        </button>
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-xs uppercase tracking-widest font-bold text-white/60 border border-white/10 rounded-lg hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
