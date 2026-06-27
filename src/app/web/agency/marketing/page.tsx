import MarketingPanel from '@/components/dashboard/agency/MarketingPanel';

export const metadata = {
  title: 'Marketing Performance | Agency Dashboard',
  description: 'Campaign metrics, villa comparison, and ROAS tracking across all managed villas.',
};

export default function AgencyMarketingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">
          Marketing Performance
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Campaign metrics, ad spend, and performance across all villas
        </p>
      </header>

      <MarketingPanel />
    </div>
  );
}
