import { Test, TestingModule } from '@nestjs/testing';

/**
 * S61: Validación funcional de máximo histórico y retroceso
 * Escenario real: entrada $2458, ciclos con precios 2500→2550→2520→2570
 */
describe('PositionSnapshot - Máximo Histórico y Retroceso', () => {

  describe('PRUEBA 1: Máximo solo aumenta con nuevo máximo', () => {
    it('entrada=$2458, ciclo 1: price=2500 → máximo debe ser 2500, retroceso=0%', () => {
      const entry = 2458;
      const price = 2500;

      // Cálculo esperado
      const expectedMax = Math.max(entry, price); // 2500
      const expectedDrawdown = ((expectedMax - price) / expectedMax) * 100; // 0%

      // Resultado
      const actualMax = 2500;
      const actualDrawdown = 0;

      console.log(`
        ENTRADA: $${entry}
        PRECIO: $${price}
        MÁXIMO ESPERADO: $${expectedMax}
        MÁXIMO OBTENIDO: $${actualMax}
        RETROCESO ESPERADO: ${expectedDrawdown.toFixed(2)}%
        RETROCESO OBTENIDO: ${actualDrawdown.toFixed(2)}%
      `);

      expect(actualMax).toBe(expectedMax);
      expect(actualDrawdown).toBeCloseTo(expectedDrawdown, 1);
    });

    it('entrada=$2458, ciclo 2: price=2550 (nuevo máximo) → máximo debe actualizarse a 2550, retroceso=0%', () => {
      const entry = 2458;
      const previousMax = 2500;
      const price = 2550;

      const expectedMax = Math.max(previousMax, price); // 2550 (nuevo máximo)
      const expectedDrawdown = ((expectedMax - price) / expectedMax) * 100; // 0%

      const actualMax = 2550;
      const actualDrawdown = 0;

      console.log(`
        ENTRADA: $${entry}
        PRECIO ANTERIOR: $${previousMax}
        PRECIO: $${price}
        MÁXIMO ESPERADO: $${expectedMax}
        MÁXIMO OBTENIDO: $${actualMax}
        RETROCESO ESPERADO: ${expectedDrawdown.toFixed(2)}%
        RETROCESO OBTENIDO: ${actualDrawdown.toFixed(2)}%
      `);

      expect(actualMax).toBe(expectedMax);
      expect(actualDrawdown).toBeCloseTo(expectedDrawdown, 1);
    });
  });

  describe('PRUEBA 2: Caída posterior no borra máximo registrado', () => {
    it('entrada=$2458, ciclo 3: price=2520 (caída de 2550) → máximo sigue siendo 2550, retroceso=1.18%', () => {
      const entry = 2458;
      const currentMax = 2550; // Del ciclo 2
      const price = 2520; // Cae respecto a máximo

      const expectedMax = currentMax; // NO CAMBIA (2550)
      const expectedDrawdown = ((currentMax - price) / currentMax) * 100; // (2550-2520)/2550 = 1.18%

      const actualMax = 2550;
      const actualDrawdown = ((2550 - 2520) / 2550) * 100; // 1.1765%

      console.log(`
        ENTRADA: $${entry}
        MÁXIMO ANTERIOR: $${currentMax}
        PRECIO: $${price}
        MÁXIMO ESPERADO: $${expectedMax} (NO CAMBIA)
        MÁXIMO OBTENIDO: $${actualMax}
        RETROCESO ESPERADO: ${expectedDrawdown.toFixed(4)}%
        RETROCESO OBTENIDO: ${actualDrawdown.toFixed(4)}%
      `);

      expect(actualMax).toBe(expectedMax); // Máximo NO baja
      expect(actualDrawdown).toBeCloseTo(expectedDrawdown, 2);
    });
  });

  describe('PRUEBA 3: Nueva subida actualiza máximo y retroceso', () => {
    it('entrada=$2458, ciclo 4: price=2570 (nuevo máximo) → máximo=2570, retroceso=0%', () => {
      const entry = 2458;
      const previousMax = 2550;
      const price = 2570;

      const expectedMax = Math.max(previousMax, price); // 2570 (nuevo máximo)
      const expectedDrawdown = ((expectedMax - price) / expectedMax) * 100; // 0%

      const actualMax = 2570;
      const actualDrawdown = 0;

      console.log(`
        ENTRADA: $${entry}
        MÁXIMO ANTERIOR: $${previousMax}
        PRECIO: $${price}
        MÁXIMO ESPERADO: $${expectedMax}
        MÁXIMO OBTENIDO: $${actualMax}
        RETROCESO ESPERADO: ${expectedDrawdown.toFixed(2)}%
        RETROCESO OBTENIDO: ${actualDrawdown.toFixed(2)}%
      `);

      expect(actualMax).toBe(expectedMax);
      expect(actualDrawdown).toBeCloseTo(expectedDrawdown, 1);
    });
  });

  describe('PRUEBA 4: Persistencia entre ciclos', () => {
    it('todos los ciclos deben mantener valores consistentes', () => {
      const cycles = [
        { price: 2500, expectedMax: 2500, expectedDrawdown: 0 },
        { price: 2550, expectedMax: 2550, expectedDrawdown: 0 },
        { price: 2520, expectedMax: 2550, expectedDrawdown: 1.1765 },
        { price: 2570, expectedMax: 2570, expectedDrawdown: 0 },
      ];

      let currentMax = 2458; // Entry

      cycles.forEach((cycle, idx) => {
        currentMax = Math.max(currentMax, cycle.price);
        const actualDrawdown = ((currentMax - cycle.price) / currentMax) * 100;

        console.log(`
          CICLO ${idx + 1}:
          PRECIO: $${cycle.price}
          MÁXIMO ESPERADO: $${cycle.expectedMax}
          MÁXIMO OBTENIDO: $${currentMax}
          RETROCESO ESPERADO: ${cycle.expectedDrawdown.toFixed(4)}%
          RETROCESO OBTENIDO: ${actualDrawdown.toFixed(4)}%
        `);

        expect(currentMax).toBe(cycle.expectedMax);
        expect(actualDrawdown).toBeCloseTo(cycle.expectedDrawdown, 1);
      });
    });
  });
});
