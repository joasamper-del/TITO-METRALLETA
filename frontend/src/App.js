import React, { useState } from 'react';
import './App.css';
import AnalysisForm from './components/AnalysisForm';
import ResultsDisplay from './components/ResultsDisplay';
import api from './services/api';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.analyze(formData);
      setResults(response);
    } catch (err) {
      setError(err.message || 'Error en el análisis');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎯 Tito Metralleta</h1>
        <p>Sistema de Análisis de Oportunidades de Trading</p>
      </header>

      <main className="app-main">
        <div className="app-content">
          <AnalysisForm onSubmit={handleAnalyze} loading={loading} />
          {error && <div className="error-message">{error}</div>}
          {results && <ResultsDisplay data={results} />}
        </div>
      </main>

      <footer className="app-footer">
        <p>Backend: {process.env.REACT_APP_API_URL || 'http://localhost:3001'}</p>
      </footer>
    </div>
  );
}

export default App;
