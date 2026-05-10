"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { registerGuest } from "@/lib/auth";
import Link from "next/link";

type Tab = "login" | "register";

const inputClass =
  "w-full bg-white/5 border border-white/10 text-white px-4 py-3.5 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors duration-200 text-sm";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  return (
    <div className="min-h-screen bg-heritage-charcoal flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 heritage-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-heritage-charcoal via-heritage-charcoal to-heritage-green/20 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-white/30 text-xs uppercase tracking-widest hover:text-white/60 transition-colors mb-8">
            <ArrowLeft size={12} />
            Back to site
          </Link>
          <h1 className="text-4xl font-serif text-white mt-4">Arka Villa</h1>
          <p className="text-heritage-gold text-xs uppercase tracking-[0.3em] mt-2">Ubud, Bali</p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex border border-white/10 mb-8"
        >
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs uppercase tracking-widest transition-all duration-300 ${
                tab === t
                  ? "bg-heritage-gold text-heritage-charcoal font-bold"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </motion.div>

        {/* Forms */}
        <AnimatePresence mode="wait">
          {tab === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <LoginForm />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <GuestRegisterForm onSuccess={() => setTab("login")} />
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-white/20 text-xs mt-8">
          Staff access is granted by the administration team.
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await login(email, password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    // Get fresh session to determine role
    const session = localStorage.getItem("hh_session");
    const user = session ? JSON.parse(session) : null;
    if (user?.role === "guest") {
      router.push("/profile");
    } else {
      router.push("/admin");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">
          Email Address
        </label>
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          autoComplete="email"
        />
      </div>
      <div>
        <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">
          Password
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-12`}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 px-4 py-3"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors duration-300 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-heritage-charcoal border-t-transparent rounded-full animate-spin" />
        ) : (
          "Sign In"
        )}
      </button>

      {/* Demo credentials */}
      <div className="border border-white/5 p-4 space-y-2 mt-4">
        <p className="text-white/20 text-[9px] uppercase tracking-widest mb-3">Demo Accounts</p>
        {[
          { label: "Admin", email: "admin@heritagehaven.com", pw: "admin123" },
          { label: "Staff", email: "staff@heritagehaven.com", pw: "staff123" },
          { label: "Guest", email: "guest@example.com", pw: "guest123" },
        ].map((d) => (
          <button
            key={d.label}
            type="button"
            onClick={() => { setEmail(d.email); setPassword(d.pw); }}
            className="w-full text-left text-xs text-white/30 hover:text-white/60 transition-colors flex justify-between px-2 py-1 hover:bg-white/3"
          >
            <span className="text-heritage-gold/60">{d.label}</span>
            <span>{d.email}</span>
          </button>
        ))}
      </div>
    </form>
  );
}

function GuestRegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", nationality: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const { error: err } = registerGuest({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      nationality: form.nationality,
    });
    setLoading(false);
    if (err) { setError(err); return; }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Full Name *</label>
          <input type="text" required placeholder="Aria Santoso" value={form.name} onChange={set("name")} className={inputClass} />
        </div>
        <div>
          <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Nationality</label>
          <input type="text" placeholder="e.g. Indonesian" value={form.nationality} onChange={set("nationality")} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Email *</label>
        <input type="email" required placeholder="aria@example.com" value={form.email} onChange={set("email")} className={inputClass} />
      </div>
      <div>
        <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Phone / WhatsApp</label>
        <input type="tel" placeholder="+62 812 0000 0000" value={form.phone} onChange={set("phone")} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Password *</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} required placeholder="Min. 6 chars" value={form.password} onChange={set("password")} className={`${inputClass} pr-10`} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Confirm *</label>
          <input type={showPw ? "text" : "password"} required placeholder="Repeat" value={form.confirmPassword} onChange={set("confirmPassword")} className={inputClass} />
        </div>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 px-4 py-3">
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <span className="w-4 h-4 border-2 border-heritage-charcoal border-t-transparent rounded-full animate-spin" /> : "Create Guest Account"}
      </button>
    </form>
  );
}
