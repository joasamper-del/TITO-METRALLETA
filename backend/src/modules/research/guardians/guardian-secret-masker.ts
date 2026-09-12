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
    // Alpaca Credentials (CRITICAL)
    { pattern: /ALPACA_KEY[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'ALPACA_KEY' },
    { pattern: /APCA-API-KEY-ID[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'ALPACA_KEY' },
    { pattern: /APCA-API-SECRET-KEY[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'ALPACA_SECRET' },

    // API Keys (generic and specific)
    { pattern: /API_KEY[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'API_KEY' },
    { pattern: /API\s+key[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'API_KEY' },
    { pattern: /apikey[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'API_KEY' },
    { pattern: /api_key[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'API_KEY' },
    { pattern: /MASSIVE_API_KEY[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'MASSIVE_API_KEY' },
    { pattern: /NEWSAPI_KEY[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'NEWSAPI_KEY' },
    { pattern: /FRED_API_KEY[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'FRED_API_KEY' },
    // Catch long alphanumeric strings that look like API keys (25+ chars)
    { pattern: /\b([A-Z0-9_]{20,})\b/g, name: 'API_KEY_LONG' },

    // Tokens
    { pattern: /token[=:\s]+([a-zA-Z0-9._-]+)/gi, name: 'TOKEN' },
    { pattern: /authorization[=:\s]+Bearer\s+([a-zA-Z0-9._-]+)/gi, name: 'AUTH_TOKEN' },

    // Credentials
    { pattern: /password[=:\s]+([^\s,;}\]]+)/gi, name: 'PASSWORD' },
    { pattern: /secret[=:\s]+([a-zA-Z0-9_-]+)/gi, name: 'SECRET' },

    // URLs with credentials (http, https, postgresql, mysql, etc.) - match username:password@host pattern
    { pattern: /(\w+):\/\/([^:]+):([^@]+)@/gi, name: 'URL_CREDS' },
    // Also match bare username:password patterns in URLs
    { pattern: /:([^@\s:]+)@/gi, name: 'PASSWORD' },

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
        // Automatically mask certain field names (but be specific to avoid false positives)
        const lowerKey = key.toLowerCase();
        const isSecretKey =
          lowerKey.includes('apikey') ||
          lowerKey.includes('api_key') ||
          lowerKey.includes('secretkey') ||
          lowerKey.includes('secret_key') ||
          lowerKey.includes('accesskey') ||
          lowerKey.includes('access_key') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('password') ||
          lowerKey.includes('credential') ||
          (lowerKey.includes('key') && (lowerKey.includes('api') || lowerKey.includes('secret') || lowerKey.includes('access')));

        if (isSecretKey && typeof value !== 'object') {
          // Mask primitive secrets (strings, numbers, etc)
          masked[key] = '***MASKED***';
        } else if (Array.isArray(value) && isSecretKey) {
          // Mask all items in secret arrays
          masked[key] = value.map(() => '***MASKED***');
        } else {
          // Recursively process objects/arrays that aren't direct secret values
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
