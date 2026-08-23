# ✅ CRITERIOS DE FINALIZACIÓN DE FASES

**Documento Crítico**: Define qué significa "una fase está completada".

---

## 🎯 REGLA DE ORO

**UNA FASE NO SE CONSIDERA COMPLETADA HASTA QUE:**

1. ✅ **TODO COMPILA** sin errores
2. ✅ **TODOS LOS TESTS PASAN** (>80% coverage)
3. ✅ **ESTÁ DOCUMENTADO** (docs, comentarios, ejemplos)
4. ✅ **COMMIT DESCRIPTIVO** (mensaje claro y atómico)
5. ✅ **INTEGRADO CORRECTAMENTE** sin romper nada existente

---

## 🔍 CHECKLIST DETALLADO

### 1️⃣ COMPILACIÓN SIN ERRORES

```bash
# DEBE pasar
npm run build
# Output: Successful compilation

# NO debe haber:
# ❌ TypeScript errors
# ❌ ESLint warnings (excepto warning explícitos)
# ❌ Missing imports
# ❌ Type mismatches
```

**Verificación**:
```bash
npm run build    # Debe completar sin errores
npm run lint     # Debe pasar sin errores críticos
npm run format   # Debe formatear correctamente
```

---

### 2️⃣ TESTS PASAN (>80% COVERAGE)

```bash
# DEBE ejecutar sin fallos
npm run test

# DEBE tener coverage
npm run test:cov

# Requisitos:
# ✅ Cobertura general: >80%
# ✅ Funciones críticas: >90%
# ✅ Error handling: 100%
```

**Qué testa**:
- ✅ Lógica principal (happy path)
- ✅ Edge cases
- ✅ Error cases
- ✅ Integración con otros módulos
- ✅ Comportamiento esperado

**Ejemplo**:
```
======= Coverage summary =======
Statements   : 85.5% ( 500/585 )
Branches     : 82.3% ( 250/304 )
Functions    : 88.9% ( 160/180 )
Lines        : 86.2% ( 430/498 )
=====================================
✅ PASS: Coverage > 80%
```

---

### 3️⃣ DOCUMENTADO COMPLETAMENTE

#### Código
- [ ] Funciones con JSDoc (si no es autoexplicativo)
- [ ] Parámetros documentados
- [ ] Return types explícitos
- [ ] Ejemplos de uso en comentarios (si es complejo)

#### Documentación Externa
- [ ] `docs/MODULES.md` actualizado con cambios
- [ ] README.md del módulo actualizado
- [ ] Ejemplos de uso (si es necesario)
- [ ] Decisiones de diseño explicadas

#### API (si es endpoint)
- [ ] Swagger/OpenAPI spec
- [ ] Request/Response ejemplos
- [ ] Códigos de error documentados
- [ ] Casos de uso documentados

**Ejemplo de código documentado**:
```typescript
/**
 * Analiza una oportunidad de trading
 * @param symbol - Símbolo del stock (ej: AAPL)
 * @param strategy - Estrategia a usar (ej: Momentum)
 * @param plan - Plan con entry/target/stop
 * @returns Reporte con decisión y confianza
 * @throws BadRequestException si symbol no es válido
 * @example
 * const report = await analyzeService.analyze('AAPL', 'Momentum', {...});
 * console.log(report.decision); // 'operar'
 */
async analyze(
  symbol: string,
  strategy: string,
  plan: PlanDto,
): Promise<OpportunityReport> {
  // Implementación
}
```

---

### 4️⃣ COMMIT DESCRIPTIVO

```bash
# ✅ CORRECTO
git commit -m "feat(core): Integrar 3 motores con tests y documentación

Qué se implementó:
- DataEngine integrado como provider
- RulesEngine con inicialización correcta
- ReportEngine con métodos expuestos
- Analyzer orquestando los 3 motores

Por qué:
- Necesario para exponer funcionalidad core vía NestJS
- Permite que API acceda a motores sin acoplamiento

Archivos modificados:
- backend/src/modules/core/core.module.ts
- backend/src/modules/core/core.module.spec.ts

Tests:
- 15 tests unitarios (100% pass)
- 5 tests de integración (100% pass)
- Coverage: 87%

Documentación:
- docs/MODULES.md actualizado
- JSDoc completo en core.module.ts"

# ❌ INCORRECTO
git commit -m "fix stuff"
git commit -m "updated"
git commit -m "WIP"
```

**Formato de Commit** (ver CODE_STANDARDS.md):
```
<type>(<scope>): <subject>

<body detallado>

<footer>
```

**Tipos**:
- `feat` - Nueva funcionalidad
- `fix` - Corrección de bug
- `test` - Tests nuevos/modificados
- `docs` - Documentación
- `refactor` - Refactorización sin cambio de API
- `chore` - Cambios de dependencias, build

---

### 5️⃣ INTEGRADO CORRECTAMENTE

#### No Rompe Nada Existente
```bash
# DEBE pasar TODO
npm run test      # Todos los tests antiguos + nuevos
npm run lint      # Todo el código
npm run build     # Build completo
npm run start:dev # Inicia sin errores
```

#### Compatibilidad Hacia Atrás
- [ ] Endpoints existentes todavía funcionan
- [ ] DTOs no cambiaron (o deprecated correctamente)
- [ ] Base de datos migraciones aplicables
- [ ] No hay breaking changes sin versión major

#### Flujo de Integración
```
1. ✅ Implementar en feature branch
2. ✅ Todos los tests pasan localmente
3. ✅ Código formateado y linteado
4. ✅ Documentación completa
5. ✅ Push a remote
6. ✅ Crear PR
7. ✅ Revisar cambios
8. ✅ Merge a develop (nunca push directo)
9. ✅ Verificar que develop compila
10. ✅ Cuando toda la fase está lista: Merge a main con tag
```

---

## 📊 MATRIZ DE COMPLETION

Para cada fase:

| Aspecto | ¿Completado? | Verificación |
|---------|-------------|--------------|
| Compilación | ✅/❌ | `npm run build` |
| Tests (>80%) | ✅/❌ | `npm run test:cov` |
| Documentación | ✅/❌ | Revisar docs/ |
| Commit descriptivo | ✅/❌ | Revisar git log |
| Integración limpia | ✅/❌ | No breaking changes |
| Linting | ✅/❌ | `npm run lint` |
| Formateado | ✅/❌ | `npm run format` |

**Una fase está COMPLETADA cuando TODOS son ✅**

---

## 🎯 CHECKLIST FINAL POR FASE

### ANTES de Merge a Develop
```
[ ] npm run build     ✅ Sin errores
[ ] npm run test:cov  ✅ >80% coverage
[ ] npm run lint      ✅ Sin errores críticos
[ ] npm run start:dev ✅ Inicia correctamente
[ ] Documentación     ✅ Actualizada
[ ] Commit message    ✅ Descriptivo
[ ] Testing endpoints ✅ Manuales funcionales
[ ] NO breaking changes ✅ Verificado
```

### ANTES de Merge a Main (Release)
```
[ ] Toda la fase completa
[ ] Tag de versión creado (v0.1.0, v0.2.0, etc)
[ ] CHANGELOG actualizado
[ ] Release notes creadas
[ ] Deployment probado
[ ] Rollback plan definido
```

---

## ❌ ANTIPATRONES (Cosas que NO hacer)

```typescript
// ❌ NO HACER: Commit "WIP" o "testing"
git commit -m "WIP"
git commit -m "testing stuff"

// ❌ NO HACER: Tests que pasan por accidente
describe('it works', () => {
  it('should do something', () => {
    // No aserts, test pasa siempre
  });
});

// ❌ NO HACER: Código sin documentar
export class ComplexAlgorithm {
  // Sin explicación de qué hace
  calculate(data) { /* 200 líneas */ }
}

// ❌ NO HACER: Romper tests existentes
// Cambiar API sin actualizar otros módulos
// Modificar entity sin migración

// ❌ NO HACER: Deuda técnica
// "Lo arreglamos después"
// "Ya sabemos que tiene ese bug"
```

---

## ✅ VIRTUDES (Cómo hacerlo bien)

```typescript
// ✅ HACER: Documentación clara
/**
 * Calcula score de oportunidad basado en reglas
 * @param data - Datos de mercado
 * @returns Score 0-100
 */
calculate(data: MarketData): number {
  // Implementación clara
  return Math.round(score);
}

// ✅ HACER: Tests claros
describe('AnalyzeService', () => {
  it('should return operar when confidence >= 85', () => {
    const report = service.analyze(mockData);
    expect(report.decision).toBe('operar');
  });
});

// ✅ HACER: Commits descriptivos
git commit -m "feat(api): Implementar POST /api/analyze

Qué: Nuevo endpoint que recibe oportunidad y retorna análisis
Por qué: Requerido por TECH_STACK.md para exponer DataEngine
Cambios: +150 líneas en analyze.controller.ts
Tests: 5 tests nuevos (100% pass)
Docs: Actualizado MODULES.md"

// ✅ HACER: Integración segura
if (importantChange) {
  // Tests completos
  // Documentación actualizada
  // Migración de datos si aplica
  // Verificación local
  // ENTONCES merge
}
```

---

## 🚀 PROCESO PARA CADA FASE

### Día de Implementación
```
1. Código ✍️
2. Tests ✅
3. Documentación 📝
4. Formateado + Linteo 🎨
5. Commit descriptivo 💾
```

### Antes de Merge
```
1. ✅ npm run build
2. ✅ npm run test:cov
3. ✅ npm run lint
4. ✅ Code review
5. ✅ Merge a develop
6. ✅ Verificar develop compila
```

### Cuando Fase Completa
```
1. ✅ Todos los módulos de fase listos
2. ✅ Merge a main
3. ✅ Tag de versión (git tag v1.0.0)
4. ✅ Release notes
5. ✅ Anunciar
```

---

## 📞 CÓMO SABER SI ESTÁ COMPLETO

### Tests te dicen:
- "¿Funciona el código?" → Tests pasan = Sí
- "¿Cuánto código testeo?" → Coverage report
- "¿Manejamos errores?" → Error case tests

### Documentación te dice:
- "¿Entiende alguien qué hace?" → Docs claros = Sí
- "¿Alguien puede usarlo?" → Ejemplos presentes = Sí

### Compilación te dice:
- "¿Es válido el TypeScript?" → npm run build
- "¿Seguimos estándares?" → npm run lint

### Integración te dice:
- "¿Rompemos algo?" → Tests de otros módulos
- "¿Es seguro mergear?" → Código review + tests

**SI TODO ESTO PASA → FASE COMPLETADA** ✅

---

## 🎓 RESUMEN

Una fase está completada cuando:

```
┌─────────────────────────────────────┐
│ ✅ Código escrito                   │
│ ✅ Tests pasan (>80%)               │
│ ✅ Documentado completamente        │
│ ✅ Commit descriptivo               │
│ ✅ Integrado sin romper nada        │
└─────────────────────────────────────┘
         ↓
 FASE REALMENTE COMPLETADA
```

**No código "casi hecho". No documentación "para después".**

**Completado = 100% listo para producción.**

---

*Última actualización*: 2026-08-23  
*Criticidad*: 🔴 ALTA - Aplicar en cada fase
