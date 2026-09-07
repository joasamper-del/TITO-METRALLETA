/**
 * Tipos e interfaces para respuestas de Alpaca API
 */

export interface AlpacaQuote {
  t?: string; // timestamp
  bp?: number; // bid price
  bs?: number; // bid size
  ap?: number; // ask price
  as?: number; // ask size
  bx?: string; // bid exchange
  ax?: string; // ask exchange
  c?: string[]; // conditions
  z?: string; // tape
}

export interface AlpacaBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  vw?: number; // volume weighted average price
  n?: number; // number of items in aggregate
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  account_type: string;
  buying_power: number;
  cash: number;
  cash_withdrawable: number;
  created_at: string;
  currency: string;
  daytrade_buying_power: number;
  daytrading_buying_power_check: string;
  equity: number;
  estimated_daily_loss_limit: number | null;
  estimated_daily_loss_limit_check: string;
  last_equity: number;
  last_maintenance_margin: number;
  long_market_value: number;
  maintenance_margin: number;
  multiplier: string;
  portfolio_value: number;
  regt_buying_power: number;
  short_market_value: number;
  shorting_enabled: boolean;
  sma: number;
  status: string;
  trading_blocked_reason: string | null;
  trading_suspended_by_user: boolean;
  updated_at: string;
}

export interface AlpacaPosition {
  asset_id: string;
  asset_class: string;
  symbol: string;
  exchange: string;
  asset_fractional_multiplier: string;
  avg_entry_price: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_gain: string;
  unrealized_gain_pct: string;
  unrealized_intraday_gain: string;
  unrealized_intraday_gain_pct: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at?: string;
  expired_at?: string;
  canceled_at?: string;
  failed_at?: string;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price?: string;
  stop_price?: string;
  filled_avg_price?: string;
  status: 'pending_new' | 'accepted' | 'pending_cancel' | 'canceled' | 'expired' | 'filled' | 'partially_filled' | 'rejected';
  extended_hours: boolean;
  legs?: AlpacaOrder[];
}
