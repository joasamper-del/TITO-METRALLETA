/**
 * Interactive Brokers OAuth & Authentication
 * Handles token exchange, refresh, and account validation
 *
 * TODO (next session): Replace stubs with real IBKR OAuth endpoints
 */

import axios, { AxiosInstance } from "axios";

export interface IBKrOAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface IBKrAuthConfig {
  accountId: string;
  apiKey: string; // OAuth token or API key
  baseUrl?: string;
}

export interface IBKrAccount {
  accountId: string;
  accountType: "paper" | "live";
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  equity: number;
  buyingPower: number;
  currency: string;
}

export class IBKrAuth {
  private accountId: string;
  private apiKey: string;
  private baseUrl: string = "https://api.ibkr.cloud";
  private accessToken: string;
  private refreshToken?: string;
  private tokenExpiry: Date;
  private apiClient: AxiosInstance;

  constructor(config: IBKrAuthConfig) {
    this.accountId = config.accountId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.ibkr.cloud";
    this.accessToken = config.apiKey; // Use provided key as initial token
    this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h expiry

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  /**
   * OAuth Token Exchange (Stub - TODO: Implement real OAuth)
   * When IBKR account is ready, replace with actual OAuth endpoint
   */
  async exchangeOAuthToken(authCode: string): Promise<IBKrOAuthToken> {
    console.log("🔐 IBKr OAuth Token Exchange (STUB)");
    console.log(`   Auth Code: ${authCode.substring(0, 10)}...`);

    // STUB: Mock response (TODO: Replace with real OAuth endpoint)
    const mockToken: IBKrOAuthToken = {
      accessToken: `token_${Date.now()}`,
      refreshToken: `refresh_${Date.now()}`,
      expiresIn: 86400, // 24 hours
      tokenType: "Bearer",
      scope: "accounts orders positions",
    };

    this.accessToken = mockToken.accessToken;
    this.refreshToken = mockToken.refreshToken;
    this.tokenExpiry = new Date(Date.now() + mockToken.expiresIn * 1000);

    console.log(`✅ Token exchanged (expires in ${mockToken.expiresIn}s)`);
    return mockToken;
  }

  /**
   * Refresh OAuth Token (Stub)
   * TODO: Implement real refresh logic
   */
  async refreshOAuthToken(): Promise<IBKrOAuthToken> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    console.log("🔄 Refreshing IBKR OAuth Token...");

    // STUB: Mock refresh
    const mockToken: IBKrOAuthToken = {
      accessToken: `token_${Date.now()}`,
      refreshToken: `refresh_${Date.now()}`,
      expiresIn: 86400,
      tokenType: "Bearer",
      scope: "accounts orders positions",
    };

    this.accessToken = mockToken.accessToken;
    this.tokenExpiry = new Date(Date.now() + mockToken.expiresIn * 1000);

    this.updateApiClient();
    console.log("✅ Token refreshed");
    return mockToken;
  }

  /**
   * Get Current Valid Access Token
   * Refreshes if expired
   */
  async getAccessToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshOAuthToken();
    }
    return this.accessToken;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    const now = new Date();
    const expiresIn = this.tokenExpiry.getTime() - now.getTime();
    return expiresIn < 60000; // Refresh if less than 1 minute left
  }

  /**
   * Validate Credentials & Get Account Info
   */
  async validateCredentials(): Promise<IBKrAccount> {
    try {
      console.log("🔐 Validating IBKR credentials...");
      console.log(`   Account ID: ${this.accountId}`);

      // Get access token (refresh if needed)
      const token = await this.getAccessToken();

      // STUB: Mock account validation
      // TODO: Replace with actual IBKR /account endpoint
      const mockAccount: IBKrAccount = {
        accountId: this.accountId,
        accountType: "paper",
        status: "ACTIVE",
        equity: 100000,
        buyingPower: 400000,
        currency: "USD",
      };

      console.log("✅ Credentials validated");
      console.log(`   Account Type: ${mockAccount.accountType}`);
      console.log(`   Status: ${mockAccount.status}`);
      console.log(`   Equity: $${mockAccount.equity.toLocaleString()}`);
      console.log(`   Buying Power: $${mockAccount.buyingPower.toLocaleString()}`);

      return mockAccount;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Credential validation failed: ${msg}`);
      throw error;
    }
  }

  /**
   * Set Active Account Context
   */
  async setAccountContext(accountId: string): Promise<void> {
    console.log(`🔄 Setting account context to: ${accountId}`);
    this.accountId = accountId;

    // Update API client headers if needed
    this.updateApiClient();

    console.log("✅ Account context set");
  }

  /**
   * Verify Account is Paper Trading
   */
  async verifyPaperTradingMode(): Promise<boolean> {
    try {
      const account = await this.validateCredentials();
      if (account.accountType !== "paper") {
        console.warn("⚠️  Account is LIVE trading, not PAPER");
        return false;
      }
      console.log("✅ Paper trading mode confirmed");
      return true;
    } catch (error) {
      console.error("❌ Failed to verify paper trading mode");
      return false;
    }
  }

  /**
   * Get API Client (for making authenticated requests)
   */
  getApiClient(): AxiosInstance {
    return this.apiClient;
  }

  /**
   * Update API Client Headers (e.g., after token refresh)
   */
  private updateApiClient(): void {
    this.apiClient.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${this.accessToken}`;
  }

  /**
   * Logout / Revoke Token
   */
  async logout(): Promise<void> {
    console.log("🔐 Logging out from IBKR...");

    this.accessToken = "";
    this.refreshToken = undefined;
    this.tokenExpiry = new Date();

    console.log("✅ Logged out");
  }

  /**
   * Get Token Status
   */
  getTokenStatus(): {
    isValid: boolean;
    expiresIn: number;
    expiresSoon: boolean;
  } {
    const now = new Date();
    const expiresIn = this.tokenExpiry.getTime() - now.getTime();
    const isValid = expiresIn > 0;
    const expiresSoon = expiresIn < 300000; // Less than 5 minutes

    return { isValid, expiresIn: Math.floor(expiresIn / 1000), expiresSoon };
  }
}
