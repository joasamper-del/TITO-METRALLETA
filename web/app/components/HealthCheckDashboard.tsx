'use client';

import { useEffect, useState } from 'react';
import { HealthResult, HealthStatus } from '@/lib/types/health';

const statusEmoji = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  gray: '⚪',
};

const statusLabel = {
  green: 'Healthy',
  yellow: 'Warning',
  red: 'Failed',
  gray: 'Unknown',
};

export default function HealthCheckDashboard() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      setError(null);
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as HealthResult;
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && !health) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <p className="text-gray-600">Loading health status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg shadow border border-red-200">
        <div className="text-center">
          <p className="text-red-700 font-semibold">Error: {error}</p>
          <button
            onClick={fetchHealth}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg shadow">
        <p className="text-center text-gray-600">No health data available</p>
      </div>
    );
  }

  const readyStatus = health.readyToOperate
    ? '✅ READY TO OPERATE'
    : `❌ OPERATION BLOCKED (${health.blockedSources.join(', ')})`;

  return (
    <div className="space-y-6">
      {/* Header with overall status */}
      <div
        className={`p-6 rounded-lg shadow border-2 ${
          health.overallStatus === 'green'
            ? 'bg-green-50 border-green-300'
            : health.overallStatus === 'yellow'
              ? 'bg-yellow-50 border-yellow-300'
              : health.overallStatus === 'red'
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-300'
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {statusEmoji[health.overallStatus]} {readyStatus}
            </h2>
            <p className="text-sm text-gray-600">
              Updated: {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded font-semibold ${
              autoRefresh
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </button>
        </div>
      </div>

      {/* Broker status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {health.checks
          .reduce(
            (acc, check) => {
              const existing = acc.find((item) => item.broker === check.broker);
              if (existing) {
                existing.checks.push(check);
              } else {
                acc.push({ broker: check.broker, checks: [check] });
              }
              return acc;
            },
            [] as { broker: string; checks: typeof health.checks }[]
          )
          .map((broker) => {
            const isBlocked = health.blockedSources.includes(broker.broker);
            const worstStatus = broker.checks.reduce((worst: HealthStatus, check) => {
              const priority = { red: 3, yellow: 2, green: 1, gray: 0 };
              return priority[check.status] > priority[worst] ? check.status : worst;
            }, 'gray' as HealthStatus);

            return (
              <div
                key={broker.broker}
                className={`p-4 rounded-lg border-2 ${
                  worstStatus === 'green'
                    ? 'bg-green-50 border-green-300'
                    : worstStatus === 'yellow'
                      ? 'bg-yellow-50 border-yellow-300'
                      : worstStatus === 'red'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="mb-3">
                  <h3 className="text-lg font-bold capitalize">
                    {statusEmoji[worstStatus]} {broker.broker}
                  </h3>
                  {isBlocked && (
                    <p className="text-sm text-red-700 font-semibold mt-1">🔴 BLOCKED</p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {broker.checks.map((check) => (
                    <div key={check.id} className="border-t pt-2">
                      <div className="flex items-start justify-between">
                        <span className="font-semibold">{check.checkName}</span>
                        <span className="text-xs bg-white px-2 py-1 rounded">
                          {statusEmoji[check.status]} {statusLabel[check.status]}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-1">{check.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last: {new Date(check.lastChecked).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Report section */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
        <h3 className="font-bold mb-2">Status Report</h3>
        <pre className="text-sm bg-white p-3 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap break-words font-mono">
          {health.report}
        </pre>
      </div>

      {/* Footer info */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          ℹ️ This dashboard is read-only. It shows the status of credential and connection health
          for all integrated brokers. No credentials or sensitive information are displayed.
        </p>
      </div>
    </div>
  );
}
