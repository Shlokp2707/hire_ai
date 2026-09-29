import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';

function Register() {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');

  // Optional OTP Email verification step
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [demoCode, setDemoCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 45-second Timer countdown for registration email verification
  useEffect(() => {
    let timer;
    if (otpSent && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, timeLeft]);

  // Send 45s OTP verification code to email
  const handleSendEmailOTP = () => {
    if (!email.trim() || !email.includes('@')) {
      setError("Please enter a valid email address first.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    fetch('/api/auth/send-otp/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email.trim() })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOtpSent(true);
          setTimeLeft(45);
          if (data.otp_code) setDemoCode(data.otp_code);
          setSuccessMsg("✅ 6-digit code sent! You have 45 seconds to verify your email.");
        } else {
          setError(data.error || "Could not send verification code.");
        }
      })
      .catch(() => setError("Connection error. Could not send code."))
      .finally(() => setLoading(false));
  };

  // Verify registration OTP
  const handleVerifyEmailOTP = () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    if (timeLeft <= 0) {
      setError("⏰ Code expired! Your 45-second window passed. Click 'Resend' to get a new code.");
      return;
    }

    setLoading(true);
    setError('');

    fetch('/api/auth/verify-otp/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email.trim(), otp_code: otpCode.trim() })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsEmailVerified(true);
          setSuccessMsg("🎉 Email verified successfully! Fill password to complete.");
        } else {
          setError(data.error || "Invalid verification code.");
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError('');

    fetch('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => { throw new Error(data.error || "Registration failed") });
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          loginUser(data.user);
          navigate(data.user.is_recruiter ? '/hr' : '/jobs');
        }
      })
      .catch(err => setError(err.message || "Registration failed. Please try again."))
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
        role: role
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
          setError(data.error || 'Google Registration failed.');
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
              text: 'signup_with'
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
  }, [googleClientId, role]);

  // Google OAuth Registration & Sign-Up Handler
  const handleGoogleSignUp = () => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            processGoogleCredential(`demo_google_token_candidate_${Date.now()}@gmail.com`);
          }
        });
      } catch (e) {
        processGoogleCredential(`demo_google_token_candidate_${Date.now()}@gmail.com`);
      }
    } else {
      processGoogleCredential(`demo_google_token_candidate_${Date.now()}@gmail.com`);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="glass-panel auth-card" style={{ maxWidth: '460px', width: '100%' }}>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h2 className="auth-title">Create Free Account</h2>
          <p className="auth-subtitle">Join HireAI in 30 seconds — Simple & Easy</p>
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
              onClick={handleGoogleSignUp}
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
              <span>Sign up with Google</span>
            </button>
          )}
        </div>


        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick your unique username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                id="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendEmailOTP}
                  className="btn btn-secondary"
                  disabled={loading || (otpSent && timeLeft > 0)}
                  style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                >
                  {otpSent && timeLeft > 0 ? `Verify (${timeLeft}s)` : "Send OTP"}
                </button>
              )}
            </div>
          </div>

          {/* Demo code display for effortless testing */}
          {demoCode && !isEmailVerified && (
            <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '6px', fontSize: '0.8rem', color: '#818cf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>💡 Test Code: <strong>{demoCode}</strong></span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                onClick={() => setOtpCode(demoCode)}
              >
                Fill Code
              </button>
            </div>
          )}

          {/* OTP 45s Verification row */}
          {otpSent && !isEmailVerified && (
            <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Enter 6-Digit Email Code</span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: timeLeft > 0 ? '#10b981' : '#ef4444'
                }}>
                  {timeLeft > 0 ? `⏳ ${timeLeft}s remaining` : '⏰ Expired'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  maxLength={6}
                  className="form-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  style={{ letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700 }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleVerifyEmailOTP}
                  disabled={loading || timeLeft <= 0}
                  style={{ fontSize: '0.85rem' }}
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Type:</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', cursor: 'pointer', borderColor: role === 'candidate' ? 'var(--primary)' : 'var(--panel-border)' }}>
                <input
                  type="radio"
                  name="role"
                  value="candidate"
                  checked={role === 'candidate'}
                  onChange={() => setRole('candidate')}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>🎓 Candidate</span>
              </label>

              <label className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', cursor: 'pointer', borderColor: role === 'recruiter' ? 'var(--primary)' : 'var(--panel-border)' }}>
                <input
                  type="radio"
                  name="role"
                  value="recruiter"
                  checked={role === 'recruiter'}
                  onChange={() => setRole('recruiter')}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>👔 Recruiter</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem' }}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1.5rem', textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>Sign In here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
