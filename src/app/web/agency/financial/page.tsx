import FinancialPanel from '@/components/dashboard/agency/FinancialPanel';

export const metadata = {
  title: 'Financial Overview | Agency Dashboard',
  description: 'Cross-villa financial management with revenue/expense comparisons and charts.',
};

export default function AgencyFinancialPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">
          Financial Overview
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Revenue, expenses, and net income across all managed villas
        </p>
      </header>

      <FinancialPanel />
    </div>
  );
}
