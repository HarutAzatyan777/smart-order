const express = require('express');
const router = express.Router();
const { sendError } = require('../../utils/http');

/**
 * @typedef {Object} AnalyticsKpis
 * @property {number} ordersToday
 * @property {number} orders7d
 * @property {number} orders30d
 * @property {number} revenue
 * @property {number} aov
 * @property {string} peakHour
 * @property {number} cancellationRate
 * @property {number} prepTimeAvg
 *
 * @typedef {Object} AnalyticsPoint
 * @property {string} label
 * @property {number} value
 *
 * @typedef {Object} AnalyticsItemRow
 * @property {string} name
 * @property {number} orders
 * @property {number} [views]
 * @property {number} [revenue]
 *
 * @typedef {Object} AnalyticsTableRow
 * @property {string} table
 * @property {number} orders
 * @property {number} revenue
 *
 * @typedef {Object} AnalyticsSummaryResponse
 * @property {string} range
 * @property {AnalyticsKpis} kpis
 * @property {AnalyticsPoint[]} ordersOverTime
 * @property {AnalyticsPoint[]} peakHours
 * @property {AnalyticsPoint[]} statusBreakdown
 * @property {AnalyticsPoint[]} deviceBreakdown
 * @property {AnalyticsItemRow[]} topItems
 * @property {AnalyticsItemRow[]} lowItems
 * @property {AnalyticsItemRow[]} viewedNotOrdered
 * @property {AnalyticsTableRow[]} tables
 */

// Minimal skeleton: replace mock data with GA4/BigQuery aggregation when available.
router.get('/summary', async (req, res) => {
  try {
    const { range = '7d', restaurant_id: restaurantId, location } = req.query;

    /** @type {AnalyticsSummaryResponse} */
    const mock = {
      range,
      kpis: {
        ordersToday: 0,
        orders7d: 0,
        orders30d: 0,
        revenue: 0,
        aov: 0,
        peakHour: '—',
        cancellationRate: 0,
        prepTimeAvg: 0
      },
      ordersOverTime: [],
      peakHours: [],
      statusBreakdown: [],
      deviceBreakdown: [],
      topItems: [],
      lowItems: [],
      viewedNotOrdered: [],
      tables: []
    };

    // TODO: implement GA4/BigQuery aggregation using range, restaurantId, location filters.

    return res.status(200).json(mock);
  } catch (err) {
    console.error('Admin analytics summary error:', err);
    return sendError(res, 500, 'Cannot load analytics summary', { code: 'analytics_unavailable' });
  }
});

module.exports = router;
