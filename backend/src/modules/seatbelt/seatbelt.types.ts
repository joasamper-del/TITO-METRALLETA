/**
 * SEATBELT Type Definitions
 * Five-gate safety system for autonomous trading
 */

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

export interface GateResult {
  valid: boolean;
  reason: string;
  gate: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5';
  timestamp?: Date;
}

export interface SeatbeltResult {
  allGatesPass: boolean;
  gates: GateResult[];
  reason: string;
  timestamp: Date;
}

export interface SeatbeltConfig {
  ENABLED: boolean;
  MAX_RISK_PER_TRADE: number; // $ per trade
  MAX_ACCOUNT_RISK_PCT: number; // % of account
  MAX_DRAWDOWN_PCT: number; // % max drawdown allowed
  MAX_POSITION_SIZE_CRYPTO: number; // contracts/units
}

export interface MarketState {
  price: number;
  spread: number; // in basis points
  timestamp: Date;
  vix?: number;
}

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: Date;
  status: 'OPEN' | 'CLOSED' | 'EXTENDED' | 'SUSPENDED';
}

export interface Order {
  symbol: string;
  qty: number;
  price: number;
  side: 'buy' | 'sell';
  orderType?: OrderType;
}

export interface Account {
  balance: number;
  startBalance: number;
  equity: number;
}
