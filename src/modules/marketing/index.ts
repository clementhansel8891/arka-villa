/**
 * Marketing Module
 *
 * Campaign tracking, ad platform metric aggregation (Meta + Google Ads),
 * ROAS calculation, budget threshold alerts, 30-day last-click UTM
 * attribution, and cross-villa comparison views.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

export * from './types';
export {
  createCampaign,
  getCampaigns,
  getMetrics,
  getMetricsByCampaign,
  calculateROAS,
  calculateROASByChannel,
  calculateROASByCampaign,
  checkBudgetThreshold,
  attributeBooking,
  getVillaComparison,
  resolvePeriodDates,
  MarketingError,
} from './service';
