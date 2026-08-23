# 📚 DOCUMENTACIÓN TÉCNICA - TITO METRALLETA

Este directorio contiene toda la documentación técnica del proyecto.

## 📋 Índice de Documentos

### Arquitectura y Diseño
- **[MODULES.md](./MODULES.md)** - Especificación de cada módulo
- **[API_SPEC.md](./API_SPEC.md)** - Especificación de endpoints
- **[DATABASE.md](./DATABASE.md)** - Esquema de base de datos
- **[AUTH.md](./AUTH.md)** - Sistema de autenticación

### Desarrollo
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - Guía de desarrollo
- **[CODE_STANDARDS.md](./CODE_STANDARDS.md)** - Estándares de código
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Estrategia de testing

### Deployment y DevOps
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Instrucciones de deployment
- **[CI_CD.md](./CI_CD.md)** - Pipeline CI/CD

### Mantenimiento
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Problemas comunes
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de cambios

---

## 🎯 Propósito

Mantener documentación sincronizada con el código es crítico para:

✅ **Onboarding**: Nuevos desarrolladores entienden rápidamente  
✅ **Mantenimiento**: Cambios futuros respetan arquitectura  
✅ **Escalabilidad**: Agregar features sin romper existing  
✅ **Trazabilidad**: Por qué cada decisión fue hecha  

---

## 📝 Regla de Oro

**Cuando modificas código, actualiza la documentación correlativa.**

No puede haber deuda técnica de documentación.

---

## 🔄 Sincronización

Después de cada módulo implementado:

1. ✅ Código escrito
2. ✅ Tests pasados
3. ✅ Documentación actualizada en `docs/`
4. ✅ Commit descriptivo

Ejemplo:
```bash
git commit -m "feat(core): Integrar DataEngine con tests y docs"
```

---

*Última actualización*: 2026-08-23
