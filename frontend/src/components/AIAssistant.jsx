import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Sparkles, Bot, X, Send, Mic, MicOff, Check, AlertCircle, 
  ArrowRight, ShieldCheck, User, Briefcase, Zap, Target, LayoutDashboard, FileText, RefreshCw, Radio, Volume2 
} from 'lucide-react';
import { AuthContext } from '../App';
import { parseUserIntentAsync, executeAction } from '../services/aiActionEngine';

function AIAssistant() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isRecruiter = user?.is_recruiter;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Voice Modes State
  const [isNormalListening, setIsNormalListening] = useState(false);
  const [isContinuousVoiceMode, setIsContinuousVoiceMode] = useState(false);
  const continuousVoiceRef = useRef(false);
  const normalRecognitionRef = useRef(null);
  const continuousRecognitionRef = useRef(null);

  // Streaming bot response state
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Live Action Banner state for top-of-screen visible feedback
  const [activeBanner, setActiveBanner] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: isRecruiter
        ? 'Hello! I am Subh AI ⚡, your Recruiter & Platform Assistant. Tell me what you want to post or manage (e.g. "Switch to dark theme", "Reset job filters", "Draft JD for React Lead with 3 custom questions").'
        : 'Hello! I am Subh AI ⚡, your Universal Career & Platform Controller. I can switch themes, reset job listings, update your profile skills/bio, fix your ATS resume, or route you anywhere!',
      logs: []
    }
  ]);

  const [pendingAction, setPendingAction] = useState(null);
  const chatBottomRef = useRef(null);

  // Toggle layout shift on main document body when chatbot is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('ai-chat-shifted');
    } else {
      document.body.classList.remove('ai-chat-shifted');
    }
    return () => document.body.classList.remove('ai-chat-shifted');
  }, [isOpen]);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChanged = (e) => {
      if (e.detail) setCurrentTheme(e.detail);
    };
    window.addEventListener('theme-changed', handleThemeChanged);
    return () => window.removeEventListener('theme-changed', handleThemeChanged);
  }, []);

  // Fetch active ATS analysis if candidate
  useEffect(() => {
    if (isRecruiter) return;
    fetch('/api/ats/history/')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setActiveAnalysis(data[0]);
        }
      })
      .catch(() => {});
  }, [isRecruiter]);

  // Setup Web Speech Recognition for Both Modes
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // 1. Normal One-Shot Mic Recognition
    const normalRec = new SpeechRecognition();
    normalRec.continuous = false;
    normalRec.interimResults = false;
    normalRec.lang = 'en-US';

    normalRec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsNormalListening(false);
    };
    normalRec.onerror = () => setIsNormalListening(false);
    normalRec.onend = () => setIsNormalListening(false);
    normalRecognitionRef.current = normalRec;

    // 2. Continuous Hands-Free Voice Recognition (Auto-sends on silence gap)
    const continuousRec = new SpeechRecognition();
    continuousRec.continuous = true;
    continuousRec.interimResults = false;
    continuousRec.lang = 'en-US';

    continuousRec.onresult = (event) => {
      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript.trim();
      if (transcript) {
        handlePromptSubmit(transcript);
      }
    };

    continuousRec.onerror = (err) => {
      console.warn("Continuous voice recognition error:", err);
    };

    continuousRec.onend = () => {
      // Auto-restart if continuous mode is still active
      if (continuousVoiceRef.current) {
        try {
          continuousRec.start();
        } catch (e) {}
      } else {
        setIsContinuousVoiceMode(false);
      }
    };

    continuousRecognitionRef.current = continuousRec;
  }, []);

  // Toggle Normal Dictation Mic (Button 1)
  const toggleNormalMic = () => {
    if (!normalRecognitionRef.current) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    if (isContinuousVoiceMode) {
      stopContinuousVoice();
    }
    if (isNormalListening) {
      normalRecognitionRef.current.stop();
      setIsNormalListening(false);
    } else {
      setIsNormalListening(true);
      normalRecognitionRef.current.start();
    }
  };

  // Toggle Continuous Hands-Free Voice Mode (Button 2)
  const toggleContinuousVoice = () => {
    if (!continuousRecognitionRef.current) {
      alert("Continuous voice mode is not supported in this browser.");
      return;
    }
    if (isNormalListening && normalRecognitionRef.current) {
      normalRecognitionRef.current.stop();
      setIsNormalListening(false);
    }

    if (isContinuousVoiceMode) {
      stopContinuousVoice();
    } else {
      startContinuousVoice();
    }
  };

  const startContinuousVoice = () => {
    try {
      continuousVoiceRef.current = true;
      setIsContinuousVoiceMode(true);
      continuousRecognitionRef.current.start();
    } catch (e) {
      console.warn("Could not start continuous listening:", e);
    }
  };

  const stopContinuousVoice = () => {
    continuousVoiceRef.current = false;
    setIsContinuousVoiceMode(false);
    if (continuousRecognitionRef.current) {
      try {
        continuousRecognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingAction, loading, streamingText]);

  const showLiveBanner = (title, details, isSuccess = true) => {
    setActiveBanner({ title, details, isSuccess });
    setTimeout(() => setActiveBanner(null), 5000);
  };

  // Typewriter streaming text helper
  const streamBotMessage = (botMsgId, fullText, finalLogs, isSuccess) => {
    setIsStreaming(true);
    let index = 0;
    setStreamingText('');

    const interval = setInterval(() => {
      if (index < fullText.length) {
        index += 2;
        setStreamingText(fullText.slice(0, index));
      } else {
        clearInterval(interval);
        setIsStreaming(false);
        setMessages(prev => prev.map(m => {
          if (m.id === botMsgId) {
            return {
              ...m,
              text: fullText,
              logs: finalLogs,
              inProgress: false,
              isSuccess
            };
          }
          return m;
        }));
        setStreamingText('');
      }
    }, 25);
  };

  const handlePromptSubmit = async (promptText) => {
    const text = promptText || input;
    if (!text.trim() || loading || isStreaming) return;

    // User message
    const userMsg = { id: Date.now(), sender: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    showLiveBanner("Subh AI ⚡ Analyzing Request...", `Parsing intent for: "${text.trim()}"`);

    // Check if user is verbally confirming or cancelling an active pending confirmation
    if (pendingAction) {
      const lower = text.trim().toLowerCase();
      if (['yes', 'confirm', 'start', 'launch', 'go', 'go ahead', 'ready', 'ok', 'sure', 'do it'].some(w => lower.includes(w))) {
        await confirmPendingAction();
        setLoading(false);
        return;
      } else if (['no', 'cancel', 'stop', 'abort', 'don\'t'].some(w => lower.includes(w))) {
        cancelPendingAction();
        setLoading(false);
        return;
      }
    }

    try {
      // Parse Intent via LLM backend intent router
      const intent = await parseUserIntentAsync(text, {
        user,
        location,
        activeAnalysisId: activeAnalysis?.id
      });

      // Require user confirmation if sensitive or mock interview setup
      if (intent.requiresConfirmation) {
        setPendingAction(intent);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ Confirmation Required: ${intent.confirmationMessage || intent.summary}`,
          intent: intent,
          isConfirmation: true,
          logs: intent.logs || []
        }]);
        setLoading(false);
        return;
      }

      await processAndExecuteAction(intent);
    } catch (err) {
      showLiveBanner("Action Error", err.message, false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: `❌ Error parsing intent: ${err.message}`,
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const processAndExecuteAction = async (intent) => {
    setPendingAction(null);
    const botMsgId = Date.now() + 2;

    showLiveBanner(
      `⚡ Executing: ${intent.summary}`,
      `Routing to ${intent.targetPath || 'active section'} & updating section parameters...`
    );

    const initialBotMsg = {
      id: botMsgId,
      sender: 'bot',
      text: intent.message || `Executing: ${intent.summary}...`,
      logs: intent.logs || [],
      inProgress: true
    };
    setMessages(prev => [...prev, initialBotMsg]);

    const result = await executeAction(intent, {
      navigate,
      user,
      activeAnalysisId: activeAnalysis?.id
    });

    const finalMessage = result.message || (result.success ? `✓ ${intent.summary} executed successfully.` : `❌ Action failed: ${result.error}`);

    showLiveBanner(
      result.success ? `✓ ${intent.summary} Completed!` : `❌ Action Failed`,
      finalMessage,
      result.success
    );

    // Stream response text into chat box (no audio voice response)
    streamBotMessage(botMsgId, finalMessage, [...(intent.logs || []), ...(result.logs || [])], result.success);
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const currentPending = JSON.parse(JSON.stringify(pendingAction));
    if (currentPending.payload?.form_type === 'practice_mock') {
      if (!currentPending.payload.form_data) currentPending.payload.form_data = {};
      currentPending.payload.form_data.autoSubmit = true;
      currentPending.payload.form_data.attachPdf = true;
    }
    setPendingAction(null);
    await processAndExecuteAction(currentPending);
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'bot',
      text: 'Action cancelled.'
    }]);
  };

  // Dynamic quick suggestions per role & context
  const getQuickSuggestions = () => {
    if (isRecruiter) {
      return [
        "Switch to Dark Theme",
        "Draft Senior React Dev Job Specs",
        "Open HR Recruiter Dashboard",
        "Update designation to Hiring Lead"
      ];
    }
    return [
      "Setup Backend Interview & Send PDF Resume",
      "Toggle Dark/Light Theme",
      "Reset Job Filters & Show All",
      "Add Python, React, and Docker to my skills",
      "Find Remote Fullstack Developer Jobs",
      "Open my profile & update bio",
      "Fix ATS resume bullet points"
    ];
  };

  // Do NOT render AI Assistant chatbot inside proctored interview or practice room for security
  if (location.pathname.includes('/interview')) {
    return null;
  }

  return (
    <>
      {/* Top Live Visual Action Banner */}
      {activeBanner && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: activeBanner.isSuccess
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
          color: '#ffffff',
          padding: '0.85rem 1.6rem',
          borderRadius: '16px',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          fontFamily: "'Outfit', sans-serif, system-ui",
          animation: 'slideDown 0.3s ease-out',
          maxWidth: '90vw'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: activeBanner.isSuccess ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Zap size={18} />
          </div>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: activeBanner.isSuccess ? '#818cf8' : '#fca5a5' }}>
              {activeBanner.title}
            </h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>
              {activeBanner.details}
            </p>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 2550,
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '30px',
          padding: '0.7rem 1.25rem',
          fontSize: '0.9rem',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 10px 28px rgba(99, 102, 241, 0.45)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title={isOpen ? "Close Subh AI Assistant" : "Subh AI Command Center — Control website via natural language"}
      >
        <Sparkles size={18} style={{ animation: isOpen ? 'pulse 2s infinite' : 'spin 4s linear infinite' }} />
        <span>{isOpen ? 'Close AI' : 'Subh AI Assistant'}</span>
        <span style={{
          fontSize: '0.68rem',
          background: 'rgba(255,255,255,0.25)',
          padding: '2px 7px',
          borderRadius: '10px',
          textTransform: 'uppercase'
        }}>
          {isRecruiter ? 'Recruiter' : 'AI Pro'}
        </span>
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          width: '350px',
          maxWidth: '90vw',
          height: '570px',
          maxHeight: '80vh',
          backgroundColor: '#0f172a',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2500,
          overflow: 'hidden',
          fontFamily: "'Outfit', sans-serif, system-ui",
          color: '#f8fafc',
          animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.85rem 1.1rem',
            background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}>
                <Bot size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Subh AI ⚡
                  <span style={{ fontSize: '0.65rem', color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '1px 5px', borderRadius: '5px' }}>
                    Streaming Engine
                  </span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                  {isRecruiter ? 'HR & Recruitment AI' : 'Universal Career Assistant'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px',
                display: 'flex'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Continuous Voice Active Banner Badge */}
          {isContinuousVoiceMode && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.45rem 0.9rem',
              fontSize: '0.75rem',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: '600'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
                Continuous Voice Mode Active (Auto-sends on pause)
              </span>
              <button
                onClick={stopContinuousVoice}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
              >
                Stop
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {messages.map((msg, index) => {
              const isLastBotMsg = msg.sender === 'bot' && index === messages.length - 1;
              const displayText = (isLastBotMsg && isStreaming && streamingText) ? streamingText : msg.text;

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '88%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.sender === 'user' 
                      ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' 
                      : 'rgba(30, 41, 59, 0.9)',
                    color: msg.sender === 'user' ? '#ffffff' : '#f1f5f9',
                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.07)',
                    fontSize: '0.85rem',
                    lineHeight: '1.45',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                  }}>
                    {displayText}
                    {isLastBotMsg && isStreaming && (
                      <span style={{ display: 'inline-block', width: '6px', height: '14px', background: '#818cf8', marginLeft: '4px', verticalAlign: 'middle', animation: 'pulse 0.8s infinite' }} />
                    )}

                    {/* Confirmation Card */}
                    {msg.isConfirmation && pendingAction && (
                      <div style={{
                        marginTop: '0.65rem',
                        padding: '0.65rem',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '0.4rem',
                        alignItems: 'center'
                      }}>
                        <button
                          onClick={confirmPendingAction}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.75rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          ⚡ Confirm & Launch Practice Room
                        </button>
                        <button
                          onClick={cancelPendingAction}
                          style={{
                            padding: '0.4rem 0.65rem',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#cbd5e1',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '500',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step-by-step Visual Log Badges */}
                  {msg.logs && msg.logs.length > 0 && (
                    <div style={{
                      marginTop: '0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      maxWidth: '88%'
                    }}>
                      {msg.logs.map((log, lIdx) => (
                        <span key={lIdx} style={{
                          fontSize: '0.68rem',
                          color: log.includes('⚠️') ? '#f59e0b' : '#34d399',
                          fontFamily: 'monospace',
                          background: 'rgba(15, 23, 42, 0.6)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          {log}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8', fontSize: '0.8rem' }}>
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Subh AI LLM streaming intent & updating section...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Action Chips */}
          <div style={{
            padding: '0.55rem 0.85rem',
            background: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto'
          }}>
            {getQuickSuggestions().map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptSubmit(chip)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.72rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '16px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box with Dual Voice Input Buttons (like ChatGPT) */}
          <form
            onSubmit={(e) => { e.preventDefault(); handlePromptSubmit(); }}
            style={{
              padding: '0.75rem 0.85rem',
              background: '#1e293b',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            {/* Button 1: Normal Dictation Mic (Populates input box to edit & send) */}
            <button
              type="button"
              onClick={toggleNormalMic}
              style={{
                background: isNormalListening ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.06)',
                border: isNormalListening ? '1px solid #ef4444' : 'none',
                color: isNormalListening ? '#ef4444' : '#94a3b8',
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isNormalListening ? "Stop dictation" : "Button 1: Dictate text into input box"}
            >
              {isNormalListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Button 2: Continuous Hands-Free Voice Mode (Auto-sends on pause gap) */}
            <button
              type="button"
              onClick={toggleContinuousVoice}
              style={{
                background: isContinuousVoiceMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.06)',
                border: isContinuousVoiceMode ? '1px solid #10b981' : 'none',
                color: isContinuousVoiceMode ? '#34d399' : '#94a3b8',
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isContinuousVoiceMode ? "Click to stop continuous voice mode" : "Button 2: Continuous Voice Mode (Auto-sends on silence pause)"}
            >
              <Radio size={16} style={{ animation: isContinuousVoiceMode ? 'pulse 1s infinite' : 'none' }} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecruiter ? "Recruiter command..." : "Tell Subh AI what to do..."}
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '0.55rem 0.8rem',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading || isStreaming}
              style={{
                background: input.trim() ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 0.8rem',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default AIAssistant;
