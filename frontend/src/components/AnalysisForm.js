import React, { useState } from 'react';
import './AnalysisForm.css';

function AnalysisForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    symbol: '',
    strategy: '',
    entry: '',
    target: '',
    stop: '',
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.symbol || !formData.strategy || !formData.entry || !formData.target || !formData.stop) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="form-container">
      <h2>📊 Formulario de Análisis</h2>

      <form onSubmit={handleSubmit} className="analysis-form">
        <div className="form-group">
          <label htmlFor="symbol">Symbol *</label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            placeholder="ej: AAPL, GOOGL, SPY"
            disabled={loading}
            maxLength="10"
          />
        </div>

        <div className="form-group">
          <label htmlFor="strategy">Estrategia *</label>
          <input
            type="text"
            id="strategy"
            name="strategy"
            value={formData.strategy}
            onChange={handleChange}
            placeholder="ej: Momentum, Value, Growth"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="entry">Entrada (Entry) *</label>
          <input
            type="number"
            id="entry"
            name="entry"
            value={formData.entry}
            onChange={handleChange}
            placeholder="Precio de entrada"
            disabled={loading}
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="target">Objetivo (Target) *</label>
          <input
            type="number"
            id="target"
            name="target"
            value={formData.target}
            onChange={handleChange}
            placeholder="Precio objetivo"
            disabled={loading}
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="stop">Stop Loss *</label>
          <input
            type="number"
            id="stop"
            name="stop"
            value={formData.stop}
            onChange={handleChange}
            placeholder="Precio de stop loss"
            disabled={loading}
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notas (Opcional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notas adicionales sobre la operación"
            disabled={loading}
            rows="3"
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading}
        >
          {loading ? '⏳ Analizando...' : '🎯 Analizar'}
        </button>
      </form>
    </div>
  );
}

export default AnalysisForm;
