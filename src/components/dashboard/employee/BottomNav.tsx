'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ListTodo, Clock, FileText, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', href: '/m/staff', icon: Home },
  { label: 'Tasks', href: '/m/staff/tasks', icon: ListTodo },
  { label: 'Clock In/Out', href: '/m/staff/attendance', icon: Clock },
  { label: 'Reports', href: '/m/staff/reports', icon: FileText },
  { label: 'Profile', href: '/m/staff/profile', icon: UserCircle },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-heritage-charcoal border-t border-heritage-gold/20 safe-area-bottom"
      role="navigation"
      aria-label="Staff navigation"
    >
      <ul className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/m/staff'
              ? pathname === '/m/staff'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors',
                  isActive
                    ? 'text-heritage-gold'
                    : 'text-white/50 hover:text-white/80'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium tracking-wide">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
