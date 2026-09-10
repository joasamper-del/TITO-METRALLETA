/**
 * Validation utilities for credentials
 * Check required fields, warn about optional, detect issues
 */

import { BrokerCredential, ValidationResult } from '../types';

/**
 * Check if all required fields are present and non-empty
 */
export function validateBrokerCredential(
  credential: BrokerCredential,
  data: Record<string, string>
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of credential.requiredFields) {
    if (!data[field] || data[field].trim() === '') {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Check if a credential will expire soon
 */
export function willExpireSoon(expiresAt?: Date, thresholdHours: number = 1): boolean {
  if (!expiresAt) return false;

  const now = new Date();
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;

  return timeUntilExpiry < thresholdMs;
}

/**
 * Format a credential for logging (never shows secrets)
 */
export function formatCredentialForLog(credential: BrokerCredential): string {
  return `[${credential.id}] ${credential.name} (${credential.authType}) — ${
    credential.isConfigured ? '✓ configured' : `✗ missing: ${credential.requiredFields.join(', ')}`
  }`;
}

/**
 * Build a comprehensive validation result
 */
export function buildValidationResult(
  brokers: Array<{
    credential: BrokerCredential;
    data: Record<string, string>;
  }>
): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  for (const { credential, data } of brokers) {
    const { isValid, missingFields } = validateBrokerCredential(credential, data);

    if (!isValid) {
      errors.push({
        brokerId: credential.id,
        fieldName: missingFields[0],
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    if (credential.expiresAt && willExpireSoon(credential.expiresAt)) {
      warnings.push({
        brokerId: credential.id,
        message: `Credential expires soon (${credential.expiresAt.toISOString()})`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
