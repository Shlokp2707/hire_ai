import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WebcamMonitor from '../components/WebcamMonitor';
import AudioStreamer from '../components/AudioStreamer';
import Visualizer from '../components/Visualizer';
import { Volume2, VolumeX, SkipForward, ArrowRight, Sparkles, Shield, ShieldAlert, Maximize } from 'lucide-react';

function MockInterview({ applicationId, initialApp, initialState }) {
  const navigate = useNavigate();

  const [app, setApp] = useState(initialApp);
  const [interviewState, setInterviewState] = useState(initialState);
  
  const [isStarted, setIsStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(240);

  // Anti-cheating & proctor stats
  const [isDisqualified, setIsDisqualified] = useState(initialApp?.is_disqualified || false);
  const [isVerified, setIsVerified] = useState(initialApp?.is_verified || false);
  const [webcamVerifying, setWebcamVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState('AI Security Engine Initialized. Ready for candidate face verification.');
  const [warningsCount, setWarningsCount] = useState(initialApp?.security_warnings || 0);
  const [proctorStatus, setProctorStatus] = useState('Secure');
  const [livenessStatus, setLivenessStatus] = useState('Liveness Verified');
  const [blinksCount, setBlinksCount] = useState(0);
  const [emotion, setEmotion] = useState('neutral');
  const [proctorLog, setProctorLog] = useState(initialApp?.security_log || []);

  // Flags for proctor check-ins
  const webcamRef = useRef(null);
  const flagTabSwitching = useRef(false);
  const flagFullscreenExit = useRef(false);
  const proctorCheckingRef = useRef(false);
  const securitySettingsRef = useRef({
    looking_away: true,
    fullscreen: true,
    tab_switching: true,
    multiple_faces: true,
    liveness: true,
    blink_detection: true,
    ...initialApp?.job_details?.security_settings
  });

  // Helper to format log messages cleanly without JSON braces
  const formatLogMessage = (log) => {
    if (!log) return '';
    if (typeof log === 'string') return log;
    if (log.violations && Array.isArray(log.violations) && log.violations.length > 0) {
      const timePart = log.timestamp ? `[${log.timestamp.split(' ')[1] || log.timestamp}] ` : '';
      return `${timePart}${log.violations.join(', ')}`;
    }
    const timePart = log.time || log.timestamp ? `[${log.time || log.timestamp}] ` : '';
    const msgPart = log.warning || log.reason || log.message || '';
    if (msgPart) return `${timePart}${msgPart}`;
    return typeof log === 'object' ? Object.values(log).filter(v => typeof v === 'string').join(' - ') : String(log);
  };

  // Tab switching & Fullscreen event listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (securitySettingsRef.current.tab_switching !== false && document.hidden && isStarted && !isDisqualified) {
        flagTabSwitching.current = true;
        setWarningsCount(prev => prev + 1);
        setProctorStatus('Warning Alert');
        triggerLocalWarning("Security Alert: Tab switching or window unfocusing detected! Switching tabs will lead to strict actions.");
        setProctorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), warning: "Tab switching or window unfocusing detected. Switching tabs will lead to strict actions." }]);
      }
    };

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (securitySettingsRef.current.fullscreen !== false && !isFull && isStarted && !isDisqualified) {
        flagFullscreenExit.current = true;
        setWarningsCount(prev => prev + 1);
        setProctorStatus('Warning Alert');
        triggerLocalWarning("Security Alert: Fullscreen mode exited! Leaving fullscreen mode will lead to strict actions.");
        setProctorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), warning: "Exited fullscreen mode. Leaving fullscreen mode will lead to strict actions." }]);
      }
    };

    const preventCheating = (e) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    if (isStarted && !isDisqualified) {
      document.addEventListener("contextmenu", preventCheating);
      document.addEventListener("copy", preventCheating);
      document.addEventListener("cut", preventCheating);
      document.addEventListener("paste", preventCheating);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", preventCheating);
      document.removeEventListener("copy", preventCheating);
      document.removeEventListener("cut", preventCheating);
      document.removeEventListener("paste", preventCheating);
      document.body.style.userSelect = "auto";
      cancelTTS();
    };
  }, [isStarted, isDisqualified]);

  // Local floating alert banner helper
  const triggerLocalWarning = (msg) => {
    const banner = document.createElement("div");
    banner.style.cssText = "position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 99999; padding: 0.85rem 1.75rem; background: rgba(239, 68, 68, 0.95); color: white; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.35); font-family: sans-serif; font-size: 0.92rem; transition: all 0.3s; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);";
    banner.innerHTML = `⚠️ &nbsp; ${msg}`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);
  };

  // TTS helper functions
  const speakQuestion = (text) => {
    if (!ttsEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    
    setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US";
      utt.rate = 0.95;
      
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const enVoice = voices.find(v => v.lang.startsWith("en-"));
        if (enVoice) {
          utt.voice = enVoice;
        }
      }
      window.speechSynthesis.speak(utt);
    }, 50);
  };

  const cancelTTS = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Question timer (pauses if candidate exits fullscreen mode)
  useEffect(() => {
    if (!isStarted || !isFullscreen || isDisqualified || submittingAnswer) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAnswerSubmit(transcript);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isFullscreen, isDisqualified, submittingAnswer, transcript]);

  // Reset timer on new question (240s = 4 minutes)
  useEffect(() => {
    if (interviewState && interviewState.question && isStarted) {
      setTimeLeft(240);
      speakQuestion(interviewState.question);
    }
  }, [interviewState, isStarted]);

  const enterFullscreenAndBegin = () => {
    const promise = document.documentElement.requestFullscreen();
    if (promise && typeof promise.then === 'function') {
      promise
        .then(() => {
          setIsFullscreen(true);
          setIsStarted(true);
          if (interviewState?.question) speakQuestion(interviewState.question);
        })
        .catch(() => {
          setIsStarted(true);
          if (interviewState?.question) speakQuestion(interviewState.question);
        });
    } else {
      setIsFullscreen(true);
      setIsStarted(true);
      if (interviewState?.question) speakQuestion(interviewState.question);
    }
  };

  const handleStartPractice = () => {
    if (securitySettingsRef.current.fullscreen !== false) {
      enterFullscreenAndBegin();
    } else {
      setIsStarted(true);
      if (interviewState?.question) speakQuestion(interviewState.question);
    }
  };

  const handleAnswerSubmit = (answerText) => {
    setSubmittingAnswer(true);
    setThinkingMessage("Shlok is evaluating your practice response...");
    cancelTTS();

    fetch(`/api/interview/${applicationId}/submit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answerText })
    })
      .then(res => res.json())
      .then(data => {
        if (data.phase === 'finished') {
          navigate(`/result/${app.id}`);
        } else {
          setSubmittingAnswer(false);
          setTranscript('');
          setInterviewState(data);
        }
      })
      .catch((err) => {
        console.error("Submit practice answer failed:", err);
        setSubmittingAnswer(false);
      });
  };

  // Auto-disqualify and terminate session immediately when max warnings (>= 5) are reached
  useEffect(() => {
    if (warningsCount >= 5 && !isDisqualified) {
      setIsDisqualified(true);
      cancelTTS();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [warningsCount, isDisqualified]);

  const handleProctorCheck = (base64Image) => {
    if (isDisqualified || !isStarted || submittingAnswer || proctorCheckingRef.current) return;
    proctorCheckingRef.current = true;

    const currentTabSwitch = flagTabSwitching.current;
    const currentFullscreenExit = flagFullscreenExit.current;
    flagTabSwitching.current = false;
    flagFullscreenExit.current = false;

    fetch(`/api/interview/${applicationId}/proctor/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        warnings: { tab_switching: currentTabSwitch, fullscreen_exit: currentFullscreenExit, is_tabbed_out: document.hidden },
        question_count: interviewState?.question_count || 0,
        current_question: interviewState?.question || "",
        word_count: transcript ? transcript.trim().split(/\s+/).filter(Boolean).length : 0
      })
    })
      .then(res => res.json())
      .then(data => {
        proctorCheckingRef.current = false;
        if (data.success) {
          setWarningsCount(data.warnings_count);
          setProctorLog(data.security_log);
          if (data.blinks_count !== undefined) setBlinksCount(data.blinks_count);
          if (data.emotion) setEmotion(data.emotion);
          if (data.liveness_status) setLivenessStatus(data.liveness_status);

          if (data.violations && data.violations.length > 0) {
            setProctorStatus('Warning Alert');
            triggerLocalWarning(`${data.violations[0]} (Warnings: ${data.warnings_count}/5)`);
          } else {
            setProctorStatus('Secure');
          }

          if (data.is_disqualified || data.warnings_count >= 5) {
            setIsDisqualified(true);
            cancelTTS();
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
          }
        }
      })
      .catch(() => {
        proctorCheckingRef.current = false;
      });
  };

  const handleVerifyCapture = (base64Image) => {
    setWebcamVerifying(true);
    setVerifyFeedback("Running facial identity verification scan... 🤔");

    fetch(`/api/interview/${applicationId}/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    })
      .then(res => res.json())
      .then(data => {
        setWebcamVerifying(false);
        if (data.success && data.verified) {
          setVerifyFeedback("✅ Candidate facial identity verified successfully! Registered user confirmed.");
          setIsVerified(true);
        } else {
          setIsVerified(false);
          setVerifyFeedback(`❌ Identity Mismatch: ${data.message || "Person in front of camera does not match registered profile photo."}`);
        }
      })
      .catch(() => {
        setWebcamVerifying(false);
        setVerifyFeedback("⚠️ Server error scanning camera frame. Please align face clearly and retry.");
      });
  };

  if (isDisqualified) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)', padding: '4rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '2.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', maxWidth: '600px', width: '100%' }}>
          <ShieldAlert size={54} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Practice Session Terminated</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.92rem' }}>
            Your practice session was automatically stopped because the maximum security warning limit (5 warnings) was exceeded (e.g. repeated tab switching, exiting fullscreen, missing face, or gaze distraction).
          </p>
          <button className="btn btn-primary" onClick={() => navigate(`/result/${app?.id || applicationId}`)} style={{ marginTop: '1.5rem' }}>
            View Assessment Report
          </button>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="animate-fade-in" style={{ padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: 'center', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)' }}>
        <div className="glass-panel" style={{ maxWidth: '650px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '0.8rem', backgroundColor: 'rgba(139, 92, 246, 0.12)', borderRadius: '50%', marginBottom: '1rem', color: 'var(--primary)' }}>
            <Sparkles size={36} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>AI Practice Sandbox Room</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Welcome to your personalized practice session for <strong>{app?.job_details?.title || "Target Role"}</strong>.
            Candidate identity verification and anti-cheating proctoring active.
          </p>

          {/* Facial Verification Step */}
          {!isVerified ? (
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.75rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Shield size={20} /> Candidate Facial Identity Verification
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Position your face clearly in front of the camera and click <strong>Capture & Verify Face</strong>.
              </p>
              <div style={{ maxWidth: '320px', margin: '0 auto 1.25rem auto' }}>
                <WebcamMonitor ref={webcamRef} onCapture={handleVerifyCapture} autoCapture={false} active={!isVerified} />
                <button
                  className="btn btn-primary"
                  onClick={() => webcamRef.current?.capture()}
                  disabled={webcamVerifying}
                  style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.75rem' }}
                >
                  {webcamVerifying ? "Verifying Facial Identity... 🤔" : "📷 Capture & Verify Face"}
                </button>
              </div>
              <div style={{ padding: '0.65rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '0.82rem', fontWeight: 600, color: isVerified ? '#10b981' : 'var(--text-main)', marginBottom: '1rem' }}>
                {verifyFeedback}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '1rem 1.25rem', color: '#10b981', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              ✅ Facial Identity Verified! Ready to start practice session.
            </div>
          )}

          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.25rem', textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Enabled Anti-Cheating & Proctoring Detectors:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.7 }}>
              <li><strong>👤 Candidate Identity Verification:</strong> Facial scan against registered profile photo.</li>
              <li><strong>👁️ Head Pose & Looking-Away:</strong> Flags when looking off-screen.</li>
              <li><strong>👤 Double Face / Multi-Face Detection:</strong> Detects if multiple people enter camera frame.</li>
              <li><strong>👁️ Face Liveness & Blink Tracking:</strong> Verifies real-time facial presence and eye blinks.</li>
              <li><strong>🖥️ Enforced Fullscreen & Tab-Switching:</strong> Detects tab changes or window unfocusing.</li>
            </ul>
          </div>

          <button className="btn btn-primary" onClick={handleStartPractice} disabled={!isVerified || webcamVerifying} style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, opacity: (!isVerified || webcamVerifying) ? 0.6 : 1, cursor: (!isVerified || webcamVerifying) ? 'not-allowed' : 'pointer' }}>
            Enter Fullscreen & Begin Practice Session <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Fullscreen Exit Overlay Notice */}
      {!isFullscreen && securitySettingsRef.current.fullscreen !== false && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', marginBottom: '1.25rem', color: '#ef4444' }}>
              <ShieldAlert size={42} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#ef4444' }}>
              Fullscreen Mode Exited
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Practice room proctoring requires fullscreen mode to accurately track responses and anti-cheating telemetry.
            </p>
            <button
              className="btn btn-primary"
              onClick={enterFullscreenAndBegin}
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)' }}
            >
              <Maximize size={18} /> Re-enter Fullscreen & Resume Practice
            </button>
          </div>
        </div>
      )}

      {/* Practice Header Bar */}
      <header style={{ padding: '1rem 2rem', backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            ⚡ PROCTORED AI PRACTICE ROOM
          </span>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{app?.job_details?.title}</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: warningsCount > 2 ? '#ef4444' : 'var(--text-muted)' }}>
            Warnings: <strong>{warningsCount}</strong> / 5
          </div>
          <div style={{ padding: '0.35rem 0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: timeLeft < 20 ? '#ef4444' : 'var(--text-main)' }}>
            ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <button onClick={() => setTtsEnabled(!ttsEnabled)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Left Column: AI Question & Audio Interaction (Unified Single Panel) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left', border: '1px solid var(--panel-border)', borderRadius: '16px' }}>
            
            {/* Top Question Header & Visualizer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  Shlok's Practice Question {interviewState?.question_count || 1} of {interviewState?.max_questions || 5}:
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, lineHeight: 1.5, color: 'var(--text-main)' }}>
                  {submittingAnswer ? thinkingMessage : (interviewState?.question || "Preparing practice question...")}
                </h2>
              </div>
              <Visualizer />
            </div>

            {/* Voice Stream Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)', letterSpacing: '0.05em' }}>
                🎙️ VOICE RESPONSE STREAM
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Speech-to-Text Live Transcript</span>
            </div>

            {/* Live Voice Transcript Box */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                value={transcript}
                readOnly={true}
                disabled={submittingAnswer}
                placeholder="🎙️ Your spoken response will be transcribed here live in real-time as you speak... Manual typing is disabled."
                rows={6}
                style={{
                  width: '100%',
                  minHeight: '160px',
                  padding: '1rem 1.1rem',
                  fontSize: '0.95rem',
                  fontWeight: '400',
                  lineHeight: '1.6',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--panel-border)',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.25)',
                  cursor: 'not-allowed'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Word Count: <strong style={{ color: 'var(--text-main)' }}>{transcript ? transcript.trim().split(/\s+/).filter(Boolean).length : 0}</strong> words</span>
                <span>🔒 Spoken response streams live automatically (Manual typing locked)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
              <AudioStreamer applicationId={applicationId} onTranscriptChange={setTranscript} disabled={submittingAnswer} />
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAnswerSubmit("Skip response")}
                  disabled={submittingAnswer}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px' }}
                >
                  <SkipForward size={16} /> Skip Question
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => handleAnswerSubmit(transcript)}
                  disabled={submittingAnswer || !transcript.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.6rem', fontWeight: 700, borderRadius: '10px' }}
                >
                  Submit Answer <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Practice Anti-Cheating & Proctoring Monitor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <WebcamMonitor onFrame={handleProctorCheck} active={isStarted} />
            
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--panel-border)', textAlign: 'left', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>🛡️ Security Status:</span>
                <strong style={{ color: proctorStatus === 'Secure' ? '#10b981' : '#ef4444' }}>{proctorStatus}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>👁️ Liveness & Blinks:</span>
                <strong style={{ color: '#10b981' }}>{livenessStatus} ({blinksCount} blinks)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>😊 Emotion State:</span>
                <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{emotion}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>🖥️ Fullscreen Mode:</span>
                <strong style={{ color: isFullscreen ? '#10b981' : '#ef4444' }}>{isFullscreen ? 'Active' : 'Windowed'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>⚠️ Practice Warnings:</span>
                <strong style={{ color: warningsCount > 2 ? '#ef4444' : 'var(--text-main)' }}>{warningsCount} / 5</strong>
              </div>
            </div>

            {proctorLog && proctorLog.length > 0 && (
              <div style={{ textAlign: 'left', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Practice Security Audit Log</div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', lineHeight: 1.4 }}>
                  {proctorLog.slice(-4).reverse().map((log, idx) => (
                    <div key={idx} style={{ color: '#ef4444', marginBottom: '0.25rem' }}>
                      • {log.warning || log.reason || JSON.stringify(log)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>💡 Practice Advice</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Use this sandbox room to practice maintaining eye contact, speaking clearly into the mic, and remaining focused in a proctored environment!
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}

export default MockInterview;
