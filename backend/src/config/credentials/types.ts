/**
 * Central Credentials Management — Type Definitions
 * Single source of truth for all broker & API configurations
 */

export type AuthType = 'static_key' | 'oauth2' | 'cookie' | 'bearer' | 'client_credentials';
export type Scope = 'flow' | 'orders' | 'positions' | 'market_data' | 'news' | 'alerts';

/**
 * Broker Configuration — What this broker needs & what it provides
 */
export interface BrokerCredential {
  /** Unique identifier: 'alpaca', 'massive', 'ibkr', etc. */
  id: string;

  /** Display name for logs & error messages */
  name: string;

  /** Authentication type used by this broker */
  authType: AuthType;

  /** What this broker can access (security scoping) */
  scopes: Scope[];

  /** API endpoints for this broker */
  endpoints: {
    trading?: string;
    marketData?: string;
    oauth?: string;
    [key: string]: string | undefined;
  };

  /** Environment variable names required for this broker */
  requiredFields: string[];

  /** Optional fields (may not be present) */
  optionalFields?: string[];

  /** Is this broker fully configured? */
  isConfigured: boolean;

  /** Why not configured (if isConfigured = false) */
  error?: string;
}

/**
 * Runtime credential store — holds loaded secrets & metadata
 */
export interface CredentialStore {
  [brokerId: string]: {
    /** Raw credential values: {ALPACA_API_KEY: '...', ALPACA_SECRET_KEY: '...'} */
    data: Record<string, string>;

    /** Credential metadata & status */
    credential: BrokerCredential;

    /** When loaded from .env */
    loadedAt: Date;

    /** For OAuth tokens — when this credential expires */
    expiresAt?: Date;

    /** For session cookies — when this session started */
    sessionStartedAt?: Date;
  };
}

/**
 * Validation result — what's working and what's not
 */
export interface ValidationResult {
  /** All required credentials present & valid? */
  isValid: boolean;

  /** Errors that prevent operation */
  errors: {
    brokerId: string;
    fieldName?: string;
    message: string;
  }[];

  /** Warnings (missing optional fields, expiry soon) */
  warnings: {
    brokerId: string;
    message: string;
  }[];
}

/**
 * Status report — what's configured right now
 */
export interface StatusReport {
  timestamp: Date;

  brokers: {
    id: string;
    name: string;
    configured: boolean;
    error?: string;
    authType: AuthType;
    scopes: Scope[];
  }[];

  isReady: boolean;
}
