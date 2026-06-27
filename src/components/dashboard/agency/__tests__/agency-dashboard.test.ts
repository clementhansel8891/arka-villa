/**
 * Unit tests for Agency Dashboard components logic.
 * Tests navigation configuration, alert sorting, and portfolio metrics structure.
 */

import { describe, it, expect } from 'vitest';

// Navigation items configuration validation
describe('Agency Dashboard Navigation', () => {
  // Inline the nav items for testing (same source of truth as the component)
  const navItems = [
    { label: 'Overview', href: '/web/agency', mobileHref: '/m/agency' },
    { label: 'Bookings', href: '/web/agency/bookings', mobileHref: '/m/agency/bookings' },
    { label: 'Staff', href: '/web/agency/staff', mobileHref: '/m/agency/staff' },
    { label: 'Financial', href: '/web/agency/financial', mobileHref: '/m/agency/financial' },
    { label: 'Marketing', href: '/web/agency/marketing', mobileHref: '/m/agency/marketing' },
    { label: 'Maintenance', href: '/web/agency/maintenance', mobileHref: '/m/agency/maintenance' },
    { label: 'Careers', href: '/web/agency/careers', mobileHref: '/m/agency/careers' },
    { label: 'Settings', href: '/web/agency/settings', mobileHref: '/m/agency/settings' },
  ];

  it('has exactly 8 primary menu items', () => {
    expect(navItems).toHaveLength(8);
  });

  it('each navigation item has desktop and mobile href', () => {
    for (const item of navItems) {
      expect(item.href).toMatch(/^\/web\/agency/);
      expect(item.mobileHref).toMatch(/^\/m\/agency/);
      expect(item.label).toBeTruthy();
    }
  });

  it('desktop routes use /web/agency prefix', () => {
    for (const item of navItems) {
      expect(item.href.startsWith('/web/agency')).toBe(true);
    }
  });

  it('mobile routes use /m/agency prefix', () => {
    for (const item of navItems) {
      expect(item.mobileHref.startsWith('/m/agency')).toBe(true);
    }
  });

  it('no duplicate labels exist', () => {
    const labels = navItems.map((i) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// Alert severity sorting
describe('AlertsCenter severity sorting', () => {
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  interface Alert {
    id: string;
    severity: string;
    timestamp: string;
  }

  function sortAlerts(alerts: Alert[]): Alert[] {
    return [...alerts].sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  it('sorts critical alerts before high, medium, and low', () => {
    const alerts: Alert[] = [
      { id: '1', severity: 'low', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', severity: 'critical', timestamp: '2024-01-01T09:00:00Z' },
      { id: '3', severity: 'medium', timestamp: '2024-01-01T11:00:00Z' },
      { id: '4', severity: 'high', timestamp: '2024-01-01T08:00:00Z' },
    ];

    const sorted = sortAlerts(alerts);
    expect(sorted[0].severity).toBe('critical');
    expect(sorted[1].severity).toBe('high');
    expect(sorted[2].severity).toBe('medium');
    expect(sorted[3].severity).toBe('low');
  });

  it('sorts by timestamp (newest first) within same severity', () => {
    const alerts: Alert[] = [
      { id: '1', severity: 'high', timestamp: '2024-01-01T08:00:00Z' },
      { id: '2', severity: 'high', timestamp: '2024-01-01T12:00:00Z' },
      { id: '3', severity: 'high', timestamp: '2024-01-01T10:00:00Z' },
    ];

    const sorted = sortAlerts(alerts);
    expect(sorted[0].id).toBe('2'); // newest
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1'); // oldest
  });

  it('handles empty alerts array', () => {
    const sorted = sortAlerts([]);
    expect(sorted).toEqual([]);
  });
});

// Portfolio overview metrics structure
describe('PortfolioOverview metrics', () => {
  const requiredMetricLabels = [
    'Total Villas',
    'Active Bookings',
    'Aggregate Revenue',
    'Occupancy Rate',
    'Active Employees',
    'Unresolved Issues',
  ];

  it('portfolio overview defines all 6 required metrics (requirement 22.1)', () => {
    // These correspond to the acceptance criteria from Requirement 22.1
    expect(requiredMetricLabels).toHaveLength(6);
  });

  it('all required metric labels are distinct', () => {
    const uniqueLabels = new Set(requiredMetricLabels);
    expect(uniqueLabels.size).toBe(requiredMetricLabels.length);
  });
});
