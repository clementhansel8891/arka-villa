'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  DollarSign,
  Megaphone,
  Wrench,
  Briefcase,
  Wallet,
  BarChart3,
  Settings,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export interface NavItem {
  label: string;
  href: string;
  mobileHref: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/web/agency',
    mobileHref: '/m/agency',
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Bookings',
    href: '/web/agency/bookings',
    mobileHref: '/m/agency/bookings',
    icon: <CalendarCheck size={18} />,
  },
  {
    label: 'Staff',
    href: '/web/agency/staff',
    mobileHref: '/m/agency/staff',
    icon: <Users size={18} />,
  },
  {
    label: 'Financial',
    href: '/web/agency/financial',
    mobileHref: '/m/agency/financial',
    icon: <DollarSign size={18} />,
  },
  {
    label: 'Marketing',
    href: '/web/agency/marketing',
    mobileHref: '/m/agency/marketing',
    icon: <Megaphone size={18} />,
  },
  {
    label: 'Maintenance',
    href: '/web/agency/maintenance',
    mobileHref: '/m/agency/maintenance',
    icon: <Wrench size={18} />,
  },
  {
    label: 'Careers',
    href: '/web/agency/careers',
    mobileHref: '/m/agency/careers',
    icon: <Briefcase size={18} />,
  },
  {
    label: 'Loans',
    href: '/web/agency/loans',
    mobileHref: '/m/agency/loans',
    icon: <Wallet size={18} />,
  },
  {
    label: 'Analytics',
    href: '/web/agency/analytics',
    mobileHref: '/m/agency/analytics',
    icon: <BarChart3 size={18} />,
  },
  {
    label: 'Settings',
    href: '/web/agency/settings',
    mobileHref: '/m/agency/settings',
    icon: <Settings size={18} />,
  },
];

interface NavigationProps {
  variant: 'sidebar' | 'bottom';
}

export default function Navigation({ variant }: NavigationProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const isMobile = variant === 'bottom';

  function isActive(item: NavItem): boolean {
    const href = isMobile ? item.mobileHref : item.href;
    if (href === '/web/agency' || href === '/m/agency') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  if (variant === 'bottom') {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-heritage-charcoal border-t border-heritage-gold/20 safe-area-bottom"
        role="navigation"
        aria-label="Main navigation"
      >
        <ul className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(item);
            return (
              <li key={item.label}>
                <Link
                  href={item.mobileHref}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors',
                    active
                      ? 'text-heritage-gold'
                      : 'text-white/50 hover:text-white/80'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium tracking-wide">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/m/agency/more"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white/80 transition-colors"
            >
              <Settings size={20} />
              <span className="text-[10px] font-medium tracking-wide">More</span>
            </Link>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen bg-heritage-charcoal border-r border-heritage-gold/10 z-40 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-heritage-gold/10">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-serif text-heritage-gold tracking-tight"
            >
              Arka Villa
            </motion.span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-white/40 hover:text-white transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav Items */}
      <ul className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  active
                    ? 'bg-heritage-gold/10 text-heritage-gold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-heritage-gold rounded-r"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="text-sm font-medium tracking-wide">
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer: Back to site + User */}
      <div className="border-t border-heritage-gold/10 px-2 py-3 space-y-2">
        {/* Back to Website */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-heritage-gold hover:bg-heritage-gold/5 transition-colors',
          )}
        >
          <ExternalLink size={16} />
          {!collapsed && <span className="text-xs font-medium">Back to Website</span>}
        </Link>

        {/* User info & Logout */}
        {user && (
          <div className={cn('px-3 py-2', collapsed ? 'text-center' : '')}>
            {!collapsed && (
              <>
                <p className="text-white text-sm font-medium truncate">{user.name}</p>
                <p className="text-white/30 text-[10px] capitalize">{user.role} · {user.position || 'Team'}</p>
              </>
            )}
            <button
              onClick={logout}
              className={cn(
                'flex items-center gap-2 text-red-400/60 hover:text-red-400 text-xs transition-colors',
                collapsed ? 'mx-auto mt-1' : 'mt-2'
              )}
            >
              <LogOut size={14} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
