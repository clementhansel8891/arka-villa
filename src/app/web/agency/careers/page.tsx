"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Briefcase,
  Users,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Mail,
  Phone,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";

/**
 * Agency Dashboard — Careers Management
 * Manage job postings, view/filter applications, and track hiring pipeline.
 * Fetches real applications from /api/v1/careers/applications.
 * CV files can be downloaded from /uploads/cv/[filename].
 */

type JobStatus = "active" | "paused" | "closed";
type ApplicationStatus = "new" | "reviewed" | "shortlisted" | "interviewed" | "hired" | "rejected";

interface JobPost {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: JobStatus;
  applicationsCount: number;
  postedAt: string;
}

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  name: string;
  email: string;
  phone: string;
  linkedIn: string;
  coverLetter: string;
  cvFilename: string;
  cvOriginalName: string;
  cvSize: number;
  status: ApplicationStatus;
  appliedAt: string;
}

// Mock job posts (in production from DB)
const INITIAL_JOBS: JobPost[] = [
  { id: "1", title: "Villa Operations Manager", department: "Operations", location: "Bali", type: "Full-time", status: "active", applicationsCount: 0, postedAt: "2026-06-15" },
  { id: "2", title: "Guest Experience Specialist", department: "Guest Relations", location: "Bali", type: "Full-time", status: "active", applicationsCount: 0, postedAt: "2026-06-10" },
  { id: "3", title: "Digital Marketing Specialist", department: "Marketing", location: "Remote", type: "Full-time", status: "active", applicationsCount: 0, postedAt: "2026-06-08" },
  { id: "4", title: "Villa Housekeeper", department: "Housekeeping", location: "Ubud", type: "Full-time", status: "active", applicationsCount: 0, postedAt: "2026-06-20" },
  { id: "5", title: "Pool & Garden Technician", department: "Maintenance", location: "Bali", type: "Contract", status: "paused", applicationsCount: 0, postedAt: "2026-06-18" },
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-400/20",
  reviewed: "bg-yellow-500/10 text-yellow-400 border-yellow-400/20",
  shortlisted: "bg-purple-500/10 text-purple-400 border-purple-400/20",
  interviewed: "bg-orange-500/10 text-orange-400 border-orange-400/20",
  hired: "bg-green-500/10 text-green-400 border-green-400/20",
  rejected: "bg-red-500/10 text-red-400 border-red-400/20",
};

const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  active: "text-green-400",
  paused: "text-yellow-400",
  closed: "text-white/30",
};

type Tab = "jobs" | "applications";

export default function AgencyCareersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("applications");
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showNewJobForm, setShowNewJobForm] = useState(false);

  // Fetch applications from API
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/careers/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);

        // Update job application counts
        const counts: Record<string, number> = {};
        for (const app of data.applications || []) {
          counts[app.jobId] = (counts[app.jobId] || 0) + 1;
        }
        setJobs((prev) =>
          prev.map((j) => ({ ...j, applicationsCount: counts[j.id] || 0 }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Filtered data
  const filteredJobs = jobs.filter((j) => {
    if (searchQuery && !j.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus !== "all" && j.status !== filterStatus) return false;
    return true;
  });

  const filteredApplications = applications.filter((a) => {
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const toggleJobStatus = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: j.status === "active" ? "paused" : "active" }
          : j
      )
    );
  };

  const updateApplicationStatus = (appId: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
    );
    setSelectedApplication((prev) => (prev?.id === appId ? { ...prev, status: newStatus } : prev));
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stats = {
    totalJobs: jobs.filter((j) => j.status === "active").length,
    totalApplications: applications.length,
    newApplications: applications.filter((a) => a.status === "new").length,
    hired: applications.filter((a) => a.status === "hired").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white">Careers Management</h1>
          <p className="text-white/40 text-sm mt-1">Manage job postings and review applications</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchApplications}
            className="flex items-center gap-2 border border-white/10 text-white/50 px-3 py-2.5 text-xs hover:text-white hover:border-white/30 transition-colors"
            title="Refresh applications"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowNewJobForm(true)}
            className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-4 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
          >
            <Plus size={14} /> New Job Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Jobs", value: stats.totalJobs, icon: Briefcase },
          { label: "Total Applications", value: stats.totalApplications, icon: Users },
          { label: "New (Unreviewed)", value: stats.newApplications, icon: Clock },
          { label: "Hired", value: stats.hired, icon: CheckCircle },
        ].map((stat) => (
          <div key={stat.label} className="border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/30 mb-2">
              <stat.icon size={14} />
              <span className="text-[10px] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-serif text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-white/10 pb-0">
        {(["applications", "jobs"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchQuery(""); setFilterStatus("all"); }}
            className={`pb-3 text-sm uppercase tracking-widest font-bold transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "text-heritage-gold border-heritage-gold"
                : "text-white/40 border-transparent hover:text-white"
            }`}
          >
            {tab === "jobs" ? "Job Posts" : `Applications (${applications.length})`}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder={activeTab === "jobs" ? "Search job titles..." : "Search by name or job..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-heritage-gold/50"
        >
          {activeTab === "jobs" ? (
            <>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </>
          ) : (
            <>
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interviewed">Interviewed</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </>
          )}
        </select>
      </div>

      {/* Content */}
      {activeTab === "jobs" ? (
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <p className="text-white/30 text-center py-12 text-sm">No jobs match your search.</p>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className="border border-white/10 p-5 flex items-center justify-between gap-4 hover:border-heritage-gold/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-medium truncate">{job.title}</h3>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${JOB_STATUS_COLORS[job.status]}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-white/30 text-xs">
                    <span>{job.department}</span>
                    <span>{job.location}</span>
                    <span>{job.type}</span>
                    <span>{job.applicationsCount} application{job.applicationsCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleJobStatus(job.id)}
                    className="p-2 text-white/30 hover:text-heritage-gold transition-colors"
                    title={job.status === "active" ? "Pause listing" : "Activate listing"}
                  >
                    {job.status === "active" ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button className="p-2 text-white/30 hover:text-white transition-colors" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button className="p-2 text-white/30 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/30">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading applications...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/30 text-sm mb-2">No applications yet.</p>
              <p className="text-white/20 text-xs">Applications submitted through the careers page will appear here.</p>
            </div>
          ) : (
            filteredApplications.map((app) => (
              <div
                key={app.id}
                className="border border-white/10 p-5 flex items-center justify-between gap-4 hover:border-heritage-gold/20 transition-colors cursor-pointer"
                onClick={() => setSelectedApplication(app)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-medium">{app.name}</h3>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border ${STATUS_COLORS[app.status]}`}>
                      {app.status}
                    </span>
                    {app.cvFilename && (
                      <span className="flex items-center gap-1 text-white/20 text-[10px]">
                        <FileText size={10} /> CV attached
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-white/30 text-xs">
                    <span>For: {app.jobTitle}</span>
                    <span>Applied {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <Eye size={16} className="text-white/20 shrink-0" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Application Detail Modal */}
      <AnimatePresence>
        {selectedApplication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedApplication(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-heritage-charcoal border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-serif text-white">{selectedApplication.name}</h2>
                  <p className="text-white/40 text-sm mt-1">Applied for: <span className="text-heritage-gold">{selectedApplication.jobTitle}</span></p>
                  <p className="text-white/20 text-xs mt-1">
                    {new Date(selectedApplication.appliedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button onClick={() => setSelectedApplication(null)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <a href={`mailto:${selectedApplication.email}`} className="flex items-center gap-2 text-white/50 hover:text-heritage-gold transition-colors">
                  <Mail size={14} /> {selectedApplication.email}
                </a>
                {selectedApplication.phone && (
                  <a href={`tel:${selectedApplication.phone}`} className="flex items-center gap-2 text-white/50 hover:text-heritage-gold transition-colors">
                    <Phone size={14} /> {selectedApplication.phone}
                  </a>
                )}
                {selectedApplication.linkedIn && (
                  <a href={selectedApplication.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/50 hover:text-heritage-gold transition-colors">
                    <ExternalLink size={14} /> LinkedIn
                  </a>
                )}
              </div>

              {/* CV Download */}
              {selectedApplication.cvFilename && (
                <div className="mb-6 p-4 border border-heritage-gold/20 bg-heritage-gold/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-heritage-gold" />
                    <div>
                      <p className="text-white text-sm font-medium">{selectedApplication.cvOriginalName}</p>
                      <p className="text-white/30 text-xs">{formatFileSize(selectedApplication.cvSize)}</p>
                    </div>
                  </div>
                  <a
                    href={`/uploads/cv/${selectedApplication.cvFilename}`}
                    download={selectedApplication.cvOriginalName}
                    className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
                  >
                    <Download size={14} /> Download CV
                  </a>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplication.coverLetter && (
                <div className="mb-6">
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2">Cover Letter</h4>
                  <p className="text-white/50 text-sm leading-relaxed bg-white/[0.02] border border-white/5 p-4 whitespace-pre-wrap">
                    {selectedApplication.coverLetter}
                  </p>
                </div>
              )}

              {/* Status Pipeline */}
              <div className="mb-6">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {(["new", "reviewed", "shortlisted", "interviewed", "hired", "rejected"] as ApplicationStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateApplicationStatus(selectedApplication.id, status)}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold border transition-all ${
                        selectedApplication.status === status
                          ? STATUS_COLORS[status]
                          : "border-white/10 text-white/30 hover:text-white/60"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-white/10 pt-6">
                <a
                  href={`mailto:${selectedApplication.email}?subject=Re: Your application for ${selectedApplication.jobTitle} at Arka Villa`}
                  className="flex-1 flex items-center justify-center gap-2 border border-heritage-gold/30 text-heritage-gold py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-heritage-gold/10 transition-colors"
                >
                  <Mail size={14} /> Email Candidate
                </a>
                {selectedApplication.cvFilename && (
                  <a
                    href={`/uploads/cv/${selectedApplication.cvFilename}`}
                    download={selectedApplication.cvOriginalName}
                    className="flex items-center justify-center gap-2 border border-white/10 text-white/50 px-4 py-2.5 text-xs uppercase tracking-widest hover:text-white hover:border-white/30 transition-colors"
                  >
                    <Download size={14} /> CV
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Job Form Modal */}
      <AnimatePresence>
        {showNewJobForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowNewJobForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-heritage-charcoal border border-white/10 w-full max-w-lg max-h-[80vh] overflow-y-auto p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-serif text-white">Create Job Post</h2>
                <button onClick={() => setShowNewJobForm(false)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const fd = new FormData(form);
                  const newJob: JobPost = {
                    id: String(Date.now()),
                    title: fd.get("title") as string,
                    department: fd.get("department") as string,
                    location: fd.get("location") as string,
                    type: fd.get("type") as string,
                    status: "active",
                    applicationsCount: 0,
                    postedAt: new Date().toISOString().split("T")[0],
                  };
                  setJobs((prev) => [newJob, ...prev]);
                  setShowNewJobForm(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Job Title *</label>
                  <input name="title" required className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30" placeholder="e.g. Senior Villa Manager" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Department *</label>
                    <input name="department" required className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30" placeholder="e.g. Operations" />
                  </div>
                  <div>
                    <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Location *</label>
                    <input name="location" required className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30" placeholder="e.g. Bali, Indonesia" />
                  </div>
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Employment Type *</label>
                  <select name="type" required className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Description</label>
                  <textarea name="description" rows={3} className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30 resize-none" placeholder="Job description..." />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Requirements (one per line)</label>
                  <textarea name="requirements" rows={3} className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30 resize-none" placeholder="3+ years experience&#10;Fluent in English&#10;..." />
                </div>
                <button
                  type="submit"
                  className="w-full bg-heritage-gold text-heritage-charcoal py-3 text-xs uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors"
                >
                  Publish Job Post
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
