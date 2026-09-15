# EXCEPCIONES APROBADAS — S70 Biblioteca Fase 2

**Autorización:** Víctor (OPCIÓN A)  
**Fecha:** 2026-09-13 07:16 UTC  
**Status:** ✅ CONGELADAS COMO EXCEPCIONES DOCUMENTADAS

---

## Excepciones Aprobadas (2 archivos, 2 líneas, quirúrgico)

### 1. news-api.provider.ts (Categoría 3)
```
Línea 36: process.env.NEWSAPI_KEY → process.env.NEWS_API_KEY
Razón: Coherencia canónica decisión B1
Alcance: Stricto (1 línea, sin cambios adicionales)
```

### 2. guardian-secret-masker.ts (Categoría 5)
```
Línea 25: /NEWSAPI_KEY/ → /NEWS_API_KEY/ + name field
Razón: Patrón sanitización debe reconocer NEWS_API_KEY canónico
Alcance: Stricto (1 línea, sin cambios adicionales)
```

## Limitaciones Explícitas

- ✅ Excepciones aplican ÚNICAMENTE a estos 2 archivos
- ✅ ÚNICAMENTE al renombramiento canónico (NEWSAPI → NEWS_API)
- ❌ NO extiende alcance general a Categorías 2-5
- ❌ NO autoriza cambios adicionales en ningún archivo
- ⚠️ Si tests requieren cambios Cat 2-5 → HOLD inmediato

## Registro en Matriz RTT

| Excepto | Archivo | Línea | Cambio | Aprobado |
|---------|---------|-------|--------|----------|
| NEWS_API_KEY-1 | news-api.provider.ts | 36 | env var rename | ✅ Sí |
| NEWS_API_KEY-2 | guardian-secret-masker.ts | 25 | pattern+name | ✅ Sí |

---

**Estado:** Excepciones congeladas. Proceder con 6 casos frontera + tests seguridad.
