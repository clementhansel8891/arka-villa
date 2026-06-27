"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Briefcase, Send, X, ChevronRight, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FileDropzone from "@/components/ui/FileDropzone";

/**
 * Public Careers Page — Displays current job openings and accepts applications.
 * Job data is static/mock here; in production it fetches from /api/v1/careers.
 * Applications are submitted to /api/v1/careers/applications with CV file upload.
 */

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  description: string;
  requirements: string[];
  postedAt: string;
}

const JOBS: JobPosting[] = [
  {
    id: "1",
    title: "Villa Operations Manager",
    department: "Operations",
    location: "Bali, Indonesia",
    type: "Full-time",
    description: "Oversee day-to-day operations across multiple luxury villas including housekeeping, maintenance, and guest satisfaction.",
    requirements: [
      "3+ years in hospitality or property management",
      "Fluent in English and Bahasa Indonesia",
      "Experience managing teams of 10+",
      "Knowledge of Bali hospitality market",
    ],
    postedAt: "2026-06-15",
  },
  {
    id: "2",
    title: "Guest Experience Specialist",
    department: "Guest Relations",
    location: "Bali, Indonesia",
    type: "Full-time",
    description: "Be the primary point of contact for guests before, during, and after their stay. Ensure world-class service at every touchpoint.",
    requirements: [
      "2+ years in guest relations or concierge",
      "Excellent English communication skills",
      "Proficiency with booking systems",
      "Passion for luxury hospitality",
    ],
    postedAt: "2026-06-10",
  },
  {
    id: "3",
    title: "Digital Marketing Specialist",
    department: "Marketing",
    location: "Remote / Bali",
    type: "Full-time",
    description: "Drive bookings through SEO, social media, paid ads, and content marketing. Manage our digital presence across all channels.",
    requirements: [
      "3+ years in digital marketing",
      "Experience with hospitality/travel industry",
      "Proficiency with Google Ads, Meta Ads",
      "Strong copywriting and visual storytelling",
    ],
    postedAt: "2026-06-08",
  },
  {
    id: "4",
    title: "Villa Housekeeper",
    department: "Housekeeping",
    location: "Ubud, Bali",
    type: "Full-time",
    description: "Maintain impeccable cleanliness and presentation standards in our luxury villas. Attention to detail is essential.",
    requirements: [
      "Prior housekeeping experience in hotel/villa",
      "High attention to detail",
      "Reliable and punctual",
      "Basic English proficiency",
    ],
    postedAt: "2026-06-20",
  },
  {
    id: "5",
    title: "Pool & Garden Technician",
    department: "Maintenance",
    location: "Bali, Indonesia",
    type: "Contract",
    description: "Maintain pool water quality, tropical gardens, and outdoor spaces across multiple villa properties.",
    requirements: [
      "Experience with pool maintenance",
      "Knowledge of tropical landscaping",
      "Ability to travel between properties",
      "Physical fitness required",
    ],
    postedAt: "2026-06-18",
  },
];

export default function CareersPage() {
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    setCvFile(file);
  }, []);

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob) return;

    setSubmitting(true);
    setSubmitError(null);

    const form = e.currentTarget;
    const formData = new FormData();

    // Add text fields
    formData.append("name", (form.elements.namedItem("name") as HTMLInputElement).value);
    formData.append("email", (form.elements.namedItem("email") as HTMLInputElement).value);
    formData.append("phone", (form.elements.namedItem("phone") as HTMLInputElement).value || "");
    formData.append("linkedIn", (form.elements.namedItem("linkedIn") as HTMLInputElement).value || "");
    formData.append("coverLetter", (form.elements.namedItem("coverLetter") as HTMLTextAreaElement).value || "");
    formData.append("jobId", selectedJob.id);
    formData.append("jobTitle", selectedJob.title);

    // Add CV file
    if (cvFile) {
      formData.append("cv", cvFile);
    }

    try {
      const res = await fetch("/api/v1/careers/applications", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit application.");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowApplyForm(false);
    setSubmitted(false);
    setSubmitError(null);
    setCvFile(null);
  };

  return (
    <main className="min-h-screen bg-heritage-charcoal">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold"
          >
            Join Our Team
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-serif text-white mt-4 mb-6"
          >
            Build Your Career
            <span className="block text-heritage-gold italic mt-2">in Luxury Hospitality</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            We&apos;re always looking for passionate people to join the Arka Villa team.
            Explore our open positions below.
          </motion.p>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-serif text-white">
              Open Positions <span className="text-heritage-gold ml-2 text-sm">({JOBS.length})</span>
            </h2>
          </div>

          <div className="space-y-4">
            {JOBS.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border border-white/10 hover:border-heritage-gold/30 p-6 transition-all cursor-pointer group"
                onClick={() => { setSelectedJob(job); resetForm(); }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-serif text-white group-hover:text-heritage-gold transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-white/40 text-sm mt-1">{job.department}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-white/30 text-xs">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={12} /> Posted {new Date(job.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-white/20 group-hover:text-heritage-gold transition-colors shrink-0 mt-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* No positions CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center border border-heritage-gold/10 p-10">
          <h3 className="text-xl font-serif text-white mb-3">Don&apos;t see your role?</h3>
          <p className="text-white/40 text-sm mb-6">
            We&apos;re always interested in talented people. Send us your CV and we&apos;ll keep you in mind for future openings.
          </p>
          <a
            href="mailto:careers@arka-villa.com"
            className="inline-flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-6 py-3 text-xs uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors"
          >
            <Send size={14} /> Send Your CV
          </a>
        </div>
      </section>

      <Footer />

      {/* Job Detail & Apply Modal */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => { setSelectedJob(null); resetForm(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-heritage-charcoal border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-serif text-white">{selectedJob.title}</h2>
                  <p className="text-heritage-gold text-sm mt-1">{selectedJob.department}</p>
                </div>
                <button
                  onClick={() => { setSelectedJob(null); resetForm(); }}
                  className="text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-wrap gap-4 mb-6 text-white/40 text-xs">
                <span className="flex items-center gap-1"><MapPin size={12} /> {selectedJob.location}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {selectedJob.type}</span>
              </div>

              <div className="mb-6">
                <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-2">About the Role</h4>
                <p className="text-white/50 text-sm leading-relaxed">{selectedJob.description}</p>
              </div>

              <div className="mb-8">
                <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-3">Requirements</h4>
                <ul className="space-y-2">
                  {selectedJob.requirements.map((req) => (
                    <li key={req} className="text-white/50 text-sm flex items-start gap-2">
                      <span className="text-heritage-gold mt-1">•</span> {req}
                    </li>
                  ))}
                </ul>
              </div>

              {!showApplyForm ? (
                <button
                  onClick={() => setShowApplyForm(true)}
                  className="w-full bg-heritage-gold text-heritage-charcoal py-3 text-xs uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors"
                >
                  Apply for This Position
                </button>
              ) : submitted ? (
                <div className="text-center py-8 border border-heritage-gold/20 bg-heritage-gold/5">
                  <p className="text-heritage-gold font-serif text-lg">Application Submitted!</p>
                  <p className="text-white/40 text-sm mt-2">Thank you for applying. We&apos;ll review your application and get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleApply} className="border-t border-white/10 pt-6 space-y-4">
                  <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-2">Apply Now</h4>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Full Name *</label>
                      <input
                        name="name"
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Email *</label>
                      <input
                        name="email"
                        type="email"
                        required
                        className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
                        placeholder="john@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Phone / WhatsApp</label>
                      <input
                        name="phone"
                        type="tel"
                        className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
                        placeholder="+62 812 3456 7890"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">LinkedIn / Portfolio</label>
                      <input
                        name="linkedIn"
                        type="url"
                        className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  </div>

                  {/* CV File Upload */}
                  <FileDropzone
                    onFileSelect={handleFileSelect}
                    label="Upload your CV / Resume *"
                    helpText="PDF or Word document, max 10MB"
                    accept=".pdf,.doc,.docx"
                    maxSize={10 * 1024 * 1024}
                  />

                  <div>
                    <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Cover Letter</label>
                    <textarea
                      name="coverLetter"
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30 resize-none"
                      placeholder="Tell us why you'd be great for this role..."
                    />
                  </div>

                  {submitError && (
                    <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 px-4 py-2">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-heritage-gold text-heritage-charcoal py-3 text-xs uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Submit Application
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
