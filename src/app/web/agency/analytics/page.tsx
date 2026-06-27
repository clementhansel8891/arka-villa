"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Download,
  ExternalLink,
  RefreshCw,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAnalyticsSummary,
  getPageViews,
  exportToCSV,
  exportToPDF,
  seedDemoAnalytics,
  type AnalyticsSummary,
  type PageView,
} from "@/lib/analytics-store";

/**
 * Agency Dashboard — Analytics & Visitor Tracking
 * Shows page views, referrers, campaigns, device breakdown, and allows export.
 */

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentViews, setRecentViews] = useState<PageView[]>([]);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    seedDemoAnalytics();
    loadData();
  }, [period]);

  function loadData() {
    setSummary(getAnalyticsSummary(period));
    setRecentViews(getPageViews().slice(-20).reverse());
  }

  if (!summary) return null;

  const deviceIcons = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-white font-bold">Analytics</h1>
          <p className="text-white/40 text-sm mt-1">Visitor tracking across all sites and pages</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-heritage-gold/50"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 border border-white/10 text-white/40 hover:text-white rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 border border-white/10 text-white/60 hover:text-white px-3 py-2 text-xs uppercase tracking-widest rounded-lg transition-colors"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 border border-white/10 text-white/60 hover:text-white px-3 py-2 text-xs uppercase tracking-widest rounded-lg transition-colors"
          >
            <FileText size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Eye} label="Page Views" value={String(summary.totalViews)} color="text-heritage-gold" />
        <MetricCard icon={Users} label="Unique Sessions" value={String(summary.uniqueSessions)} color="text-blue-400" />
        <MetricCard icon={TrendingUp} label="Avg. Duration" value={`${Math.round(getPageViews().reduce((s, v) => s + v.duration, 0) / Math.max(getPageViews().length, 1))}s`} color="text-emerald-400" />
        <MetricCard icon={Globe} label="Campaigns" value={String(summary.topCampaigns.length)} color="text-purple-400" />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Views by Day */}
        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white font-serif text-lg mb-4">Daily Views (Last 7 Days)</h2>
          <div className="flex items-end gap-2 h-36">
            {summary.viewsByDay.map((day) => {
              const max = Math.max(...summary.viewsByDay.map((d) => d.count), 1);
              const h = (day.count / max) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-white/40 text-[10px]">{day.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(h, 4)}%` }}
                    transition={{ duration: 0.5 }}
                    className="w-full bg-heritage-gold/70 rounded-t-sm min-h-[2px]"
                  />
                  <span className="text-white/30 text-[9px]">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white font-serif text-lg mb-4">Devices</h2>
          <div className="space-y-4">
            {summary.deviceBreakdown.map((d) => {
              const pct = summary.totalViews > 0 ? Math.round((d.count / summary.totalViews) * 100) : 0;
              const Icon = deviceIcons[d.device as keyof typeof deviceIcons] || Monitor;
              return (
                <div key={d.device} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-heritage-gold" />
                      <span className="text-white/70 text-sm capitalize">{d.device}</span>
                    </div>
                    <span className="text-white/50 text-sm">{pct}% ({d.count})</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-heritage-gold/60"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sections + Referrers + Campaigns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Views by Section */}
        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white font-serif text-lg mb-4">By Section</h2>
          <div className="space-y-3">
            {summary.viewsBySection.map((s) => (
              <div key={s.section} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm capitalize">{s.section.replace(/-/g, " ")}</span>
                <span className="text-heritage-gold text-sm font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
            <ExternalLink size={16} className="text-blue-400" /> Referrers
          </h2>
          <div className="space-y-3">
            {summary.topReferrers.slice(0, 6).map((r) => (
              <div key={r.referrer} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm truncate max-w-[180px]">
                  {r.referrer === "direct" ? "Direct" : new URL(r.referrer).hostname.replace("www.", "")}
                </span>
                <span className="text-blue-400 text-sm font-medium">{r.views}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Campaigns */}
        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-400" /> Campaigns
          </h2>
          {summary.topCampaigns.length === 0 ? (
            <p className="text-white/30 text-sm">No campaign data yet. Use UTM parameters in your links.</p>
          ) : (
            <div className="space-y-3">
              {summary.topCampaigns.map((c) => (
                <div key={c.campaign} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-white/70 text-sm">{c.campaign.replace(/_/g, " ")}</span>
                  <span className="text-purple-400 text-sm font-medium">{c.views}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-white/20 text-xs mt-4">
            Track campaigns with: ?utm_source=...&utm_campaign=...
          </p>
        </div>
      </div>

      {/* Top Pages */}
      <div className="border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-serif text-lg mb-4">Top Pages</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider">Page</th>
                <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider">Views</th>
                <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.topPages.map((p) => (
                <tr key={p.page} className="hover:bg-white/[0.02]">
                  <td className="py-3 text-white/70 font-mono text-xs">{p.page}</td>
                  <td className="py-3 text-right text-heritage-gold">{p.views}</td>
                  <td className="py-3 text-right text-white/40">
                    {summary.totalViews > 0 ? Math.round((p.views / summary.totalViews) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-serif text-lg mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider">Time</th>
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider">Page</th>
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider">Referrer</th>
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider">Device</th>
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider">Campaign</th>
                <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentViews.slice(0, 15).map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.02]">
                  <td className="py-2 text-white/40 text-xs whitespace-nowrap">
                    {new Date(v.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2 text-white/70 font-mono text-xs max-w-[200px] truncate">{v.page}</td>
                  <td className="py-2 text-white/50 text-xs max-w-[150px] truncate">
                    {v.referrer === "direct" ? "Direct" : v.referrer ? new URL(v.referrer).hostname.replace("www.", "") : "—"}
                  </td>
                  <td className="py-2 text-white/50 text-xs capitalize">{v.device}</td>
                  <td className="py-2 text-xs">
                    {v.utmCampaign ? (
                      <span className="text-purple-400">{v.utmCampaign}</span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-white/40 text-xs">{v.duration > 0 ? `${v.duration}s` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-white/10 rounded-xl p-4"
    >
      <Icon size={14} className={cn(color, "mb-2")} />
      <p className="text-2xl font-serif text-white font-bold">{value}</p>
      <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">{label}</p>
    </motion.div>
  );
}
