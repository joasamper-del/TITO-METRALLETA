/**
 * Custom error classes for credential management
 * Fail-safe: clear error messages, never improvisational
 */

export class CredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialError';
  }
}

export class CredentialNotFoundError extends CredentialError {
  constructor(brokerId: string) {
    super(
      `Broker "${brokerId}" is not registered. ` +
      `Available brokers: alpaca, massive, marketsnack, schwab, newsapi, fred, tradingview`
    );
    this.name = 'CredentialNotFoundError';
  }
}

export class CredentialMissingError extends CredentialError {
  constructor(brokerId: string, missingFields: string[]) {
    super(
      `Broker "${brokerId}" is not configured. ` +
      `Missing environment variables: ${missingFields.join(', ')}. ` +
      `Add them to .env.local and restart the application.`
    );
    this.name = 'CredentialMissingError';
  }
}

export class CredentialFieldMissingError extends CredentialError {
  constructor(brokerId: string, fieldName: string) {
    super(
      `Field "${fieldName}" for broker "${brokerId}" is not configured. ` +
      `Add it to .env.local and restart.`
    );
    this.name = 'CredentialFieldMissingError';
  }
}

export class CredentialValidationError extends CredentialError {
  errors: Array<{ broker: string; field?: string; message: string }>;

  constructor(errors: Array<{ broker: string; field?: string; message: string }>) {
    const summary = errors.map(e => `[${e.broker}] ${e.message}`).join('\n  ');
    super(
      `Credential validation failed. Fix these issues and restart:\n  ${summary}`
    );
    this.name = 'CredentialValidationError';
    this.errors = errors;
  }
}

export class CredentialExpiredError extends CredentialError {
  constructor(brokerId: string, expiresAt: Date) {
    super(
      `Credential for "${brokerId}" expired at ${expiresAt.toISOString()}. ` +
      `Refresh it or update .env.local and restart.`
    );
    this.name = 'CredentialExpiredError';
  }
}
