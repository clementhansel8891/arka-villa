'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  MousePointerClick,
  Eye,
  Target,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DateRangeFilter, { type DateRange } from './DateRangeFilter';

export interface CampaignMetrics {
  id: string;
  name: string;
  villaName: string;
  channel: 'meta' | 'google';
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  currency: string;
}

export interface VillaMarketingSummary {
  villaId: string;
  villaName: string;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalRevenue: number;
  roas: number | null;
  currency: string;
}

interface MarketingPanelProps {
  campaigns?: CampaignMetrics[];
  villaSummaries?: VillaMarketingSummary[];
  lastUpdated?: string | null;
}

const defaultCampaigns: CampaignMetrics[] = [];
const defaultSummaries: VillaMarketingSummary[] = [];

export default function MarketingPanel({
  campaigns = defaultCampaigns,
  villaSummaries = defaultSummaries,
  lastUpdated = null,
}: MarketingPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | 'meta' | 'google'>('all');

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
      return true;
    });
  }, [campaigns, channelFilter]);

  const aggregateMetrics = useMemo(() => {
    const data = filteredCampaigns;
    const totalImpressions = data.reduce((acc, c) => acc + c.impressions, 0);
    const totalClicks = data.reduce((acc, c) => acc + c.clicks, 0);
    const totalCost = data.reduce((acc, c) => acc + c.cost, 0);
    const totalConversions = data.reduce((acc, c) => acc + c.conversions, 0);
    const totalRevenue = data.reduce((acc, c) => acc + c.revenue, 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const costPerConversion = totalConversions > 0 ? totalCost / totalConversions : 0;
    const roas = totalCost > 0 ? totalRevenue / totalCost : null;
    return { totalImpressions, totalClicks, totalCost, totalConversions, totalRevenue, ctr, costPerConversion, roas };
  }, [filteredCampaigns]);

  const currency = campaigns[0]?.currency ?? 'USD';

  function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  function formatAmount(amount: number): string {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <section aria-label="Cross-villa marketing performance" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-400/10 text-purple-400">
            <Megaphone size={22} />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white">Marketing Performance</h2>
            <p className="text-xs text-white/40">
              Campaign metrics and villa comparison
            </p>
          </div>
        </div>
        {lastUpdated && (
          <span className="text-xs text-white/30">
            Last updated: {lastUpdated}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as 'all' | 'meta' | 'google')}
          className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
          aria-label="Filter by ad platform"
        >
          <option value="all">All Platforms</option>
          <option value="meta">Meta (Facebook/Instagram)</option>
          <option value="google">Google Ads</option>
        </select>
        <DateRangeFilter onChange={setDateRange} />
      </div>

      {/* Aggregate metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Eye size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide">Impressions</p>
          </div>
          <p className="text-lg font-serif font-bold text-white">{formatNumber(aggregateMetrics.totalImpressions)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <MousePointerClick size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide">Clicks</p>
          </div>
          <p className="text-lg font-serif font-bold text-white">{formatNumber(aggregateMetrics.totalClicks)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide">Cost</p>
          </div>
          <p className="text-lg font-serif font-bold text-white">{currency} {formatNumber(aggregateMetrics.totalCost)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide">Conversions</p>
          </div>
          <p className="text-lg font-serif font-bold text-emerald-400">{formatNumber(aggregateMetrics.totalConversions)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <MousePointerClick size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide">CTR</p>
          </div>
          <p className="text-lg font-serif font-bold text-white">{aggregateMetrics.ctr.toFixed(2)}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide">CPC</p>
          </div>
          <p className="text-lg font-serif font-bold text-white">
            {currency} {aggregateMetrics.costPerConversion > 0 ? formatAmount(aggregateMetrics.costPerConversion) : '—'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide">ROAS</p>
          </div>
          <p className={cn(
            'text-lg font-serif font-bold',
            aggregateMetrics.roas !== null && aggregateMetrics.roas >= 1
              ? 'text-emerald-400'
              : 'text-amber-400'
          )}>
            {aggregateMetrics.roas !== null ? `${aggregateMetrics.roas.toFixed(2)}x` : '—'}
          </p>
        </motion.div>
      </div>

      {/* Villa comparison table */}
      <div className="rounded-xl border border-heritage-gold/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-heritage-charcoal/80 border-b border-heritage-gold/10">
          <Megaphone size={16} className="text-white/40" />
          <h3 className="text-sm font-medium text-white/70">Villa Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" aria-label="Villa marketing comparison">
            <thead className="bg-heritage-charcoal/60 border-b border-heritage-gold/5">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Villa</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Impressions</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Clicks</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Cost</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Conversions</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Revenue</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-heritage-gold/5">
              {villaSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-white/30">
                      <AlertCircle size={32} />
                      <p className="text-sm">No marketing data available.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                villaSummaries.map((villa) => (
                  <tr
                    key={villa.villaId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{villa.villaName}</td>
                    <td className="px-4 py-3 text-white/70 text-right">{formatNumber(villa.totalImpressions)}</td>
                    <td className="px-4 py-3 text-white/70 text-right">{formatNumber(villa.totalClicks)}</td>
                    <td className="px-4 py-3 text-white/70 text-right">{villa.currency} {formatAmount(villa.totalCost)}</td>
                    <td className="px-4 py-3 text-emerald-400 text-right">{villa.totalConversions}</td>
                    <td className="px-4 py-3 text-heritage-gold text-right">{villa.currency} {formatAmount(villa.totalRevenue)}</td>
                    <td className={cn(
                      'px-4 py-3 text-right font-medium',
                      villa.roas !== null && villa.roas >= 1 ? 'text-emerald-400' : 'text-amber-400'
                    )}>
                      {villa.roas !== null ? `${villa.roas.toFixed(2)}x` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign details table */}
      {filteredCampaigns.length > 0 && (
        <div className="rounded-xl border border-heritage-gold/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-heritage-charcoal/80 border-b border-heritage-gold/10">
            <Target size={16} className="text-white/40" />
            <h3 className="text-sm font-medium text-white/70">Campaign Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left" aria-label="Campaign details">
              <thead className="bg-heritage-charcoal/60 border-b border-heritage-gold/5">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Campaign</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Villa</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Platform</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Impressions</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Clicks</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">Conversions</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-heritage-gold/5">
                {filteredCampaigns.map((campaign) => {
                  const roas = campaign.cost > 0 ? campaign.revenue / campaign.cost : null;
                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">{campaign.name}</td>
                      <td className="px-4 py-3 text-white/70">{campaign.villaName}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-block rounded px-2 py-0.5 text-xs font-medium capitalize',
                          campaign.channel === 'meta' ? 'bg-blue-400/10 text-blue-400' : 'bg-amber-400/10 text-amber-400'
                        )}>
                          {campaign.channel === 'meta' ? 'Meta' : 'Google'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70 text-right">{formatNumber(campaign.impressions)}</td>
                      <td className="px-4 py-3 text-white/70 text-right">{formatNumber(campaign.clicks)}</td>
                      <td className="px-4 py-3 text-emerald-400 text-right">{campaign.conversions}</td>
                      <td className={cn(
                        'px-4 py-3 text-right font-medium',
                        roas !== null && roas >= 1 ? 'text-emerald-400' : 'text-amber-400'
                      )}>
                        {roas !== null ? `${roas.toFixed(2)}x` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
