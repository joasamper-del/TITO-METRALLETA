/**
 * Health Check Dashboard Tests
 * Verify UI correctly displays health status without exposing secrets
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HealthCheckDashboard from './HealthCheckDashboard';
import { HealthResult } from '@/lib/types/health';

// Mock fetch
global.fetch = vi.fn();

const mockHealthResult: HealthResult = {
  timestamp: '2026-09-09T21:35:00Z',
  overallStatus: 'green',
  readyToOperate: true,
  blockedSources: [],
  checks: [
    {
      id: 'alpaca_credentials',
      broker: 'alpaca',
      checkName: 'Credentials',
      status: 'green',
      message: '✓ Healthy',
      lastChecked: '2026-09-09T21:35:00Z',
    },
    {
      id: 'alpaca_connection',
      broker: 'alpaca',
      checkName: 'Connection',
      status: 'green',
      message: '✓ Healthy (15ms)',
      lastChecked: '2026-09-09T21:35:00Z',
    },
    {
      id: 'massive_credentials',
      broker: 'massive',
      checkName: 'Credentials',
      status: 'green',
      message: '✓ Healthy',
      lastChecked: '2026-09-09T21:35:00Z',
    },
  ],
  report: '🟢 ALPACA\n   ✓ Credentials: ✓ Healthy\n🟢 MASSIVE\n   ✓ Credentials: ✓ Healthy\n',
};

describe('HealthCheckDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockHealthResult,
    });
  });

  it('should display overall status when green', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/READY TO OPERATE/i)).toBeInTheDocument();
    });
  });

  it('should display blocked status when red', async () => {
    const redHealth: HealthResult = {
      ...mockHealthResult,
      overallStatus: 'red',
      readyToOperate: false,
      blockedSources: ['alpaca'],
      checks: [
        {
          id: 'alpaca_conn',
          broker: 'alpaca',
          checkName: 'Connection',
          status: 'red',
          message: '✗ Connection failed',
          lastChecked: '2026-09-09T21:35:00Z',
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => redHealth,
    });

    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/OPERATION BLOCKED/i)).toBeInTheDocument();
      expect(screen.getByText(/alpaca/i)).toBeInTheDocument();
    });
  });

  it('should display broker status cards', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('alpaca')).toBeInTheDocument();
      expect(screen.getByText('massive')).toBeInTheDocument();
    });
  });

  it('should display check details for each broker', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Credentials')).toBeInTheDocument();
      expect(screen.getByText('Connection')).toBeInTheDocument();
      expect(screen.getByText(/✓ Healthy/)).toBeInTheDocument();
    });
  });

  it('should never expose API keys, tokens, or secrets', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      const content = document.body.innerHTML;
      expect(content).not.toContain('API_KEY');
      expect(content).not.toContain('SECRET');
      expect(content).not.toContain('TOKEN');
      expect(content).not.toContain('PASSWORD');
      expect(content).not.toContain('COOKIE');
    });
  });

  it('should display status emojis correctly', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/🟢/)).toBeInTheDocument();
    });
  });

  it('should display status report section', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Status Report/i)).toBeInTheDocument();
      expect(screen.getByText(/ALPACA/)).toBeInTheDocument();
    });
  });

  it('should have auto-refresh toggle', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      const button = screen.getByText(/Auto-Refresh ON/);
      expect(button).toBeInTheDocument();
    });
  });

  it('should toggle auto-refresh on button click', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      const button = screen.getByText(/Auto-Refresh ON/);
      fireEvent.click(button);
      expect(screen.getByText(/Auto-Refresh OFF/)).toBeInTheDocument();
    });
  });

  it('should display error when fetch fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });

  it('should handle HTTP errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
    });

    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error: HTTP 503/i)).toBeInTheDocument();
    });
  });

  it('should display yellow status correctly', async () => {
    const yellowHealth: HealthResult = {
      ...mockHealthResult,
      overallStatus: 'yellow',
      checks: [
        {
          id: 'alpaca_token',
          broker: 'alpaca',
          checkName: 'Token',
          status: 'yellow',
          message: '⚠ Expires in 24 hours',
          lastChecked: '2026-09-09T21:35:00Z',
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => yellowHealth,
    });

    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Expires in 24 hours/)).toBeInTheDocument();
    });
  });

  it('should display gray status for unconfigured checks', async () => {
    const grayHealth: HealthResult = {
      ...mockHealthResult,
      overallStatus: 'gray',
      checks: [
        {
          id: 'newsapi_creds',
          broker: 'newsapi',
          checkName: 'Credentials',
          status: 'gray',
          message: '? Unknown',
          lastChecked: '2026-09-09T21:35:00Z',
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => grayHealth,
    });

    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Unknown/)).toBeInTheDocument();
    });
  });

  it('should display timestamp in human-readable format', async () => {
    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });
  });

  it('should display blocked source name in red status', async () => {
    const blockedHealth: HealthResult = {
      ...mockHealthResult,
      overallStatus: 'red',
      readyToOperate: false,
      blockedSources: ['alpaca', 'massive'],
      checks: [
        {
          id: 'alpaca_fail',
          broker: 'alpaca',
          checkName: 'Connection',
          status: 'red',
          message: '✗ Connection failed',
          lastChecked: '2026-09-09T21:35:00Z',
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => blockedHealth,
    });

    render(<HealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/alpaca, massive/)).toBeInTheDocument();
    });
  });
});
