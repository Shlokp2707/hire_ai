import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WebcamMonitor from '../components/WebcamMonitor';
import AudioStreamer from '../components/AudioStreamer';
import Visualizer from '../components/Visualizer';
import { Shield, ShieldAlert, Award, Volume2, VolumeX, SkipForward, ArrowRight, CheckSquare, Maximize } from 'lucide-react';

function RealInterview({ applicationId, initialApp, initialState, initialRulesAccepted }) {
  const navigate = useNavigate();

  const [app, setApp] = useState(initialApp);
  const [interviewState, setInterviewState] = useState(initialState);
  const [rulesAccepted, setRulesAccepted] = useState(initialRulesAccepted);
  const [isVerified, setIsVerified] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(initialApp?.is_disqualified || false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  
  // Interview state
  const [transcript, setTranscript] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');

  // Proctor state
  const [warningsCount, setWarningsCount] = useState(initialApp?.security_warnings || 0);
  const [livenessStatus, setLivenessStatus] = useState('Liveness Verified');
  const [blinksCount, setBlinksCount] = useState(0);
  const [proctorStatus, setProctorStatus] = useState('Secure');
  const [proctorLog, setProctorLog] = useState(initialApp?.security_log || []);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [rulesAgree, setRulesAgree] = useState(false);
  const [webcamVerifying, setWebcamVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState('AI Security Engine Initialized. Ready to verify identity.');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const [pitch, setPitch] = useState(0.0);
  const [yaw, setYaw] = useState(0.0);
  const [timeLeft, setTimeLeft] = useState(240);

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

  // Preload heavy models
  useEffect(() => {
    fetch(`/api/interview/${applicationId}/preload/`, { method: 'POST' })
      .then(res => res.json())
      .then(resData => {
        setIsModelLoaded(true);
        if (resData.success) {
          setVerifyFeedback("✅ AI Security Engine initialized. Ready to verify.");
        } else {
          setVerifyFeedback("⚠️ AI Security Engine ready for verification.");
        }
      })
      .catch(() => {
        setIsModelLoaded(true);
        setVerifyFeedback("⚠️ AI Security Engine offline fallback ready.");
      });
  }, [applicationId]);

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
        triggerLocalWarning("Security Alert: Fullscreen mode exited! Leaving fullscreen mode will lead to strict actions.");
        setProctorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), warning: "Exited fullscreen mode. Leaving fullscreen mode will lead to strict actions." }]);
      }
    };

    const preventCheating = (e) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    if (isStarted) {
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

  // Question timer (pauses if candidate exits fullscreen mode)
  useEffect(() => {
    if (!isStarted || !isFullscreen || isDisqualified || submittingAnswer) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitAnswer(transcript);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isFullscreen, isDisqualified, submittingAnswer, transcript]);

  // Reset timer on new question (240s = 4 minutes)
  useEffect(() => {
    if (interviewState && interviewState.question) {
      setTimeLeft(240);
    }
  }, [interviewState]);

  // TTS functions
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
        if (enVoice) utt.voice = enVoice;
      }
      window.speechSynthesis.speak(utt);
    }, 50);
  };

  const cancelTTS = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const triggerLocalWarning = (msg) => {
    const banner = document.createElement("div");
    banner.style.cssText = "position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 99999; padding: 0.85rem 1.75rem; background: rgba(239, 68, 68, 0.95); color: white; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.35); font-family: sans-serif; font-size: 0.92rem; transition: all 0.3s; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);";
    banner.innerHTML = `⚠️ &nbsp; ${msg}`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);
  };

  const handleStartSession = () => {
    if (!rulesAgree) return;
    fetch(`/api/interview/${applicationId}/start/`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setRulesAccepted(true);
      })
      .catch(err => console.error("Error starting session:", err));
  };

  const handleVerifyCapture = (base64Image) => {
    setWebcamVerifying(true);
    setVerifyFeedback("Running facial verification scan... 🤔");

    fetch(`/api/interview/${applicationId}/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    })
      .then(res => res.json())
      .then(data => {
        setWebcamVerifying(false);
        if (data.success && data.verified) {
          setVerifyFeedback("✅ Face verified successfully! Ready to begin.");
          setIsVerified(true);
        } else {
          setVerifyFeedback(`❌ Verification failed: ${data.message || data.error}`);
        }
      })
      .catch(() => {
        setWebcamVerifying(false);
        setIsVerified(true); // fallback
      });
  };

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
        });
    } else {
      setIsFullscreen(true);
      setIsStarted(true);
      if (interviewState?.question) speakQuestion(interviewState.question);
    }
  };

  const handleStartInterview = () => {
    if (securitySettingsRef.current.fullscreen !== false) {
      enterFullscreenAndBegin();
    } else {
      setIsStarted(true);
    }
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
        warnings: {
          tab_switching: currentTabSwitch,
          fullscreen_exit: currentFullscreenExit,
          is_tabbed_out: document.hidden
        },
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
          setBlinksCount(data.blinks_count);
          setLivenessStatus(data.liveness_status);
          setEmotion(data.emotion || 'neutral');

          if (data.violations && data.violations.length > 0) {
            setProctorStatus('Warning');
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

  const submitAnswer = (answerText) => {
    setSubmittingAnswer(true);
    setThinkingMessage("Recruiter AI is evaluating your response...");
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
          speakQuestion(data.question);
        }
      })
      .catch(() => {
        setSubmittingAnswer(false);
      });
  };

  if (isDisqualified) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ padding: '2.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', maxWidth: '600px', width: '100%' }}>
          <ShieldAlert size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Session Terminated</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Your interview session was auto-terminated due to multiple proctoring violations (tab switching, missing candidate face, or gaze distraction).
          </p>
          <button className="btn btn-primary" onClick={() => navigate(`/result/${app?.id || applicationId}`)} style={{ marginTop: '1.5rem' }}>
            View Final Assessment Report
          </button>
        </div>
      </div>
    );
  }

  // Phase 1: Rules Agreement
  if (!rulesAccepted) {
    return (
      <div className="animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div className="glass-panel" style={{ maxWidth: '650px', width: '100%', padding: '2.5rem', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Recruiter Assessment Agreement</h2>
          <h4 style={{ fontSize: '1rem', color: 'var(--accent)', fontWeight: 600, margin: '0 0 1.5rem 0' }}>
            🏢 {app?.job_details?.company || "Assessment Job"} &nbsp;·&nbsp; {app?.job_details?.title || "Candidate Role"}
          </h4>

          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <strong>🛡️ Anti-Cheating & AI Proctoring Policy:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
              <li>Fullscreen mode will be strictly enforced during the entire session.</li>
              <li>Tab switching, window minimization, or exiting fullscreen will trigger security strikes.</li>
              <li>5 consecutive security strikes will result in immediate disqualification.</li>
            </ul>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '2rem' }}>
            <input
              type="checkbox"
              checked={rulesAgree}
              onChange={(e) => setRulesAgree(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>I agree to the assessment rules and camera monitoring.</span>
          </label>

          <button className="btn btn-primary" onClick={handleStartSession} disabled={!rulesAgree} style={{ width: '100%', justifyContent: 'center' }}>
            Accept & Continue <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Phase 2: Face Verification
  if (!isVerified) {
    return (
      <div className="animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div className="glass-panel" style={{ maxWidth: '550px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Candidate Identity Verification</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Position your face clearly in front of the webcam and tap <strong>Capture & Verify Face</strong> below.
          </p>

          <WebcamMonitor ref={webcamRef} onCapture={handleVerifyCapture} autoCapture={false} />

          <button
            className="btn btn-primary"
            onClick={() => webcamRef.current?.capture()}
            disabled={webcamVerifying}
            style={{ marginTop: '1.25rem', width: '100%', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.8rem' }}
          >
            {webcamVerifying ? "Verifying Facial Identity... 🤔" : "📷 Capture & Verify Face"}
          </button>

          <div style={{ margin: '1.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
            {verifyFeedback}
          </div>
        </div>
      </div>
    );
  }

  // Phase 3: Start Interview Button (Fullscreen request)
  if (!isStarted) {
    return (
      <div className="animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div className="glass-panel" style={{ maxWidth: '550px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Ready for Formal Assessment</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Click below to lock fullscreen mode and begin your proctored assessment session.
          </p>

          <button className="btn btn-primary" onClick={handleStartInterview} style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem' }}>
            <Maximize size={18} /> Enter Fullscreen & Start Interview
          </button>
        </div>
      </div>
    );
  }

  // Phase 4: Main Proctored Interview Room
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg, #0f172a)', color: 'var(--text-main, #f8fafc)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Fullscreen Exit Blocking Overlay Modal */}
      {isStarted && !isFullscreen && !isDisqualified && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div className="glass-panel" style={{ maxWidth: '560px', width: '100%', padding: '2.5rem', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 20px 50px rgba(239, 68, 68, 0.25)', borderRadius: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', color: '#ef4444' }}>
              <Maximize size={32} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ef4444' }}>Assessment Paused</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              You have exited full-screen mode. Audio recording and response submission are locked to comply with assessment security protocols.
            </p>

            <div style={{ padding: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, marginBottom: '1.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              ⚠️ Security Warning Issued: {5 - warningsCount} strikes remaining before automatic session disqualification.
            </div>

            <button
              className="btn btn-primary"
              onClick={enterFullscreenAndBegin}
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)' }}
            >
              <Maximize size={18} /> Re-enter Fullscreen & Resume Assessment
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header style={{ padding: '1rem 2rem', backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            🛡️ PROCTORED CANDIDATE ASSESSMENT
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
        
        {/* Question & Audio Input (Unified Single Panel) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left', border: '1px solid var(--panel-border)', borderRadius: '16px' }}>
            
            {/* Top Question Header & Visualizer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  Interview Question {interviewState?.question_count || 1} of {interviewState?.max_questions || 5}:
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, lineHeight: 1.5, color: 'var(--text-main)' }}>
                  {submittingAnswer ? thinkingMessage : (interviewState?.question || "Preparing question...")}
                </h2>
              </div>
              <Visualizer />
            </div>

            {/* Voice Stream Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', letterSpacing: '0.05em' }}>
                🎙️ VOICE RESPONSE STREAM
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Live Transcribed Answer</span>
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
              
              <button
                className="btn btn-primary"
                onClick={() => submitAnswer(transcript)}
                disabled={submittingAnswer || !transcript.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.6rem', fontWeight: 700, borderRadius: '10px' }}
              >
                Submit Response <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* Proctoring Monitor Sidebar */}
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
                <span style={{ color: 'var(--text-muted)' }}>👤 Identity Check:</span>
                <strong style={{ color: isVerified ? '#10b981' : '#f59e0b' }}>{isVerified ? 'Verified' : 'Pending'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>🖥️ Fullscreen Mode:</span>
                <strong style={{ color: isFullscreen ? '#10b981' : '#ef4444' }}>{isFullscreen ? 'Active' : 'Windowed'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>⚠️ Security Warnings:</span>
                <strong style={{ color: warningsCount > 2 ? '#ef4444' : 'var(--text-main)' }}>{warningsCount} / 5</strong>
              </div>
            </div>

            {proctorLog && proctorLog.length > 0 && (
              <div style={{ textAlign: 'left', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Recent Security Audit Log</div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', lineHeight: 1.4 }}>
                  {proctorLog.slice(-4).reverse().map((log, idx) => (
                    <div key={idx} style={{ color: '#ef4444', marginBottom: '0.25rem' }}>
                      • {formatLogMessage(log)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default RealInterview;
