'use client';

import React, { useState, useEffect } from 'react';
import { DecisionRecord } from '@/app/types/audit';
import styles from './FeedbackResponseForm.module.css';

interface FeedbackData {
  id: string;
  decisionId: string;
  jayResponse: string;
  status: 'HYPOTHESIS' | 'IN_VALIDATION' | 'PROPOSED_LESSON' | 'CONFIRMED' | 'REJECTED';
  respondedBy: string;
  validationEvidenceFavor: number;
  validationEvidenceAgainst: number;
  auditHistory: Array<{
    timestamp: string;
    action: string;
    actor?: string;
    details?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  decision: DecisionRecord;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const FeedbackResponseForm: React.FC<Props> = ({ decision, onClose, onSubmitSuccess }) => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchExistingFeedback();
  }, [decision.id]);

  const fetchExistingFeedback = async () => {
    try {
      const res = await fetch(`/api/audit-trail/feedback/${decision.id}`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.data);
        setResponse(data.data.jayResponse);
      }
    } catch (err) {
      // No feedback exists yet, that's fine
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) {
      setError('Response cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/audit-trail/feedback/${decision.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jayResponse: response }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to submit response');
      }

      const data = await res.json();
      setFeedback(data.data);
      setSubmitSuccess(true);
      if (onSubmitSuccess) onSubmitSuccess();
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'HYPOTHESIS':
        return styles.statusHypothesis;
      case 'IN_VALIDATION':
        return styles.statusValidation;
      case 'PROPOSED_LESSON':
        return styles.statusProposed;
      case 'CONFIRMED':
        return styles.statusConfirmed;
      case 'REJECTED':
        return styles.statusRejected;
      default:
        return styles.statusDefault;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Responder Pregunta de Tito</h2>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.questionSection}>
        <h3>Decisión Original</h3>
        <div className={styles.decisionCard}>
          <div className={styles.row}>
            <span className={styles.label}>Símbolo:</span>
            <span>{decision.symbol || 'N/A'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Decisión:</span>
            <span>{decision.decision}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Confianza:</span>
            <span>{decision.confidence?.toFixed(2) || 'N/A'}%</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>MLI Score:</span>
            <span>{decision.mliScore?.toFixed(2) || 'N/A'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Timestamp:</span>
            <span>{new Date(decision.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={styles.feedbackSection}>
          <div className={styles.statusRow}>
            <span className={styles.label}>Estado:</span>
            <span className={`${styles.statusBadge} ${getStatusBadgeClass(feedback.status)}`}>
              {feedback.status}
            </span>
          </div>
          {feedback.status !== 'HYPOTHESIS' && (
            <div className={styles.evidenceSection}>
              <div className={styles.evidenceCard}>
                <span className={styles.favorCount}>{feedback.validationEvidenceFavor}</span>
                <span className={styles.favorLabel}>en favor</span>
              </div>
              <div className={styles.evidenceCard}>
                <span className={styles.againstCount}>{feedback.validationEvidenceAgainst}</span>
                <span className={styles.againstLabel}>en contra</span>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="response">Tu Respuesta (Jay):</label>
          <textarea
            id="response"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Escribe tu respuesta o recomendación basada en esta decisión..."
            rows={6}
            disabled={loading}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {submitSuccess && (
          <div className={styles.success}>Respuesta registrada como HIPÓTESIS ✓</div>
        )}

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Guardando...' : 'Guardar Respuesta como HIPÓTESIS'}
          </button>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancelar
          </button>
        </div>
      </form>

      {feedback && feedback.auditHistory && feedback.auditHistory.length > 0 && (
        <div className={styles.auditSection}>
          <h3>Historial</h3>
          <div className={styles.auditTrail}>
            {feedback.auditHistory.map((entry, idx) => (
              <div key={idx} className={styles.auditEntry}>
                <span className={styles.auditTime}>
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span className={styles.auditAction}>{entry.action}</span>
                {entry.details && <span className={styles.auditDetails}>{entry.details}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
