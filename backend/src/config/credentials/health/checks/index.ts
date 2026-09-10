/**
 * Health Checks Index
 * Exports all broker-specific health check configurations
 */

export { alpacaHealthChecks } from './alpaca.check';
export { massiveHealthChecks } from './massive.check';
export { schwabHealthChecks } from './schwab.check';
export { newsapiHealthChecks } from './newsapi.check';
export { fredHealthChecks } from './fred.check';
export { tradingviewHealthChecks } from './tradingview.check';
export { marketsnackHealthChecks } from './marketsnack.check';

export function getAllHealthChecks() {
  const { alpacaHealthChecks } = require('./alpaca.check');
  const { massiveHealthChecks } = require('./massive.check');
  const { schwabHealthChecks } = require('./schwab.check');
  const { newsapiHealthChecks } = require('./newsapi.check');
  const { fredHealthChecks } = require('./fred.check');
  const { tradingviewHealthChecks } = require('./tradingview.check');
  const { marketsnackHealthChecks } = require('./marketsnack.check');

  return [
    ...alpacaHealthChecks,
    ...massiveHealthChecks,
    ...schwabHealthChecks,
    ...newsapiHealthChecks,
    ...fredHealthChecks,
    ...tradingviewHealthChecks,
    ...marketsnackHealthChecks,
  ];
}
