import Navigation from '@/components/dashboard/agency/Navigation';

export const metadata = {
  title: 'Agency Dashboard | Arka Villa Platform',
  description: 'Mobile agency dashboard for managing all villas on the go.',
};

export default function AgencyMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-heritage-charcoal pb-20">
      <main className="px-4 pt-4 pb-6">
        {children}
      </main>
      <Navigation variant="bottom" />
    </div>
  );
}
