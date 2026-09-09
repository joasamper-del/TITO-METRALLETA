/**
 * TitoAPI - Cliente HTTP para conectar frontend con backend
 * Intenta conectar a /api/analyze y fallback a motor mock local si falla
 *
 * ACTUALIZACIÓN SESIÓN 6:
 * - Backend migrado a puerto 3001
 * - Endpoint dinámico usando window.location.hostname
 * - Analysis ahora tiene fallback estructurado con manualReviewNeeded
 */
class TitoAPI {
  constructor(baseUrl, timeout = 5000) {
    // Si no se proporciona baseUrl, usar window.location.hostname dinámicamente
    if (!baseUrl) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      this.baseUrl = `http://${hostname}:3001`;
    } else {
      this.baseUrl = baseUrl;
    }
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Analiza un símbolo con estrategia
   * Retorna {analysis, source: 'backend'|'mock', error?: string}
   */
  async analyze(symbol, strategy, plan) {
    try {
      const response = await this.postWithTimeout(
        `${this.baseUrl}/api/analyze`,
        {
          symbol,
          strategy,
          plan,
        },
        this.timeout
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        analysis: data,
        source: 'backend',
        error: null,
      };
    } catch (error) {
      // Si falla, retornar mock con indicador
      return {
        analysis: null,
        source: 'mock',
        error: error.message,
      };
    }
  }

  /**
   * POST con timeout
   */
  postWithTimeout(url, data, timeoutMs) {
    return Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Verifica si el backend está disponible
   */
  async isBackendAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Exportar si está en contexto de módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitoAPI;
}
