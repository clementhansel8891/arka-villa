/**
 * Analytics / Visitor Tracking Store
 * Tracks page views, referrers, UTM params, device info across all sites.
 * Stored in localStorage for demo — in production this would go to a backend.
 */

export interface PageView {
  id: string;
  timestamp: string;
  page: string;
  section: string; // "agency" | "arka-villa" | "careers" | "for-owners" etc.
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  country: string;
  sessionId: string;
  duration: number; // seconds spent on page (updated on leave)
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueSessions: number;
  topPages: { page: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  topCampaigns: { campaign: string; views: number }[];
  deviceBreakdown: { device: string; count: number }[];
  viewsBySection: { section: string; count: number }[];
  viewsByDay: { date: string; count: number }[];
}

const STORAGE_KEY = "av_analytics";
const SESSION_KEY = "av_session_id";

// Generate session ID (persists per browser tab session)
function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function detectDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  return "Other";
}

function getUTMParam(param: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return url.searchParams.get(param) || "";
}

function classifySection(path: string): string {
  if (path.startsWith("/villas/arka-villa")) return "arka-villa";
  if (path.startsWith("/villas/")) return "other-villas";
  if (path.startsWith("/careers")) return "careers";
  if (path.startsWith("/for-owners")) return "for-owners";
  if (path.startsWith("/web/")) return "dashboard";
  if (path === "/" || path === "") return "agency-home";
  return "other";
}

// ─── Core Functions ───────────────────────────────────────────

export function getPageViews(): PageView[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function savePageViews(views: PageView[]): void {
  if (typeof window === "undefined") return;
  // Keep only last 1000 entries to prevent localStorage bloat
  const trimmed = views.slice(-1000);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function trackPageView(page: string): string {
  const view: PageView = {
    id: `pv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    page,
    section: classifySection(page),
    referrer: typeof document !== "undefined" ? document.referrer || "direct" : "direct",
    utmSource: getUTMParam("utm_source"),
    utmMedium: getUTMParam("utm_medium"),
    utmCampaign: getUTMParam("utm_campaign"),
    utmContent: getUTMParam("utm_content"),
    device: detectDevice(),
    browser: detectBrowser(),
    country: "", // Would need GeoIP in production
    sessionId: getSessionId(),
    duration: 0,
  };

  const views = getPageViews();
  views.push(view);
  savePageViews(views);
  return view.id;
}

export function updateDuration(viewId: string, duration: number): void {
  const views = getPageViews();
  const idx = views.findIndex((v) => v.id === viewId);
  if (idx !== -1) {
    views[idx].duration = duration;
    savePageViews(views);
  }
}

// ─── Analytics Summary ────────────────────────────────────────

export function getAnalyticsSummary(days: number = 30): AnalyticsSummary {
  const views = getPageViews();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = views.filter((v) => new Date(v.timestamp) >= cutoff);

  // Total views
  const totalViews = filtered.length;

  // Unique sessions
  const uniqueSessions = new Set(filtered.map((v) => v.sessionId)).size;

  // Top pages
  const pageCounts: Record<string, number> = {};
  filtered.forEach((v) => { pageCounts[v.page] = (pageCounts[v.page] || 0) + 1; });
  const topPages = Object.entries(pageCounts)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Top referrers
  const refCounts: Record<string, number> = {};
  filtered.forEach((v) => {
    const ref = v.referrer || "direct";
    refCounts[ref] = (refCounts[ref] || 0) + 1;
  });
  const topReferrers = Object.entries(refCounts)
    .map(([referrer, views]) => ({ referrer, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Top campaigns
  const campCounts: Record<string, number> = {};
  filtered.forEach((v) => {
    if (v.utmCampaign) campCounts[v.utmCampaign] = (campCounts[v.utmCampaign] || 0) + 1;
  });
  const topCampaigns = Object.entries(campCounts)
    .map(([campaign, views]) => ({ campaign, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Device breakdown
  const devCounts: Record<string, number> = {};
  filtered.forEach((v) => { devCounts[v.device] = (devCounts[v.device] || 0) + 1; });
  const deviceBreakdown = Object.entries(devCounts)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  // Views by section
  const secCounts: Record<string, number> = {};
  filtered.forEach((v) => { secCounts[v.section] = (secCounts[v.section] || 0) + 1; });
  const viewsBySection = Object.entries(secCounts)
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count);

  // Views by day (last 7 days)
  const dayCounts: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dayCounts[key] = 0;
  }
  filtered.forEach((v) => {
    const day = v.timestamp.split("T")[0];
    if (dayCounts[day] !== undefined) dayCounts[day]++;
  });
  const viewsByDay = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

  return { totalViews, uniqueSessions, topPages, topReferrers, topCampaigns, deviceBreakdown, viewsBySection, viewsByDay };
}

// ─── Export Functions ──────────────────────────────────────────

export function exportToCSV(): void {
  const views = getPageViews();
  const headers = ["Timestamp", "Page", "Section", "Referrer", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Content", "Device", "Browser", "Session ID", "Duration (s)"];
  const rows = views.map((v) => [
    v.timestamp, v.page, v.section, v.referrer, v.utmSource, v.utmMedium, v.utmCampaign, v.utmContent, v.device, v.browser, v.sessionId, String(v.duration),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arka-villa-analytics-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToPDF(): void {
  const summary = getAnalyticsSummary(30);
  const content = `
ARKA VILLA MANAGEMENT — ANALYTICS REPORT
Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
Period: Last 30 Days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Page Views:     ${summary.totalViews}
Unique Sessions:      ${summary.uniqueSessions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOP PAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary.topPages.map((p) => `${p.page.padEnd(40)} ${p.views} views`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOP REFERRERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary.topReferrers.map((r) => `${r.referrer.padEnd(40)} ${r.views} visits`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPAIGNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary.topCampaigns.length > 0 ? summary.topCampaigns.map((c) => `${c.campaign.padEnd(40)} ${c.views} views`).join("\n") : "No campaign data tracked yet."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEVICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary.deviceBreakdown.map((d) => `${d.device.padEnd(20)} ${d.count} (${Math.round((d.count / summary.totalViews) * 100)}%)`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary.viewsBySection.map((s) => `${s.section.padEnd(20)} ${s.count} views`).join("\n")}
`.trim();

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arka-villa-analytics-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Seed demo data ───────────────────────────────────────────

export function seedDemoAnalytics(): void {
  if (typeof window === "undefined") return;
  const existing = getPageViews();
  if (existing.length > 20) return; // Already has data

  const pages = ["/", "/villas/arka-villa", "/villas/arka-villa/rooms", "/villas/arka-villa/booking", "/villas/arka-villa/gallery", "/villas/arka-villa/facilities", "/villas/arka-villa/explore", "/careers", "/for-owners", "/contact"];
  const referrers = ["direct", "https://www.google.com", "https://www.instagram.com", "https://www.booking.com", "https://www.facebook.com/ads", "https://www.tripadvisor.com"];
  const campaigns = ["", "", "", "summer_2026", "bali_luxury", "instagram_story", "google_search"];
  const sources = ["", "", "", "google", "instagram", "facebook", "tripadvisor"];
  const mediums = ["", "", "", "cpc", "social", "referral", "organic"];
  const devices: ("mobile" | "tablet" | "desktop")[] = ["mobile", "mobile", "mobile", "desktop", "desktop", "tablet"];
  const browsers = ["Chrome", "Safari", "Chrome", "Safari", "Firefox", "Edge"];

  const demoViews: PageView[] = [];
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const campIdx = Math.floor(Math.random() * campaigns.length);
    demoViews.push({
      id: `pv_demo_${i}`,
      timestamp: d.toISOString(),
      page: pages[Math.floor(Math.random() * pages.length)],
      section: classifySection(pages[Math.floor(Math.random() * pages.length)]),
      referrer: referrers[Math.floor(Math.random() * referrers.length)],
      utmSource: sources[campIdx],
      utmMedium: mediums[campIdx],
      utmCampaign: campaigns[campIdx],
      utmContent: "",
      device: devices[Math.floor(Math.random() * devices.length)],
      browser: browsers[Math.floor(Math.random() * browsers.length)],
      country: "",
      sessionId: `s_demo_${Math.floor(i / 3)}`,
      duration: Math.floor(Math.random() * 300) + 10,
    });
  }

  savePageViews([...existing, ...demoViews]);
}
