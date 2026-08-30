/**
 * Confirmation Engine Module
 * Export all types, base classes, and source implementations
 * Ready to be integrated with Strategy Selector without breaking changes
 */

// Core types
export * from "./types";

// Base classes
export { ConfirmationSource, ConfidenceVote } from "./confirmationSource";
export { ConfirmationEngine } from "./confirmationEngine";
export { ConfidenceCalculator } from "./confidenceCalculator";

// Source implementations
export { TradingViewSource } from "./sources/tradingViewSource";
export { VIXSource } from "./sources/vixSource";
export { OptionLevelsSource } from "./sources/optionLevelsSource";
export { MarketSniperSource } from "./sources/marketSniperSource";
export { RedPillSource } from "./sources/redPillSource";
