/**
 * Manual Approval Gate
 * Human review required before scaling position size or increasing leverage
 * "Growth requires approval, not just permission"
 */

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export interface ScalingRequest {
  id: string;
  timestamp: Date;
  requestedBy: string;
  description: string;
  currentRiskPerTrade: number; // % of account
  proposedRiskPerTrade: number; // % of account
  reason: string;
  supportingMetrics?: Record<string, number | string>;
  status: ApprovalStatus;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  expiresAt: Date;
}

export class ManualApprovalGate {
  private requests: Map<string, ScalingRequest> = new Map();
  private approvalThresholds = {
    minSuccessfulTrades: 50, // Need 50+ trades before scaling
    minWinRate: 0.50, // 50% win rate minimum
    maxDrawdown: -0.04, // Max 4% drawdown
    minWeeks: 2, // Min 2 weeks of data
  };

  /**
   * Create a scaling request
   */
  requestScaling(params: {
    currentRiskPerTrade: number;
    proposedRiskPerTrade: number;
    reason: string;
    supportingMetrics?: Record<string, number | string>;
  }): ScalingRequest {
    const id = `SCALE_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const request: ScalingRequest = {
      id,
      timestamp: new Date(),
      requestedBy: "SYSTEM",
      description: `Scale from ${params.currentRiskPerTrade}% to ${params.proposedRiskPerTrade}% per trade`,
      currentRiskPerTrade: params.currentRiskPerTrade,
      proposedRiskPerTrade: params.proposedRiskPerTrade,
      reason: params.reason,
      supportingMetrics: params.supportingMetrics,
      status: ApprovalStatus.PENDING,
      expiresAt,
    };

    this.requests.set(id, request);
    return request;
  }

  /**
   * Approve a request
   */
  approve(requestId: string, approvedBy: string = "MANUAL"): ScalingRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    if (request.status === ApprovalStatus.EXPIRED) {
      return null; // Cannot approve expired request
    }

    request.status = ApprovalStatus.APPROVED;
    request.approvedAt = new Date();
    request.approvedBy = approvedBy;

    return request;
  }

  /**
   * Reject a request with reason
   */
  reject(requestId: string, reason: string, rejectedBy: string = "MANUAL"): ScalingRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    request.status = ApprovalStatus.REJECTED;
    request.rejectionReason = reason;
    request.approvedBy = rejectedBy; // Track who rejected

    return request;
  }

  /**
   * Check if proposed scaling is valid
   */
  validateScaling(params: {
    currentRiskPerTrade: number;
    proposedRiskPerTrade: number;
    successfulTrades: number;
    winRate: number;
    maxDrawdown: number;
    weeksDuration: number;
  }): {
    isValid: boolean;
    reasons: string[];
    canAutoApprove: boolean;
  } {
    const reasons: string[] = [];

    // Check each threshold
    if (params.successfulTrades < this.approvalThresholds.minSuccessfulTrades) {
      reasons.push(
        `Only ${params.successfulTrades} trades (need ${this.approvalThresholds.minSuccessfulTrades})`
      );
    }

    if (params.winRate < this.approvalThresholds.minWinRate) {
      reasons.push(`Win rate ${(params.winRate * 100).toFixed(1)}% (need ${this.approvalThresholds.minWinRate * 100}%)`);
    }

    if (params.maxDrawdown < this.approvalThresholds.maxDrawdown) {
      reasons.push(
        `Max drawdown ${(params.maxDrawdown * 100).toFixed(1)}% (limit ${this.approvalThresholds.maxDrawdown * 100}%)`
      );
    }

    if (params.weeksDuration < this.approvalThresholds.minWeeks) {
      reasons.push(`Only ${params.weeksDuration} weeks of data (need ${this.approvalThresholds.minWeeks})`);
    }

    // Check scaling size (max 50% increase per approval)
    const increasePercent = ((params.proposedRiskPerTrade - params.currentRiskPerTrade) / params.currentRiskPerTrade) * 100;
    if (increasePercent > 50) {
      reasons.push(`Scaling increase ${increasePercent.toFixed(0)}% (max 50% per approval)`);
    }

    // Auto-approve only if all thresholds met AND small increase
    const canAutoApprove = reasons.length === 0 && increasePercent <= 25;

    return {
      isValid: reasons.length === 0,
      reasons,
      canAutoApprove,
    };
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): ScalingRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.status === ApprovalStatus.PENDING && r.expiresAt > new Date())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get request history
   */
  getHistory(limit: number = 10): ScalingRequest[] {
    return Array.from(this.requests.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Generate approval report
   */
  getReport(): string {
    const pending = this.getPendingRequests();
    const history = this.getHistory(5);

    const lines: string[] = [
      `═══════════════════════════════════════════════════════════`,
      `MANUAL APPROVAL GATE REPORT`,
      `═══════════════════════════════════════════════════════════`,
      ``,
      `Thresholds:`,
      `  • Min Trades: ${this.approvalThresholds.minSuccessfulTrades}`,
      `  • Min Win Rate: ${(this.approvalThresholds.minWinRate * 100).toFixed(0)}%`,
      `  • Max Drawdown: ${(this.approvalThresholds.maxDrawdown * 100).toFixed(1)}%`,
      `  • Min Duration: ${this.approvalThresholds.minWeeks} weeks`,
      ``,
      `PENDING REQUESTS (${pending.length}):`,
    ];

    if (pending.length === 0) {
      lines.push(`  ✅ No pending requests`);
    } else {
      for (const req of pending) {
        lines.push(
          `  📋 ${req.id}`,
          `     Description: ${req.description}`,
          `     Reason: ${req.reason}`,
          `     Expires: ${req.expiresAt.toISOString()}`
        );
      }
    }

    lines.push(``, `RECENT DECISIONS (Last 5):`, ...history.map((r) => {
      const status = r.status === ApprovalStatus.APPROVED ? "✅" : r.status === ApprovalStatus.REJECTED ? "❌" : "⏳";
      return `  ${status} ${r.id}: ${r.status} on ${r.approvedAt?.toISOString() || "N/A"}`;
    }), ``, `═══════════════════════════════════════════════════════════`);

    return lines.join("\n");
  }
}
