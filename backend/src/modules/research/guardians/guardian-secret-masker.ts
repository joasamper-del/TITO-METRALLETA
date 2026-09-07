/**
 * Guardian Secret Masker - Default Behavior
 *
 * Guardian automatically masks ALL secrets in:
 * - Logs
 * - Error messages
 * - Reports
 * - Output
 *
 * No configuration needed. Always on.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class GuardianSecretMasker {
  private readonly secretPatterns = [
    // API Keys
    { pattern: /apikey[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'API_KEY' },
    { pattern: /api_key[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'API_KEY' },
    { pattern: /NEWSAPI_KEY[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'NEWSAPI_KEY' },

    // Tokens
    { pattern: /token[=:\s]+([a-zA-Z0-9._-]+)/gi, name: 'TOKEN' },
    { pattern: /authorization[=:\s]+Bearer\s+([a-zA-Z0-9._-]+)/gi, name: 'AUTH_TOKEN' },

    // Credentials
    { pattern: /password[=:\s]+([^\s,;}\]]+)/gi, name: 'PASSWORD' },
    { pattern: /secret[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'SECRET' },

    // URLs with credentials
    { pattern: /https?:\/\/([^:]+):([^@]+)@/gi, name: 'URL_CREDS' },

    // Cookies
    { pattern: /cookie[=:\s]+([^\s,;}\]]+)/gi, name: 'COOKIE' },
    { pattern: /session[=:\s]+([a-zA-Z0-9]+)/gi, name: 'SESSION' },
  ];

  /**
   * MASK SECRETS IN STRING
   *
   * Replaces all detected secrets with ***MASKED***
   */
  maskSecrets(input: string): string {
    if (!input) return input;

    let masked = input;

    this.secretPatterns.forEach(({ pattern, name }) => {
      masked = masked.replace(pattern, `***MASKED_${name}***`);
    });

    return masked;
  }

  /**
   * MASK SECRETS IN OBJECT
   *
   * Recursively masks secrets in any object
   */
  maskSecretsInObject(obj: any): any {
    if (!obj) return obj;

    if (typeof obj === 'string') {
      return this.maskSecrets(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSecretsInObject(item));
    }

    if (typeof obj === 'object') {
      const masked: any = {};

      for (const [key, value] of Object.entries(obj)) {
        // Automatically mask certain field names
        if (
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('credential') ||
          key.toLowerCase().includes('apikey')
        ) {
          masked[key] = '***MASKED***';
        } else {
          masked[key] = this.maskSecretsInObject(value);
        }
      }

      return masked;
    }

    return obj;
  }

  /**
   * VERIFY NO SECRETS EXPOSED
   *
   * Returns list of detected secrets
   */
  findSecrets(input: string): Array<{ type: string; value: string }> {
    const found: Array<{ type: string; value: string }> = [];

    this.secretPatterns.forEach(({ pattern, name }) => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        found.push({
          type: name,
          value: match[1] || match[0],
        });
      }
    });

    return found;
  }
}
