/**
 * Credentials Module
 * Registers CredentialManager and HealthCheckService globally
 */

import { Module } from '@nestjs/common';
import { CredentialManager } from './manager';
import { HealthCheckService } from './health/health.service';
import {
  AlpacaBroker,
  MassiveBroker,
  MarketSnackBroker,
  SchwabBroker,
  NewsAPIBroker,
  FREDBroker,
  TradingViewBroker,
} from './brokers';

@Module({
  providers: [
    {
      provide: CredentialManager,
      useFactory: async () => {
        const manager = new CredentialManager();

        // Register all brokers
        manager.registerBroker(AlpacaBroker);
        manager.registerBroker(MassiveBroker);
        manager.registerBroker(MarketSnackBroker);
        manager.registerBroker(SchwabBroker);
        manager.registerBroker(NewsAPIBroker);
        manager.registerBroker(FREDBroker);
        manager.registerBroker(TradingViewBroker);

        // Load credentials from environment
        await manager.load();

        // Validate and warn if issues
        const result = manager.validate();
        if (!result.isValid) {
          console.error('⚠️  Credential validation failed:');
          result.errors.forEach(err => console.error(`   [${err.brokerId}] ${err.message}`));
        }

        if (result.warnings.length > 0) {
          console.warn('⚠️  Credential warnings:');
          result.warnings.forEach(warn => console.warn(`   [${warn.brokerId}] ${warn.message}`));
        }

        // Print status
        console.log(manager.statusString());

        return manager;
      },
    },
    HealthCheckService,
  ],
  exports: [CredentialManager, HealthCheckService],
})
export class CredentialsModule {}
