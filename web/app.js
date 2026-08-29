/**
 * Aplicación Principal - Tito Metralleta
 * Coordina el motor y la UI
 */

// Variables globales
let motor;
let ui;

/**
 * Inicializa la aplicación
 */
function initApp() {
    // Crea instancias del motor y UI
    motor = new TitoMetralletaMotor();
    ui = new TitoUI(motor);

    // Inicializa la UI
    ui.init();

    // Configura event listeners
    setupEventListeners();

    console.log('✅ Tito Metralleta iniciado');
}

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
    // Botón de análisis
    document.getElementById('analyzeBtn').addEventListener('click', () => {
        performAnalysis();
    });

    // Enter en inputs
    document.getElementById('symbolInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performAnalysis();
    });

    document.getElementById('strategyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performAnalysis();
    });

    // Watchlist
    document.getElementById('addWatchlistBtn').addEventListener('click', () => {
        addToWatchlist();
    });

    document.getElementById('watchlistInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addToWatchlist();
    });

    document.getElementById('clearWatchlistBtn').addEventListener('click', () => {
        ui.clearWatchlistConfirm();
    });

    // Historial
    document.getElementById('toggleHistoryBtn').addEventListener('click', () => {
        ui.toggleHistory();
    });

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        ui.clearHistoryConfirm();
    });
}

/**
 * Realiza el análisis de un símbolo
 */
function performAnalysis() {
    const symbol = document.getElementById('symbolInput').value.trim().toUpperCase();
    const strategy = document.getElementById('strategyInput').value.trim();

    if (!symbol) {
        ui.showError('Por favor ingresa un símbolo (ej: AAPL)');
        return;
    }

    if (!strategy) {
        ui.showError('Por favor ingresa una estrategia (ej: Momentum)');
        return;
    }

    // Realiza el análisis
    const analysis = motor.analyze(symbol, strategy);

    // Obtiene los valores del plan de operación (si están disponibles)
    const entry = parseFloat(document.getElementById('entryInput').value) || null;
    const target = parseFloat(document.getElementById('targetInput').value) || null;
    const stop = parseFloat(document.getElementById('stopInput').value) || null;
    const notes = document.getElementById('notesInput').value || '';

    const plan = { entry, target, stop, notes };

    // Genera el reporte
    const report = motor.generateReport(analysis, plan);

    // Guarda en historial
    motor.addToHistory(report);

    // Actualiza la UI
    ui.renderDecision(report);
    ui.renderHistory();

    // Agrega a la watchlist automáticamente
    motor.addToWatchlist(symbol);
    ui.renderWatchlist();

    console.log('✅ Análisis completado para', symbol);
    console.log('Reporte:', report);
}

/**
 * Agrega un símbolo a la watchlist
 */
function addToWatchlist() {
    const input = document.getElementById('watchlistInput');
    const symbol = input.value.trim().toUpperCase();

    if (!symbol) {
        alert('Por favor ingresa un símbolo');
        return;
    }

    motor.addToWatchlist(symbol);
    input.value = '';
    ui.renderWatchlist();

    console.log('✅ Símbolo agregado a watchlist:', symbol);
}

/**
 * Alterna el estado de una regla (llamado desde HTML)
 */
function toggleRule(ruleId) {
    ui.toggleRule(ruleId);
}

/**
 * Analiza símbolo desde watchlist (llamado desde HTML)
 */
function analyzeFromWatchlist(symbol) {
    document.getElementById('symbolInput').value = symbol;
    if (!document.getElementById('strategyInput').value) {
        document.getElementById('strategyInput').value = 'Análisis Automático';
    }
    document.getElementById('analyzeBtn').click();
}

/**
 * Remueve símbolo de watchlist (llamado desde HTML)
 */
function removeFromWatchlist(symbol) {
    ui.removeFromWatchlist(symbol);
}

// Inicializa cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // Demo: Análisis automático al iniciar (opcional)
    console.log('💡 Ingresa un símbolo y estrategia para comenzar el análisis');
});

// Manejo de errores global
window.addEventListener('error', (event) => {
    console.error('Error:', event.error);
});

// Previene que se cierre accidentalmente
window.addEventListener('beforeunload', (event) => {
    const history = motor?.getHistory();
    if (history && history.length > 0) {
        event.preventDefault();
        event.returnValue = 'Tienes análisis guardados. ¿Estás seguro de que quieres salir?';
    }
});
