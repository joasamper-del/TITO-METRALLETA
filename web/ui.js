/**
 * UI Handler - Gestiona la actualización de la interfaz
 */

class TitoUI {
    constructor(motor) {
        this.motor = motor;
        this.currentReport = null;
        this.updateMarketStatus();
        setInterval(() => this.updateMarketStatus(), 60000);
    }

    /**
     * Actualiza el estado del mercado en el header
     */
    updateMarketStatus() {
        const isOpen = this.motor.isMarketOpen();
        const timeUntilClose = this.motor.getTimeUntilClose();

        const statusEl = document.getElementById('marketStatus');
        const timeEl = document.getElementById('timeToClose');

        if (isOpen) {
            statusEl.textContent = '🟢 Mercado Abierto';
            statusEl.style.color = 'var(--color-operate)';
            if (timeUntilClose) {
                timeEl.textContent = `${timeUntilClose} min al cierre`;
            }
        } else {
            statusEl.textContent = '🔴 Mercado Cerrado';
            statusEl.style.color = 'var(--color-danger)';
            timeEl.textContent = '';
        }
    }

    /**
     * Renderiza el panel de decisión
     */
    renderDecision(report) {
        this.currentReport = report;
        const analysis = report.analysis;

        const decisionMapSpanish = {
            'operar': 'OPERAR',
            'esperar': 'ESPERAR',
            'no_operar': 'NO OPERAR'
        };

        const decisionMapClass = {
            'operar': 'operate',
            'esperar': 'wait',
            'no_operar': 'no-operate'
        };

        const decisionEmoji = {
            'operar': '✅',
            'esperar': '⏳',
            'no_operar': '❌'
        };

        const riskEmoji = {
            'bajo': '🟢',
            'medio': '🟡',
            'alto': '🔴'
        };

        const html = `
            <div class="decision-box ${decisionMapClass[analysis.decision]}">
                <div class="decision-main">
                    <div class="decision-decision ${decisionMapClass[analysis.decision]}">
                        ${decisionEmoji[analysis.decision]} ${decisionMapSpanish[analysis.decision]}
                    </div>
                    <div class="decision-subtitle">
                        ${report.symbol} • ${report.strategy}
                    </div>
                </div>

                <div class="decision-metrics">
                    <div class="metric">
                        <div class="metric-label">Confianza</div>
                        <div class="metric-value">${analysis.percentageScore.toFixed(0)}%</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Riesgo</div>
                        <div class="metric-value metric-risk ${analysis.riskLevel}">
                            ${riskEmoji[analysis.riskLevel]} ${this.capitalize(analysis.riskLevel)}
                        </div>
                    </div>
                </div>

                <div class="reasons-box">
                    <h3>Razones Principales</h3>
                    <ul class="reasons-list">
                        ${analysis.mainReasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;

        const resultEl = document.getElementById('decisionResult');
        const emptyEl = document.getElementById('emptyState');

        resultEl.innerHTML = html;
        resultEl.style.display = 'block';
        emptyEl.style.display = 'none';

        // Actualiza detalles
        this.renderDetails(report);
    }

    /**
     * Renderiza los detalles del análisis
     */
    renderDetails(report) {
        const analysis = report.analysis;
        const data = analysis.marketData;

        // Datos de mercado
        document.getElementById('detailPrice').textContent = `$${data.price.toFixed(2)}`;
        document.getElementById('detailVolume').textContent = (data.volume / 1000000).toFixed(2) + 'M';
        document.getElementById('detailRSI').textContent = data.rsi ? data.rsi.toFixed(0) : '—';
        document.getElementById('detailTrend').textContent = this.capitalize(data.trend);
        document.getElementById('detailGEX').textContent = data.gex ? data.gex.toFixed(0) : '—';

        // Contexto de mercado
        document.getElementById('contextSPY').textContent = `$${analysis.marketContext.spy.price.toFixed(2)} (${this.capitalize(analysis.marketContext.spy.trend)})`;
        document.getElementById('contextQQQ').textContent = `$${analysis.marketContext.qqq.price.toFixed(2)} (${this.capitalize(analysis.marketContext.qqq.trend)})`;
        document.getElementById('contextVIX').textContent = `${analysis.marketContext.vix.price.toFixed(2)}`;

        // Evalución de reglas
        this.renderRulesEvaluation(analysis.ruleEvaluations);

        // Muestra grupos de detalles
        document.getElementById('marketDataGroup').style.display = 'block';
        document.getElementById('planGroup').style.display = 'block';
        document.getElementById('rulesEvalGroup').style.display = 'block';
        document.getElementById('contextGroup').style.display = 'block';
    }

    /**
     * Renderiza la evaluación de reglas
     */
    renderRulesEvaluation(evaluations) {
        const html = evaluations
            .map(eval => {
                const status = eval.passed ? '✅' : '❌';
                return `
                    <div class="rule-eval-item">
                        <div class="rule-eval-status">${status}</div>
                        <div class="rule-eval-info">
                            <div class="rule-eval-name">${eval.ruleName}</div>
                            <div class="rule-eval-points">${eval.points} puntos</div>
                        </div>
                    </div>
                `;
            })
            .join('');

        document.getElementById('rulesEvaluation').innerHTML = html;
    }

    /**
     * Renderiza la lista de reglas en el sidebar
     */
    renderRules() {
        const rules = this.motor.getAllRules();
        const html = rules
            .map(rule => {
                const status = rule.enabled ? '✅' : '❌';
                return `
                    <div class="rule-item" data-rule-id="${rule.id}">
                        <div>
                            <div class="rule-name">${rule.name}</div>
                            <div class="rule-weight">${rule.weight} pts</div>
                        </div>
                        <div class="rule-toggle" onclick="ui.toggleRule('${rule.id}')">${status}</div>
                    </div>
                `;
            })
            .join('');

        document.getElementById('rulesList').innerHTML = html;
    }

    /**
     * Alterna el estado de una regla
     */
    toggleRule(ruleId) {
        const rule = this.motor.rules[ruleId];
        if (rule.enabled) {
            this.motor.disableRule(ruleId);
        } else {
            this.motor.enableRule(ruleId);
        }
        this.renderRules();
        if (this.currentReport) {
            this.renderDecision(this.currentReport);
        }
    }

    /**
     * Renderiza la watchlist
     */
    renderWatchlist() {
        const watchlist = this.motor.getWatchlist();
        if (watchlist.length === 0) {
            document.getElementById('watchlistItems').innerHTML = '<p style="text-align: center; color: var(--color-text-tertiary); font-size: 0.75rem;">Sin símbolos</p>';
            return;
        }

        const html = watchlist
            .map(symbol => `
                <li class="watchlist-item" onclick="ui.analyzeFromWatchlist('${symbol}')">
                    <span class="watchlist-symbol">${symbol}</span>
                    <span class="watchlist-remove" onclick="event.stopPropagation(); ui.removeFromWatchlist('${symbol}')">×</span>
                </li>
            `)
            .join('');

        document.getElementById('watchlistItems').innerHTML = html;
    }

    /**
     * Analiza un símbolo de la watchlist
     */
    analyzeFromWatchlist(symbol) {
        document.getElementById('symbolInput').value = symbol;
    }

    /**
     * Remueve símbolo de la watchlist
     */
    removeFromWatchlist(symbol) {
        this.motor.removeFromWatchlist(symbol);
        this.renderWatchlist();
    }

    /**
     * Renderiza el historial
     */
    renderHistory() {
        const history = this.motor.getHistory();
        if (history.length === 0) {
            document.getElementById('historyList').innerHTML = '<p style="text-align: center; color: var(--color-text-tertiary);">Sin historial</p>';
            return;
        }

        const html = history
            .slice(0, 20)
            .map(report => {
                const decisionEmoji = {
                    'operar': '✅',
                    'esperar': '⏳',
                    'no_operar': '❌'
                };

                const decisionText = {
                    'operar': 'OPERAR',
                    'esperar': 'ESPERAR',
                    'no_operar': 'NO OPERAR'
                };

                const time = new Date(report.createdAt).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                return `
                    <div class="history-item">
                        <div class="history-time">${time}</div>
                        <div class="history-info">
                            <div class="history-symbol">${report.symbol}</div>
                            <div class="history-details">
                                <span>${report.strategy}</span>
                                <span>|</span>
                                <span>${report.confidence.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div class="history-decision">
                            <span>${decisionEmoji[report.state]}</span>
                            <span>${decisionText[report.state]}</span>
                        </div>
                    </div>
                `;
            })
            .join('');

        document.getElementById('historyList').innerHTML = html;
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        const resultEl = document.getElementById('decisionResult');
        resultEl.innerHTML = `
            <div style="background-color: var(--color-danger); color: white; padding: var(--spacing-lg); border-radius: var(--radius-md); text-align: center;">
                ⚠️ ${message}
            </div>
        `;
        resultEl.style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
    }

    /**
     * Utilidad: Capitaliza texto
     */
    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Muestra/oculta historial
     */
    toggleHistory() {
        const historyList = document.getElementById('historyList');
        const btn = document.getElementById('toggleHistoryBtn');

        if (historyList.style.display === 'none') {
            historyList.style.display = 'block';
            btn.textContent = 'Ocultar Historial';
            this.renderHistory();
        } else {
            historyList.style.display = 'none';
            btn.textContent = 'Mostrar Historial';
        }
    }

    /**
     * Limpia el historial
     */
    clearHistoryConfirm() {
        if (confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
            this.motor.clearHistory();
            this.renderHistory();
            document.getElementById('historyList').innerHTML = '<p style="text-align: center; color: var(--color-text-tertiary);">Sin historial</p>';
        }
    }

    /**
     * Limpia la watchlist
     */
    clearWatchlistConfirm() {
        if (confirm('¿Estás seguro de que quieres limpiar la watchlist?')) {
            this.motor.clearWatchlist();
            this.renderWatchlist();
        }
    }

    /**
     * Inicializa la UI
     */
    init() {
        this.renderRules();
        this.renderWatchlist();
        this.renderHistory();
    }
}
