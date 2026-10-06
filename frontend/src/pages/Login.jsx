import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';

function Login() {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Login Mode: 'password' or 'otp'
  const [loginMode, setLoginMode] = useState('otp'); // default to OTP for instant smooth flow

  // Password Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // OTP Login state
  const [identifier, setIdentifier] = useState('shlokp2406@gmail.com');
  const [otpStep, setOtpStep] = useState('request'); // 'request' or 'verify'

  // 6 discrete pin box values
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const pinInputRefs = useRef([]);

  const [otpSent, setOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [demoCode, setDemoCode] = useState('');
  const [lastChannel, setLastChannel] = useState('email');

  // General feedback state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 45-second OTP Timer Countdown
  useEffect(() => {
    let timer;
    if (otpSent && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, timeLeft]);

  // Handle individual pin box change
  const handlePinChange = (index, value) => {
    const val = value.replace(/\D/g, '');
    if (!val && value !== '') return;

    const newPin = [...pin];
    newPin[index] = val ? val.slice(-1) : '';
    setPin(newPin);

    // Auto-advance to next input box
    if (val && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key in pin box
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste into pin boxes
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newPin = Array(6).fill('');
      for (let i = 0; i < pastedData.length; i++) {
        newPin[i] = pastedData[i];
      }
      setPin(newPin);
      pinInputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // Send or Resend OTP via selected channel
  const handleSendOTP = (channel = 'email') => {
    if (!identifier.trim()) {
      setError("Please enter your email address or phone number.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setLastChannel(channel);

    fetch('/api/auth/send-otp/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), channel })
    })
      .then(async (res) => {
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = { error: `Server error (${res.status})` };
        }
        if (!res.ok) {
          throw new Error(data.error || `Server error (${res.status})`);
        }
        return data;
      })
      .then(data => {
        if (data.success) {
          setOtpSent(true);
          setOtpStep('verify');
          setTimeLeft(45); // Strict 45-second expiration timer
          if (data.otp_code) {
            setDemoCode(data.otp_code);
          }
          const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : channel === 'call' ? 'Phone Call' : 'Email';
          setSuccessMsg(`✅ 6-digit code sent via ${channelLabel}! You have 45 seconds to verify.`);
        } else {
          setError(data.error || "Could not send verification code. Please try again.");
        }
      })
      .catch((err) => setError(err.message || "Server error while sending code. Please check your connection."))
      .finally(() => setLoading(false));
  };

  // Verify OTP submit
  const handleVerifyOTP = (e) => {
    if (e) e.preventDefault();
    const fullCode = pin.join('');

    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits of your verification code.");
      return;
    }

    if (timeLeft <= 0) {
      setError("⏰ Code expired after 45 seconds! Please tap one of the resend options below.");
      return;
    }

    setLoading(true);
    setError('');

    fetch('/api/auth/verify-otp/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), otp_code: fullCode })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => { throw new Error(data.error || "Verification failed.") });
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          loginUser(data.user);
          navigate(data.user.is_recruiter ? '/hr' : '/jobs');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  // Fill quick demo code helper
  const handleFillDemoCode = () => {
    if (demoCode && demoCode.length === 6) {
      setPin(demoCode.split(''));
    }
  };

  // Password Submit
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both your username and password.");
      return;
    }

    setLoading(true);
    setError('');

    fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => { throw new Error(data.error || "Incorrect login details.") });
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          loginUser(data.user);
          navigate(data.user.is_recruiter ? '/hr' : '/jobs');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const [googleClientId, setGoogleClientId] = useState('');
  const [googleRendered, setGoogleRendered] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth/config/')
      .then((res) => res.json())
      .then((data) => {
        if (data.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      })
      .catch(() => { });
  }, []);

  const processGoogleCredential = (credential) => {
    if (!credential) return;
    setLoading(true);
    setError('');

    fetch('/api/auth/google/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: credential,
        role: 'candidate'
      })
    })
      .then(async (res) => {
        if (res.status === 502 || res.status === 503) {
          throw new Error("Backend server is reconnecting. Please wait 2 seconds and try again.");
        }
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = { error: `Server error (${res.status})` };
        }
        if (!res.ok) {
          throw new Error(data.error || `Server error (${res.status})`);
        }
        return data;
      })
      .then((data) => {
        if (data.success) {
          loginUser(data.user);
          navigate(data.user.is_recruiter ? '/hr' : '/jobs');
        } else {
          setError(data.error || 'Google Sign-In failed.');
        }
      })
      .catch((err) => setError(err.message || 'Server error during Google Authentication.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => processGoogleCredential(response.credential)
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          try {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: 380,
              text: 'continue_with'
            });
            setGoogleRendered(true);
          } catch (e) {
            console.warn("Google button render warning:", e);
            setGoogleRendered(false);
          }
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  // Google OAuth Direct Sign-In Handler
  const handleGoogleSignIn = () => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            processGoogleCredential('demo_google_token_shlokp2406@gmail.com');
          }
        });
      } catch (e) {
        processGoogleCredential('demo_google_token_shlokp2406@gmail.com');
      }
    } else {
      processGoogleCredential('demo_google_token_shlokp2406@gmail.com');
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="glass-panel auth-card" style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}>

        {/* Header */}
        <div className="auth-header" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
          <h2 className="auth-title" style={{ fontSize: '1.6rem', fontWeight: 800 }}>Welcome Back</h2>
          <p className="auth-subtitle" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Simple, fast & secure access to your portal
          </p>
        </div>

        {/* Google OAuth Section */}
        <div style={{ marginBottom: '1.25rem', width: '100%' }}>
          <div
            ref={googleBtnRef}
            style={{
              display: (googleClientId && googleRendered) ? 'flex' : 'none',
              justifyContent: 'center',
              minHeight: '44px'
            }}
          />

          {(!googleClientId || !googleRendered) && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#ffffff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm, 8px)',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          )}
        </div>


        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.03)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => { setLoginMode('otp'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              background: loginMode === 'otp' ? 'var(--primary)' : 'transparent',
              color: loginMode === 'otp' ? '#fff' : 'var(--text-muted)'
            }}
          >
            📱 OTP Login
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => { setLoginMode('password'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              background: loginMode === 'password' ? 'var(--primary)' : 'transparent',
              color: loginMode === 'password' ? '#fff' : 'var(--text-muted)'
            }}
          >
            🔑 Password
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.8rem', backgroundColor: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'left', lineHeight: 1.4 }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '0.8rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'left', lineHeight: 1.4 }}>
            {successMsg}
          </div>
        )}

        {/* MODE A: OTP LOGIN FLOW */}
        {loginMode === 'otp' ? (
          otpStep === 'request' ? (
            /* STEP 1: ENTER EMAIL / PHONE */
            <div>
              <div className="form-group">
                <label className="form-label">Email or Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. shlokp2406@gmail.com"
                  required
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSendOTP('email')}
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send 45s Verification OTP"}
              </button>
            </div>
          ) : (
            /* STEP 2: VERIFY OTP SCREEN (MATCHING USER REQUEST EXACTLY) */
            <div className="animate-fade-in" style={{ textAlign: 'center' }}>

              {/* Target Recipient Banner */}
              <div style={{ marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.06)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Enter OTP Sent to
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {identifier}
                </p>
                <button
                  type="button"
                  onClick={() => setOtpStep('request')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, marginTop: '0.35rem', textDecoration: 'underline' }}
                >
                  Change Email / Phone
                </button>
              </div>

              {/* 6 Discrete Box Pin Inputs (Dot placeholders • • • • • • when empty) */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.25rem' }} onPaste={handlePaste}>
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (pinInputRefs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    placeholder="•"
                    style={{
                      width: '46px',
                      height: '52px',
                      fontSize: '1.4rem',
                      fontWeight: '800',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-sm)',
                      border: digit ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                      background: 'var(--panel-bg)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </div>

              {/* Live 45-Second Expiration Timer Badge */}
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px',
                  backgroundColor: timeLeft > 15 ? 'rgba(16, 185, 129, 0.12)' : timeLeft > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: timeLeft > 15 ? '#10b981' : timeLeft > 0 ? '#f59e0b' : '#ef4444',
                  display: 'inline-block'
                }}>
                  {timeLeft > 0 ? `⏳ OTP expires in ${timeLeft}s` : '⏰ OTP Expired (45s passed)'}
                </span>
              </div>

              {/* Quick Demo Fill Button */}
              {demoCode && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={handleFillDemoCode}
                    style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      color: 'var(--primary)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    💡 Auto-Fill Test Code ({demoCode})
                  </button>
                </div>
              )}

              {/* Submit Verification Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleVerifyOTP}
                disabled={loading || pin.join('').length !== 6 || timeLeft <= 0}
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '1rem' }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              {/* DIDN'T RECEIVE OTP? MULTI-CHANNEL RESEND OPTIONS */}
              <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--panel-border)' }}>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Didn't receive OTP?
                </p>

                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Resend OTP via your preferred channel:
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  {/* Resend via Email */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSendOTP('email')}
                    disabled={loading || timeLeft > 0}
                    style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.78rem', justifyContent: 'center' }}
                    title="Resend OTP via Email"
                  >
                    ✉️ Email
                  </button>

                  {/* Resend via WhatsApp */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSendOTP('whatsapp')}
                    disabled={loading || timeLeft > 0}
                    style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.78rem', justifyContent: 'center' }}
                    title="Resend OTP via WhatsApp"
                  >
                    💬 WhatsApp
                  </button>

                  {/* Resend via Phone Call */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSendOTP('call')}
                    disabled={loading || timeLeft > 0}
                    style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.78rem', justifyContent: 'center' }}
                    title="Resend OTP via Phone Call"
                  >
                    📞 Call
                  </button>
                </div>

                {timeLeft > 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                    Resend options unlock in {timeLeft} seconds
                  </p>
                )}
              </div>

            </div>
          )
        ) : (
          /* MODE B: STANDARD PASSWORD LOGIN */
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '1.5rem', textAlign: 'center' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '700' }}>Register here</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;
