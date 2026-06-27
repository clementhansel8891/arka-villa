import BottomNav from '@/components/dashboard/employee/BottomNav';

export const metadata = {
  title: 'Staff Portal | Arka Villa',
  description: 'Employee dashboard for managing attendance, tasks, and reports.',
};

export default function StaffMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-heritage-charcoal">
      {/* Main content area with bottom padding for nav */}
      <main className="pb-20 px-4 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
