import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MockInterview from './MockInterview';
import RealInterview from './RealInterview';

function Interview() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appState, setAppState] = useState(null);

  useEffect(() => {
    fetch(`/api/interview/${applicationId}/state/`)
      .then(res => {
        if (!res.ok) throw new Error("Could not load interview session");
        return res.json();
      })
      .then(data => {
        if (data.eligible) {
          setAppState(data);
          setLoading(false);
        } else {
          setError(data.message || "Unauthorized access to interview room.");
          setLoading(false);
        }
      })
      .catch(err => {
        setError(err.message || "Failed to establish secure interview session.");
        setLoading(false);
      });
  }, [applicationId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)' }}>
        <div style={{ padding: '1rem 2rem', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--panel-border, #334155)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span> Establishing Secure Interview Room...
        </div>
      </div>
    );
  }

  if (error || !appState) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)', padding: '2rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Interview Session Restricted</h2>
          <p style={{ color: 'var(--danger)', marginBottom: '1.5rem' }}>{error || "Session not found."}</p>
          <button className="btn btn-primary" onClick={() => navigate('/jobs')} style={{ width: '100%', justifyContent: 'center' }}>Return to Vacancies</button>
        </div>
      </div>
    );
  }

  const isMockPractice = appState.application?.job_details?.company === "Mock Practice Room";

  if (isMockPractice) {
    return (
      <MockInterview
        applicationId={applicationId}
        initialApp={appState.application}
        initialState={appState.state}
      />
    );
  }

  return (
    <RealInterview
      applicationId={applicationId}
      initialApp={appState.application}
      initialState={appState.state}
      initialRulesAccepted={appState.rules_accepted}
    />
  );
}

export default Interview;
