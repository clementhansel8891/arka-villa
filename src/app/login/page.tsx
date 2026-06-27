"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { registerGuest, getDashboardRoute, resetAuthStore } from "@/lib/auth";
import Link from "next/link";
import { Suspense } from "react";

type Tab = "login" | "register";

const inputClass =
  "w-full bg-white/5 border border-white/10 text-white px-4 py-3.5 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors duration-200 text-sm";

function LoginPageContent() {
  const [tab, setTab] = useState<Tab>("login");
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  return (
    <div className="min-h-screen bg-heritage-charcoal flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 heritage-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-heritage-charcoal via-heritage-charcoal to-heritage-green/20 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/30 text-xs uppercase tracking-widest hover:text-white/60 transition-colors mb-8">
            <ArrowLeft size={12} /> Back to site
          </Link>
          <h1 className="text-4xl font-serif text-white mt-4">Arka Villa</h1>
          <p className="text-heritage-gold text-xs uppercase tracking-[0.3em] mt-2">Management Platform</p>
        </motion.div>

        {errorParam === "unauthorized" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 px-4 py-3 mb-4 text-center">
            You don&apos;t have permission to access that page.
          </motion.p>
        )}

        {/* Tab Switcher */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex border border-white/10 mb-8">
          {(["login", "register"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs uppercase tracking-widest transition-all duration-300 ${tab === t ? "bg-heritage-gold text-heritage-charcoal font-bold" : "text-white/40 hover:text-white/70"}`}>
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "login" ? (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
              <LoginForm />
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <GuestRegisterForm onSuccess={() => setTab("login")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-heritage-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Reset auth store to ensure new accounts are available
    resetAuthStore();

    const { error: err } = await login(email, password);
    setLoading(false);
    if (err) { setError(err); return; }

    // Check if there's a redirect target
    const from = searchParams.get("from");
    if (from) {
      router.push(from);
      return;
    }

    // Route based on role
    const session = localStorage.getItem("hh_session");
    const user = session ? JSON.parse(session) : null;
    if (user?.role) {
      router.push(getDashboardRoute(user.role));
    } else {
      router.push("/");
    }
  };

  const fillCredentials = (demoEmail: string, demoPw: string) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Email Address</label>
        <input type="email" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" />
      </div>
      <div>
        <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Password</label>
        <div className="relative">
          <input type={showPw ? "text" : "password"} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-12`} autoComplete="current-password" />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 px-4 py-3">{error}</motion.p>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors duration-300 disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
        {loading ? <span className="w-4 h-4 border-2 border-heritage-charcoal border-t-transparent rounded-full animate-spin" /> : "Sign In"}
      </button>

      {/* Demo accounts */}
      <div className="border border-white/5 p-4 space-y-1 mt-4">
        <p className="text-white/20 text-[9px] uppercase tracking-widest mb-3">Demo Accounts — click to fill</p>

        <p className="text-white/10 text-[8px] uppercase tracking-wider mt-2 mb-1">Agency Admin → /web/agency</p>
        <DemoRow label="CEO" email="clement@arkavilla.com" pw="admin123" onClick={fillCredentials} />
        <DemoRow label="Ops Dir" email="ayu@arkavilla.com" pw="admin123" onClick={fillCredentials} />

        <p className="text-white/10 text-[8px] uppercase tracking-wider mt-3 mb-1">Staff → /web/staff</p>
        <DemoRow label="Butler" email="ketut@arkavilla.com" pw="staff123" onClick={fillCredentials} />
        <DemoRow label="Marketing" email="kadek@arkavilla.com" pw="staff123" onClick={fillCredentials} />

        <p className="text-white/10 text-[8px] uppercase tracking-wider mt-3 mb-1">Villa Owner → /web/owner</p>
        <DemoRow label="Owner" email="robert@villaowner.com" pw="owner123" onClick={fillCredentials} />
        <DemoRow label="Owner" email="sarah@villaowner.com" pw="owner123" onClick={fillCredentials} />

        <p className="text-white/10 text-[8px] uppercase tracking-wider mt-3 mb-1">Guest → /profile</p>
        <DemoRow label="Guest" email="james@example.com" pw="guest123" onClick={fillCredentials} />
      </div>
    </form>
  );
}

function DemoRow({ label, email, pw, onClick }: { label: string; email: string; pw: string; onClick: (e: string, p: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(email, pw)}
      className="w-full text-left text-xs text-white/30 hover:text-white/60 transition-colors flex justify-between items-center px-2 py-1.5 hover:bg-white/5"
    >
      <span className="text-heritage-gold/60 w-16 shrink-0">{label}</span>
      <span className="flex-1 text-center truncate">{email}</span>
      <span className="text-white/15 shrink-0 ml-2">{pw}</span>
    </button>
  );
}

function GuestRegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "", nationality: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const { error: err } = registerGuest({ name: form.name, email: form.email, password: form.password, phone: form.phone, nationality: form.nationality });
    setLoading(false);
    if (err) { setError(err); return; }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Full Name *</label><input type="text" required placeholder="Aria Santoso" value={form.name} onChange={set("name")} className={inputClass} /></div>
        <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Nationality</label><input type="text" placeholder="e.g. Indonesian" value={form.nationality} onChange={set("nationality")} className={inputClass} /></div>
      </div>
      <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Email *</label><input type="email" required placeholder="aria@example.com" value={form.email} onChange={set("email")} className={inputClass} /></div>
      <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Phone / WhatsApp</label><input type="tel" placeholder="+62 812 0000 0000" value={form.phone} onChange={set("phone")} className={inputClass} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Password *</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} required placeholder="Min. 6 chars" value={form.password} onChange={set("password")} className={`${inputClass} pr-10`} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
        </div>
        <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Confirm *</label><input type={showPw ? "text" : "password"} required placeholder="Repeat" value={form.confirmPassword} onChange={set("confirmPassword")} className={inputClass} /></div>
      </div>
      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 px-4 py-3">{error}</motion.p>}
      <button type="submit" disabled={loading}
        className="w-full bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors duration-300 disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? <span className="w-4 h-4 border-2 border-heritage-charcoal border-t-transparent rounded-full animate-spin" /> : "Create Guest Account"}
      </button>
    </form>
  );
}
