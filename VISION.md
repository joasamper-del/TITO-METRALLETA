# 🎯 VISION - TITO METRALLETA

**Documento Rector del Proyecto**  
**Última actualización**: 2026-08-23  
**Versión**: 1.0

---

## 🎪 OBJETIVO FINAL

Crear un **sistema inteligente, modular y confiable de análisis de trading** que:

1. **Analiza** oportunidades de trading basado en datos de mercado reales
2. **Genera** reportes automáticos con recomendaciones fundamentadas
3. **Registra** resultados (paper trading) y aprende de la experiencia
4. **Optimiza** reglas basado en datos históricos
5. **Notifica** automáticamente cuando hay oportunidades
6. **Proporciona** una interfaz clara y profesional para traders

**Visión a largo plazo**: Pasar de paper trading a trading real con broker integrado, manteniendo máxima seguridad y control.

---

## 🚫 REGLAS QUE NUNCA SE DEBEN ROMPER

Estas son leyes fundamentales del proyecto. **No negociables**.

### 1. **Seguridad y Protección de Datos**
- ❌ NUNCA almacenar credenciales en código o logs
- ❌ NUNCA enviar datos sensibles sin encriptación
- ❌ NUNCA permitir órdenes de trading sin confirmación explícita (incluso en papel)
- ✅ Todos los secretos en variables de entorno (.env)
- ✅ Validación de entrada en TODOS los endpoints
- ✅ Rate limiting para evitar abuse

### 2. **Integridad de Datos y Histórico**
- ❌ NUNCA borrar reportes o resultados de trading
- ❌ NUNCA modificar un resultado registrado (crear versión nueva si es necesario)
- ❌ NUNCA perder customizaciones del usuario en actualizaciones
- ✅ Todo cambio está versionado en Git
- ✅ Cada resultado tiene timestamp y trazabilidad
- ✅ Backup automático de BD

### 3. **Confiabilidad del Motor Core**
- ❌ NUNCA cambiar la lógica de cálculo de puntuación sin versión major
- ❌ NUNCA desactivar reglas por defecto sin aviso explícito
- ❌ NUNCA usar datos sin validar disponibilidad
- ✅ Código core bien testeado (>80% coverage)
- ✅ Reglas tienen descripción clara y rationale
- ✅ Todas las decisiones son reproducibles

### 4. **Arquitectura Modular**
- ❌ NUNCA crear dependencias circulares entre motores
- ❌ NUNCA mezclar responsabilidades en un motor
- ❌ NUNCA hardcodear valores configurables
- ✅ Los 3 motores son independientes y testeables
- ✅ Coordinador orquesta sin modificar lógica interna
- ✅ Nueva regla = agregar, no modificar

### 5. **Documentación y Comunicación**
- ❌ NUNCA hacer commit sin mensaje descriptivo
- ❌ NUNCA lanzar feature sin actualizar documentación
- ❌ NUNCA romper interfaz pública sin deprecation warning
- ✅ README describe cómo usar
- ✅ ARCHITECTURE.md explica diseño
- ✅ Cambios grandes = PR con explicación
- ✅ Código es autoexplicativo (nombres claros)

### 6. **Control del Usuario**
- ❌ NUNCA integrar cambios de Víctor sin aprobación explícita
- ❌ NUNCA sobrescribir customizaciones sin backup
- ❌ NUNCA hacer cambios destructivos en rama main
- ✅ Rama de prueba para updates upstream
- ✅ Usuario siempre tiene control total
- ✅ Cambios pueden deshacerse fácilmente

---

## 🔧 FUNCIONES PRINCIPALES

### Funciones Core (Motores Independientes)

#### 1. **Data Engine** - Obtener y Analizar Datos
```
Entrada: Símbolo (AAPL, SPY, etc)
Proceso:
  - Obtener precio, volumen, tendencia
  - Calcular RSI, GEX, liquidez
  - Determinar soportes/resistencias
  - Marcar Premium/Discount
  - Validar disponibilidad de datos
Salida: MarketData estructurado
Garantía: Datos fiables o marca para revisión manual
```

#### 2. **Rules Engine** - Evaluar Oportunidades
```
Entrada: MarketData + MarketContext
Proceso:
  - Evaluar 10 reglas configurables
  - Calcular puntuación (0-100)
  - Determinar decisión automática
  - Determinar nivel de riesgo
  - Explicar razones principales
Salida: AnalysisResult con puntuación y explicación
Garantía: Decisión siempre reproducible
```

#### 3. **Report Engine** - Generar Reportes y Registrar
```
Entrada: AnalysisResult + Plan de operación
Proceso:
  - Generar reporte formateado
  - Registrar resultado cuando se ejecuta
  - Analizar efectividad de reglas
  - Calcular estadísticas de rendimiento
  - Generar gráficos y dashboards
Salida: OpportunityReport + Estadísticas
Garantía: Histórico completo y auditoria
```

#### 4. **Analyzer** - Orquestar
```
Entrada: Símbolo + Estrategia + Plan
Proceso:
  1. Obtener datos (Data Engine)
  2. Evaluar (Rules Engine)
  3. Generar reporte (Report Engine)
  4. Retornar resultado
Salida: OpportunityReport completo
Garantía: Flujo consistente y reproducible
```

### Funciones de Interfaz (Fase 2+)

#### 5. **Backend API** - Exponer motores como servicio
```
POST /analyze       - Analizar oportunidad
GET /rules          - Listar reglas
PUT /rules/:id      - Ajustar regla
POST /results       - Registrar resultado
GET /stats          - Estadísticas de rendimiento
GET /history        - Histórico de reportes
```

#### 6. **Frontend Web** - Interfaz visual
```
Formulario: Ingresar símbolo y plan
Dashboard: Ver reportes y estadísticas
Editor: Configurar reglas visualmente
Histórico: Ver operaciones pasadas
Alertas: Notificaciones en tiempo real
```

#### 7. **Alertas Automáticas** - Notificaciones
```
Monitoreo continuo de símbolos
Alertas cuando se cumple criterio
Integración: Slack, Discord, Email, SMS
Configurables por usuario
```

---

## 📊 HOJA DE RUTA (ROADMAP)

Ver documento **ROADMAP.md** para detalles completos.

### Estructura por Fases

**Fase 0** ✅ COMPLETADA  
- Motor Core (Data, Rules, Report, Analyzer)
- Git + GitHub
- Documentación

**Fase 1** 🚧 PRÓXIMA  
- Backend API REST
- Frontend Web básico
- Base de Datos

**Fase 2**  
- Dashboard avanzado
- Paper Trading mejorado
- Backtesting

**Fase 3**  
- Alertas automáticas
- Escaneo de múltiples símbolos
- ML para optimización

**Fase 4**  
- Integración con broker
- Trading real (con confirmación manual)
- Monitoreo avanzado

---

## 🏗️ DECISIONES ARQUITECTÓNICAS

### 1. **Lenguaje y Plataforma**
- ✅ TypeScript: Type safety + productividad
- ✅ Node.js: Compatibilidad con browser y server
- ✅ Modular: Cada motor es independiente

### 2. **Base de Datos**
- ⏳ Por definir (PostgreSQL vs MongoDB)
- Requisito: Histórico completo e inmutable de reportes
- Requisito: Índices rápidos por fecha/símbolo

### 3. **Frontend**
- ⏳ Por definir (React, Vue, Svelte)
- Requisito: Responsive design
- Requisito: Gráficos interactivos
- Requisito: Actualización en tiempo real

### 4. **Deployment**
- ⏳ Por definir (Heroku, AWS, DigitalOcean, Docker local)
- Requisito: Reproducible en cualquier máquina
- Requisito: Fácil de mantener

### 5. **Testing**
- ✅ Unitarios: Cada motor independiente
- ✅ Integración: Analyzer orquestando
- ✅ E2E: Backend API + Frontend
- Requisito: Cobertura >80%

---

## 📈 MÉTRICAS DE ÉXITO

### Corto Plazo (Fase 1-2)
- ✅ Backend API 100% funcional
- ✅ Frontend permite crear reportes
- ✅ Histórico de 100+ reportes registrados
- ✅ CI/CD funcionando automáticamente

### Mediano Plazo (Fase 3-4)
- ✅ Dashboard muestra KPIs claros
- ✅ Win rate identificado de cada regla
- ✅ Alertas enviadas exitosamente
- ✅ Backtesting valida efectividad

### Largo Plazo (Fase 5+)
- ✅ Trading real con broker (LIVE)
- ✅ Sistema operando >30 días sin intervención
- ✅ ROI positivo en paper trading
- ✅ 50+ reglas personalizables

---

## 🔄 PROCESO DE DESARROLLO

### Cada Cambio Debe:

1. ✅ **Pasar tests** (no romper cobertura)
2. ✅ **Mantener backward compatibility** (o versión major)
3. ✅ **Tener commit message descriptivo**
4. ✅ **Actualizar documentación** si aplica
5. ✅ **Respetar reglas fundamentales** arriba
6. ✅ **Ser code reviewed** (si hay equipo)

### Proceso para Actualizaciones de Víctor:

1. 📖 Analizar cambios en rama de prueba
2. 📊 Explicar ventajas y riesgos
3. ✋ Esperar aprobación explícita
4. ✅ Integrar si todo funciona
5. 📝 Commit descriptivo

---

## 🎓 Principios de Diseño

### Simplicidad
- Código simple y legible
- Menos abstracciones innecesarias
- Nombres descriptivos

### Modularidad
- Componentes independientes
- Bajo acoplamiento
- Fácil de testear

### Robustez
- Manejo de errores explícito
- Nunca inventar datos
- Fallar seguro

### Extensibilidad
- Agregar reglas sin modificar core
- Agregar proveedores de datos sin cambiar API
- Agregar formatos de reporte sin romper existentes

### Confiabilidad
- Determinismo (misma entrada = mismo resultado)
- Trazabilidad (todo se registra)
- Reproducibilidad (se puede replayer)

---

## 📞 Cambios a Este Documento

Este documento es vivo. Si descubrimos una regla nueva que NUNCA debe romperse, o una función que falta:

1. Abre issue en GitHub describiendo
2. Discute la implicación
3. Actualiza VISION.md
4. Commit: `docs(vision): Agregar nueva regla X`

---

**VISION es la brújula del proyecto.**  
**Cuando tengas duda, vuelve aquí.**

---

*Propietario*: joasamper80@gmail.com  
*Repositorio*: https://github.com/joasamper-del/TITO-METRALLETA.git  
*Versión*: v1.0 (2026-08-23)
