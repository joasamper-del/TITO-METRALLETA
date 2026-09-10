/**
 * Simple logger for credential refresh operations
 * Security: Never logs secret values
 */

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, context || '');
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, context || '');
  },

  error: (message: string, context?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, context || '');
  },

  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  },
};
