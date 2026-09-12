import { SeatbeltConfig } from '../seatbelt.types';

export const SEATBELT_CONFIG: SeatbeltConfig = {
  ENABLED: process.env.SEATBELT_ENABLED === 'true',
  MAX_RISK_PER_TRADE: parseFloat(process.env.SEATBELT_MAX_RISK_PER_TRADE || '500'),
  MAX_ACCOUNT_RISK_PCT: parseFloat(process.env.SEATBELT_MAX_ACCOUNT_RISK_PCT || '2'),
  MAX_DRAWDOWN_PCT: parseFloat(process.env.SEATBELT_MAX_DRAWDOWN_PCT || '5'),
  MAX_POSITION_SIZE_CRYPTO: parseInt(process.env.SEATBELT_MAX_POSITION_SIZE_CRYPTO || '20', 10),
};
