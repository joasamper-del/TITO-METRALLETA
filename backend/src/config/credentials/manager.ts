/**
 * Central Credential Manager
 * Loads, validates, and provides access to all API credentials
 *
 * Pattern: Fail-safe. Missing credentials = clear error, never null.
 * Never exposes secrets to logs. All credential access audited.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BrokerCredential, CredentialStore, ValidationResult, StatusReport } from './types';
import {
  CredentialNotFoundError,
  CredentialMissingError,
  CredentialFieldMissingError,
  CredentialValidationError,
} from './utils/errors';
import { validateBrokerCredential, buildValidationResult, formatCredentialForLog } from './utils/validation';

@Injectable()
export class CredentialManager {
  private readonly logger = new Logger(CredentialManager.name);
  private store: CredentialStore = {};
  private brokers: BrokerCredential[] = [];
  private isLoaded = false;

  /**
   * Register a broker configuration
   * Call in constructor or module init
   */
  registerBroker(credential: BrokerCredential): void {
    this.brokers.push(credential);
    this.logger.debug(`Registered broker: ${credential.id}`);
  }

  /**
   * Load all credentials from environment
   * Called once on application startup
   * Throws immediately if validation fails
   */
  async load(): Promise<void> {
    this.logger.log('Loading credentials from environment...');

    for (const credential of this.brokers) {
      const data: Record<string, string> = {};
      const allFields = [...credential.requiredFields, ...(credential.optionalFields || [])];

      // Collect all available fields
      for (const fieldName of allFields) {
        const value = process.env[fieldName];
        if (value) {
          data[fieldName] = value;
        }
      }

      // Validate required fields
      const { isValid, missingFields } = validateBrokerCredential(credential, data);

      // Update credential status
      const updatedCredential = { ...credential };
      updatedCredential.isConfigured = isValid;

      if (!isValid) {
        updatedCredential.error = `Missing: ${missingFields.join(', ')}`;
      }

      // Store
      this.store[credential.id] = {
        data,
        credential: updatedCredential,
        loadedAt: new Date(),
      };

      this.logger.debug(formatCredentialForLog(updatedCredential));
    }

    this.isLoaded = true;
    this.logger.log(`Loaded ${Object.keys(this.store).length} brokers`);
  }

  /**
   * Validate all credentials
   * Returns detailed result, does NOT throw
   * Call this to check startup health
   */
  validate(): ValidationResult {
    if (!this.isLoaded) {
      return {
        isValid: false,
        errors: [
          {
            brokerId: 'manager',
            message: 'Credentials not loaded yet. Call load() first.',
          },
        ],
        warnings: [],
      };
    }

    const brokerList = Object.values(this.store).map(entry => ({
      credential: entry.credential,
      data: entry.data,
    }));

    return buildValidationResult(brokerList);
  }

  /**
   * Get credential metadata for a broker
   * Throws if broker not found or not configured
   */
  get(brokerId: string): BrokerCredential {
    if (!this.store[brokerId]) {
      throw new CredentialNotFoundError(brokerId);
    }

    const { credential } = this.store[brokerId];

    if (!credential.isConfigured) {
      const missingFields = credential.requiredFields.filter(
        f => !this.store[brokerId].data[f]
      );
      throw new CredentialMissingError(brokerId, missingFields);
    }

    return credential;
  }

  /**
   * Get a specific secret value for a broker
   * INTERNAL ONLY — never expose this directly
   * Used by broker clients to get their keys
   * Throws if not found
   */
  getSecret(brokerId: string, fieldName: string): string {
    if (!this.store[brokerId]) {
      throw new CredentialNotFoundError(brokerId);
    }

    const entry = this.store[brokerId];
    const value = entry.data[fieldName];

    if (!value) {
      throw new CredentialFieldMissingError(brokerId, fieldName);
    }

    // Log access (field name only, never value)
    this.logger.debug(`Accessed secret: ${brokerId}.${fieldName}`);

    return value;
  }

  /**
   * Get all secrets for a broker as an object
   * Used by broker clients like AlpacaClient
   * Example: { ALPACA_API_KEY: '...', ALPACA_SECRET_KEY: '...' }
   */
  getSecrets(brokerId: string): Record<string, string> {
    if (!this.store[brokerId]) {
      throw new CredentialNotFoundError(brokerId);
    }

    const entry = this.store[brokerId];
    const credential = entry.credential;

    if (!credential.isConfigured) {
      const missingFields = credential.requiredFields.filter(
        f => !entry.data[f]
      );
      throw new CredentialMissingError(brokerId, missingFields);
    }

    this.logger.debug(`Retrieved all secrets for: ${brokerId}`);
    return { ...entry.data };
  }

  /**
   * Get status report
   * Safe for logging and UI display (no secrets shown)
   */
  status(): StatusReport {
    const brokers = Object.values(this.store).map(entry => ({
      id: entry.credential.id,
      name: entry.credential.name,
      configured: entry.credential.isConfigured,
      error: entry.credential.error,
      authType: entry.credential.authType,
      scopes: entry.credential.scopes,
    }));

    const isReady = brokers.every(b => b.configured);

    return {
      timestamp: new Date(),
      brokers,
      isReady,
    };
  }

  /**
   * Get a formatted string of all broker statuses (for logging)
   */
  statusString(): string {
    const status = this.status();
    const lines = status.brokers.map(b =>
      `  ${b.id.padEnd(15)} ${b.configured ? '✓' : '✗'} ${b.name}`
    );
    return `Credentials Status (${status.isReady ? '✓ READY' : '✗ NOT READY'}):\n${lines.join('\n')}`;
  }

  /**
   * Check if all required credentials are configured
   */
  isReady(): boolean {
    return this.status().isReady;
  }

  /**
   * Get list of missing brokers (for debugging)
   */
  getMissing(): string[] {
    return Object.values(this.store)
      .filter(entry => !entry.credential.isConfigured)
      .map(entry => entry.credential.id);
  }
}
