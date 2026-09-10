/**
 * Heartbeat Service - Detección de silencio
 *
 * Mantiene "latido" del sistema. Si desaparece, se detecta.
 * Regla: Jamás desaparecer sin decir qué pasó
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);
  private heartbeatFile = 'data/heartbeat.jsonl';
  private lastHeartbeat: Date = new Date();
  private readonly maxAllowedMs = 60000; // 1 minuto

  constructor() {
    this.initHeartbeat();
  }

  private initHeartbeat() {
    try {
      const dir = 'data';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'heartbeat_start',
          pid: process.pid,
        }) + '\n'
      );
    } catch (err) {
      this.logger.warn(`Could not write heartbeat file: ${(err as Error).message}`);
    }
  }

  /**
   * Registrar latido
   */
  beat(context: string) {
    const now = new Date();
    this.lastHeartbeat = now;

    try {
      fs.appendFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: now.toISOString(),
          event: 'beat',
          context,
          pid: process.pid,
        }) + '\n'
      );
    } catch (err) {
      this.logger.warn(`Could not write heartbeat: ${(err as Error).message}`);
    }
  }

  /**
   * Registrar error crítico
   */
  criticalError(error: Error | string) {
    const message = typeof error === 'string' ? error : error.message;

    try {
      fs.appendFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'critical_error',
          error: message,
          pid: process.pid,
        }) + '\n'
      );
    } catch (err) {
      this.logger.error(`Could not write error to heartbeat: ${(err as Error).message}`);
    }

    this.logger.error(`🚨 CRITICAL: ${message}`);
  }

  /**
   * Registrar detenimiento
   */
  shutdown(reason: string) {
    try {
      fs.appendFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'shutdown',
          reason,
          pid: process.pid,
          uptime: process.uptime(),
        }) + '\n'
      );
    } catch (err) {
      this.logger.warn(`Could not write shutdown to heartbeat: ${(err as Error).message}`);
    }

    this.logger.log(`👋 Shutting down: ${reason}`);
  }

  /**
   * Verificar si está vivo
   */
  isAlive(): boolean {
    const timeSinceLastBeat = Date.now() - this.lastHeartbeat.getTime();
    return timeSinceLastBeat < this.maxAllowedMs;
  }

  /**
   * Obtener resumen
   */
  getStatus() {
    return {
      alive: this.isAlive(),
      lastBeat: this.lastHeartbeat,
      uptime: process.uptime(),
      pid: process.pid,
    };
  }
}
