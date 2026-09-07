/**
 * Guardian Logger Wrapper
 *
 * Automatically masks ALL secrets in logs before output.
 * Used by all Guardian modules to ensure zero secret exposure.
 */

import { Logger } from '@nestjs/common';
import { GuardianSecretMasker } from './guardian-secret-masker';

export class GuardianLoggerWrapper {
  private masker = new GuardianSecretMasker();

  constructor(private readonly logger: Logger) {}

  log(message: string, context?: string): void {
    const masked = this.masker.maskSecrets(message);
    this.logger.log(masked, context);
  }

  error(message: string, trace?: string, context?: string): void {
    const maskedMessage = this.masker.maskSecrets(message);
    const maskedTrace = trace ? this.masker.maskSecrets(trace) : undefined;
    this.logger.error(maskedMessage, maskedTrace, context);
  }

  warn(message: string, context?: string): void {
    const masked = this.masker.maskSecrets(message);
    this.logger.warn(masked, context);
  }

  debug(message: string, context?: string): void {
    const masked = this.masker.maskSecrets(message);
    this.logger.debug(masked, context);
  }

  verbose(message: string, context?: string): void {
    const masked = this.masker.maskSecrets(message);
    this.logger.verbose(masked, context);
  }

  /**
   * Mask secrets in any object (for report output)
   */
  maskObject(obj: any): any {
    return this.masker.maskSecretsInObject(obj);
  }

  /**
   * Verify no secrets in string
   */
  verifyNoSecrets(input: string): { safe: boolean; found: Array<{ type: string; value: string }> } {
    const found = this.masker.findSecrets(input);
    return {
      safe: found.length === 0,
      found,
    };
  }
}
