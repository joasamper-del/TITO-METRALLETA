/**
 * Audit logging for credentials
 * Track credential access without exposing secrets
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AuditLog {
  timestamp: string;
  event: 'load' | 'access' | 'validate' | 'error';
  broker: string;
  field?: string;
  message: string;
  severity: 'info' | 'warn' | 'error';
}

const AUDIT_LOG_PATH = path.join(process.cwd(), '.logs', 'credentials-audit.jsonl');

/**
 * Append an entry to the audit log
 * File format: newline-delimited JSON (JSONL)
 */
export function logCredentialEvent(
  event: AuditLog['event'],
  broker: string,
  message: string,
  severity: AuditLog['severity'] = 'info',
  field?: string
): void {
  // Only log in production or if explicitly enabled
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    const entry: AuditLog = {
      timestamp: new Date().toISOString(),
      event,
      broker,
      field,
      message,
      severity,
    };

    // Ensure log directory exists
    const logDir = path.dirname(AUDIT_LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Append to JSONL file
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n');
  } catch (error) {
    // Fail silently if logging fails (don't disrupt app)
    console.warn('Failed to write credential audit log:', error);
  }
}

/**
 * Get recent audit entries
 */
export function getAuditLog(lines: number = 50): AuditLog[] {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return [];
    }

    const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .slice(-lines)
      .map(line => JSON.parse(line) as AuditLog);
  } catch {
    return [];
  }
}
