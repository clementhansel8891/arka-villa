'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ChevronDown,
  Bell,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import FinancialReports from './FinancialReports';
import ExpenseApproval from './ExpenseApproval';
import ActivityTimeline from './ActivityTimeline';
import SatisfactionScores from './SatisfactionScores';
import { OWNER_VILLAS } from './mockData';
import type { SectionError } from './types';

interface OwnerFinancialsPageProps {
  variant: 'desktop' | 'mobile';
}

export default function OwnerFinancialsPage({ variant }: OwnerFinancialsPageProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [selectedVilla, setSelectedVilla] = useState(OWNER_VILLAS[0].id);
  const [villaDropdownOpen, setVillaDropdownOpen] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<SectionError[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSectionError = useCallback((section: string) => {
    return (message: string) => {
      setSectionErrors((prev) => {
        const existing = prev.find((e) => e.section === section);
        if (existing) return prev;
        return [...prev, { section, message }];
      });
    };
  }, []);

  useEffect(() => {
    setSectionErrors([]);
  }, [selectedVilla]);

  if (!user) return null;

  const currentVilla = OWNER_VILLAS.find((v) => v.id === selectedVilla) ?? OWNER_VILLAS[0];

  if (variant === 'mobile') {
    return (
      <div className="min-h-screen bg-[#0E0E0E] text-white font-sans pb-20">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 bg-[#0E0E0E]/95 backdrop-blur border-b border-white/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/m/web/owner')}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-heritage-gold font-serif text-lg">Financials</p>
                <p className="text-white/30 text-[10px] uppercase tracking-widest">
                  {currentVilla.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2 text-white/40 hover:text-white transition-colors">
                <Bell size={18} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 border-t border-white/5 pt-3"
              >
                <button
                  onClick={() => { router.push('/'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white/50 text-sm hover:text-white transition-colors"
                >
                  <Home size={14} /> Back to Site
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-red-400/60 text-sm hover:text-red-400 transition-colors"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Villa Selector - Mobile */}
        <div className="px-4 py-3">
          <div className="relative">
            <button
              onClick={() => setVillaDropdownOpen(!villaDropdownOpen)}
              className="w-full flex items-center justify-between p-3 bg-white/3 border border-white/5 text-white text-sm"
            >
              <span>{currentVilla.name} — {currentVilla.location}</span>
              <ChevronDown size={16} className={`text-heritage-gold transition-transform ${villaDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {villaDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 z-10 mt-1 bg-[#1A1A1A] border border-white/10 shadow-xl"
                >
                  {OWNER_VILLAS.map((villa) => (
                    <button
                      key={villa.id}
                      onClick={() => { setSelectedVilla(villa.id); setVillaDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        villa.id === selectedVilla
                          ? 'text-heritage-gold bg-heritage-gold/10'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <p>{villa.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{villa.location}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile - Vertical Scrollable Cards */}
        <div className="px-4 space-y-4">
          <FinancialReports villaId={selectedVilla} onError={handleSectionError('financial-reports')} />
          <ExpenseApproval villaId={selectedVilla} onError={handleSectionError('expense-approval')} />
          <SatisfactionScores villaId={selectedVilla} onError={handleSectionError('satisfaction')} />
          <ActivityTimeline villaId={selectedVilla} onError={handleSectionError('activity')} />
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="flex h-screen bg-[#0E0E0E] text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-white/5 flex-col bg-[#0A0A0A]">
        <div className="p-6 border-b border-white/5">
          <p className="text-heritage-gold font-serif text-xl leading-none">Financials</p>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">Owner Portal</p>
        </div>

        <button
          onClick={() => router.push('/web/owner')}
          className="flex items-center gap-3 px-6 py-3 text-xs text-white/40 hover:text-heritage-gold hover:bg-heritage-gold/5 transition-all duration-200 border-b border-white/5 group"
        >
          <ArrowLeft size={13} className="group-hover:text-heritage-gold" />
          <span className="uppercase tracking-widest">← Dashboard</span>
        </button>

        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 px-6 py-3 text-xs text-white/40 hover:text-heritage-gold hover:bg-heritage-gold/5 transition-all duration-200 border-b border-white/5 group"
        >
          <Home size={13} className="group-hover:text-heritage-gold" />
          <span className="uppercase tracking-widest">← Back to Site</span>
        </button>

        {/* User */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-heritage-gold/30 to-heritage-gold/10 border border-heritage-gold/20 flex items-center justify-center text-heritage-gold font-serif flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm truncate">{user.name}</p>
              <p className="text-heritage-gold text-[10px] uppercase tracking-wider">Villa Owner</p>
            </div>
          </div>
        </div>

        {/* Villa Selection */}
        <div className="p-3 border-b border-white/5">
          <p className="text-white/25 text-[10px] uppercase tracking-widest px-3 mb-2">
            Your Properties
          </p>
          <nav className="space-y-0.5">
            {OWNER_VILLAS.map((villa) => (
              <button
                key={villa.id}
                onClick={() => setSelectedVilla(villa.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 ${
                  selectedVilla === villa.id
                    ? 'bg-heritage-gold/10 text-heritage-gold border-l-2 border-heritage-gold'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/3 border-l-2 border-transparent'
                }`}
              >
                <p className="text-sm">{villa.name}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{villa.location}</p>
              </button>
            ))}
          </nav>
        </div>

        {/* Sign Out */}
        <div className="mt-auto p-3 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/50 hover:text-red-400 hover:bg-red-400/5 transition-colors"
          >
            <LogOut size={15} />Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-[#0E0E0E]/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-serif text-white">{currentVilla.name} — Financials</h1>
            <p className="text-white/30 text-[9px] uppercase tracking-widest mt-0.5">
              {currentVilla.location} · Financial Reports & Activity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/web/owner')}
              className="hidden md:flex items-center gap-2 text-white/30 hover:text-white/70 text-xs uppercase tracking-widest transition-colors border border-white/10 hover:border-white/30 px-3 py-1.5"
            >
              <ArrowLeft size={12} /> Dashboard
            </button>
            <button className="relative p-2 text-white/40 hover:text-white transition-colors">
              <Bell size={17} />
            </button>
            <div className="w-8 h-8 rounded-full bg-heritage-gold/20 border border-heritage-gold/30 flex items-center justify-center text-heritage-gold text-xs font-bold">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedVilla}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Financial Reports - full width */}
              <FinancialReports villaId={selectedVilla} onError={handleSectionError('financial-reports')} />

              {/* Expense Approval + Satisfaction side by side */}
              <div className="grid lg:grid-cols-2 gap-6">
                <ExpenseApproval villaId={selectedVilla} onError={handleSectionError('expense-approval')} />
                <SatisfactionScores villaId={selectedVilla} onError={handleSectionError('satisfaction')} />
              </div>

              {/* Activity Timeline - full width */}
              <ActivityTimeline villaId={selectedVilla} onError={handleSectionError('activity')} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
