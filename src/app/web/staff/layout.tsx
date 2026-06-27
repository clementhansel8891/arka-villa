"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Home, ListTodo, Clock, FileText, UserCircle, LogOut, ExternalLink, Wallet, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Dashboard", href: "/web/staff", icon: Home },
  { label: "Tasks", href: "/web/staff/tasks", icon: ListTodo },
  { label: "Attendance", href: "/web/staff/attendance", icon: Clock },
  { label: "Loans", href: "/web/staff/loans", icon: Wallet },
  { label: "Payslip", href: "/web/staff/payslip", icon: Receipt },
  { label: "Reports", href: "/web/staff/reports", icon: FileText },
  { label: "Profile", href: "/web/staff/profile", icon: UserCircle },
];

export default function StaffDesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?from=/web/staff");
      return;
    }
    if (user.role !== "staff" && user.role !== "admin") {
      router.replace("/login?error=unauthorized");
      return;
    }
    setReady(true);
  }, [user, loading, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-heritage-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-xs uppercase tracking-widest">Loading staff portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-heritage-charcoal flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/10 flex flex-col shrink-0 fixed top-0 left-0 h-screen">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/">
            <h2 className="text-heritage-gold font-serif text-lg tracking-tight">Arka Villa</h2>
            <p className="text-white/30 text-[11px] uppercase tracking-widest mt-0.5">Staff Portal</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="space-y-1 flex-1 p-3" aria-label="Staff navigation">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/web/staff"
              ? pathname === "/web/staff"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                  active
                    ? "bg-heritage-gold/10 text-heritage-gold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-white/30 hover:text-heritage-gold text-xs transition-colors rounded-lg hover:bg-heritage-gold/5"
          >
            <ExternalLink size={14} /> Back to Website
          </Link>
          <div className="px-3">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-white/30 text-[10px] capitalize">{user?.position || user?.role}</p>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-red-400/60 hover:text-red-400 text-xs mt-2 transition-colors"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-8 overflow-y-auto min-h-screen">{children}</main>
    </div>
  );
}
