"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Home,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared shell for Owner Portal pages — provides sidebar + main content area.
 * Used by all sub-pages (villas, reports, settings) to avoid duplicate layout logic.
 */

const navItems = [
  { label: "Dashboard", href: "/web/owner", icon: LayoutDashboard, id: "dashboard" },
  { label: "My Villas", href: "/web/owner/villas", icon: Home, id: "villas" },
  { label: "Financials", href: "/web/owner/financials", icon: DollarSign, id: "financials" },
  { label: "Reports", href: "/web/owner/reports", icon: BarChart3, id: "reports" },
  { label: "Settings", href: "/web/owner/settings", icon: Settings, id: "settings" },
];

interface OwnerShellProps {
  children: React.ReactNode;
  activeNav?: string;
}

export default function OwnerShell({ children, activeNav }: OwnerShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function isActive(item: typeof navItems[0]): boolean {
    if (activeNav) return item.id === activeNav;
    if (item.href === "/web/owner") return pathname === "/web/owner";
    return pathname.startsWith(item.href);
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/5 flex flex-col shrink-0 fixed top-0 left-0 h-screen bg-[#0A0A0A]">
        {/* Brand */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="block">
            <p className="text-heritage-gold font-serif text-lg tracking-tight">Arka Villa</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">Owner Portal</p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Owner navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm",
                  active
                    ? "bg-heritage-gold/10 text-heritage-gold border-l-2 border-heritage-gold"
                    : "text-white/50 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 p-4 space-y-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-white/30 hover:text-heritage-gold text-xs transition-colors"
          >
            <ExternalLink size={14} /> Back to Website
          </Link>
          {user && (
            <div className="px-3">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/30 text-[10px] capitalize">{user.role}</p>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-red-400/60 hover:text-red-400 text-xs mt-2 transition-colors"
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-60 p-8 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
