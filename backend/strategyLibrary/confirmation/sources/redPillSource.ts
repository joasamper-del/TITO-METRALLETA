/**
 * Red Pill Confirmation Source (Stub)
 * Macro-level reality check: earnings calendar, economic events, news flow
 * Identifies "black swan" risk events that invalidate technical trades
 */

import { ConfirmationSource } from "../confirmationSource";
import { ConfirmationContext, ConfirmationSourceConfig, ConfidenceVote } from "../types";

const DEFAULT_CONFIG: ConfirmationSourceConfig = {
  sourceId: "red_pill",
  sourceName: "Red Pill (Macro/News)",
  isEnabled: true,
  weight: 0.20, // 20% weight (macro is critical)
  failureMode: "VETO", // If news invalidates setup, we veto entirely
};

export class RedPillSource extends ConfirmationSource {
  constructor(config?: Partial<ConfirmationSourceConfig>) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  /**
   * TODO: Integrate real-time news and macro data
   * Expected signals:
   * - Earnings announcement within 24h (veto for individual stocks)
   * - Economic calendar event within 1h (typically high impact)
   * - Major news/headline affecting sector
   * - Fed decision/rate decision pending
   * - Geopolitical events (war, sanctions, etc.)
   *
   * Vote logic (stub):
   * - No major events, normal macro backdrop → high confidence (85)
   * - Minor economic events → neutral impact (50)
   * - Major event 24h+ away → reduce confidence slightly (65)
   * - Major event within 1h → veto (throw error with failureMode=VETO)
   * - Black swan alert → veto
   */
  async evaluate(context: ConfirmationContext): Promise<ConfidenceVote> {
    // Placeholder: until real earnings/news data available
    return 75; // Assume macro backdrop is benign by default
  }

  async getReasoning(context: ConfirmationContext, vote: ConfidenceVote): Promise<string> {
    return `Red Pill: Macro events check pending (placeholder: ${vote}/100)`;
  }

  async healthCheck(): Promise<boolean> {
    // TODO: Check if earnings calendar and news API available
    return true;
  }

  override async getReasoning(context: ConfirmationContext, vote: ConfidenceVote): Promise<string> {
    const lines: string[] = ["Red Pill (Macro/News):"];
    if (vote >= 80) {
      lines.push("  ✅ Clear macro backdrop, no major events");
    } else if (vote >= 60) {
      lines.push("  ⚠️ Minor macro headwinds, proceed with caution");
    } else {
      lines.push("  ❌ Major event risk, consider deferring");
    }
    return lines.join("\n");
  }
}
