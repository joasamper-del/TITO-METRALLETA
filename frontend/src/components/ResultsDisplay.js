import React from 'react';
import './ResultsDisplay.css';

function ResultsDisplay({ data }) {
  if (!data || !data.id) {
    return null;
  }

  const analysis = data.analysis || {};
  const marketData = analysis.marketData || {};

  const getDecisionColor = (decision) => {
    switch (decision) {
      case 'comprar':
        return 'green';
      case 'vender':
        return 'red';
      case 'esperar':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getRiskLevelColor = (risk) => {
    switch (risk) {
      case 'bajo':
        return 'green';
      case 'medio':
        return 'orange';
      case 'alto':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="results-container">
      <h2>📈 Resultados del Análisis</h2>

      <div className="results-card">
        <div className="result-header">
          <div>
            <h3>{data.symbol}</h3>
            <p className="strategy">{data.strategy}</p>
          </div>
          <div className="result-id">ID: {data.id.substring(0, 8)}...</div>
        </div>

        {analysis && Object.keys(analysis).length > 0 ? (
          <>
            <div className="analysis-section">
              <h4>Decisión</h4>
              <div className={`decision-badge ${getDecisionColor(analysis.decision)}`}>
                {analysis.decision?.toUpperCase() || 'N/A'}
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric">
                <label>Confianza</label>
                <div className="metric-value">{analysis.confidence || 0}%</div>
              </div>

              <div className="metric">
                <label>Riesgo</label>
                <div className={`metric-value ${getRiskLevelColor(analysis.riskLevel)}`}>
                  {analysis.riskLevel?.toUpperCase() || 'N/A'}
                </div>
              </div>

              <div className="metric">
                <label>Score</label>
                <div className="metric-value">
                  {analysis.totalScore || 0} / {analysis.maxScore || 100}
                </div>
              </div>

              <div className="metric">
                <label>Revisión Manual</label>
                <div className={`metric-value ${analysis.manualReviewNeeded ? 'red' : 'green'}`}>
                  {analysis.manualReviewNeeded ? '✓ SÍ' : '✗ NO'}
                </div>
              </div>
            </div>

            {analysis.mainReasons && analysis.mainReasons.length > 0 && (
              <div className="reasons-section">
                <h4>Razones Principales</h4>
                <ul className="reasons-list">
                  {analysis.mainReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.manualReviewReasons && analysis.manualReviewReasons.length > 0 && (
              <div className="review-section">
                <h4>⚠️ Requiere Revisión Manual</h4>
                <ul className="review-list">
                  {analysis.manualReviewReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {marketData.symbol && (
              <div className="market-data-section">
                <h4>Datos de Mercado</h4>
                <div className="market-grid">
                  <div className="market-item">
                    <label>Símbolo</label>
                    <span>{marketData.symbol}</span>
                  </div>
                  <div className="market-item">
                    <label>Precio</label>
                    <span>${marketData.price || 'N/A'}</span>
                  </div>
                  <div className="market-item">
                    <label>Tendencia</label>
                    <span>{marketData.trend || 'N/A'}</span>
                  </div>
                  <div className="market-item">
                    <label>Volumen</label>
                    <span>{marketData.volume || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="timestamp">
              Análisis generado: {new Date(analysis.timestamp).toLocaleString('es-ES')}
            </div>
          </>
        ) : (
          <div className="no-analysis">
            <p>No hay datos de análisis disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultsDisplay;
