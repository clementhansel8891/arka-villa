import PortfolioOverview from '@/components/dashboard/agency/PortfolioOverview';
import VillaDrillDown from '@/components/dashboard/agency/VillaDrillDown';
import AlertsCenter from '@/components/dashboard/agency/AlertsCenter';

export default function AgencyMobileDashboardPage() {
  return (
    <div className="space-y-4">
      {/* Mobile page header */}
      <header>
        <h1 className="text-xl font-serif text-white font-bold">
          Portfolio
        </h1>
        <p className="text-xs text-white/40 mt-0.5">
          Your agency at a glance
        </p>
      </header>

      {/* Compact portfolio metrics (summary cards for mobile) */}
      <PortfolioOverview compact />

      {/* Alerts center - compact mode for mobile */}
      <AlertsCenter compact />

      {/* Villa list with drill-down */}
      <VillaDrillDown />
    </div>
  );
}
