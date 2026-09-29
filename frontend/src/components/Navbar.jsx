import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { Sun, Moon, Briefcase, Zap, Target, User, LayoutDashboard, LogOut, ChevronDown, Key } from 'lucide-react';
import { AuthContext } from '../App';

function Navbar() {

  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChanged = (e) => {
      if (e.detail) setTheme(e.detail);
    };
    window.addEventListener('theme-changed', handleThemeChanged);
    return () => window.removeEventListener('theme-changed', handleThemeChanged);
  }, []);


  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const handleScroll = () => {
      if (window.scrollY < 200) {
        setActiveSection('home');
        return;
      }
      const studentEl = document.getElementById('student-features');
      const recruiterEl = document.getElementById('recruiter-features');
      const investorEl = document.getElementById('investor-highlights');

      const scrollPos = window.scrollY + 250;

      if (investorEl && scrollPos >= investorEl.offsetTop) {
        setActiveSection('investor-highlights');
      } else if (recruiterEl && scrollPos >= recruiterEl.offsetTop) {
        setActiveSection('recruiter-features');
      } else if (studentEl && scrollPos >= studentEl.offsetTop) {
        setActiveSection('student-features');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleSectionScroll = (id) => {
    setActiveSection(id);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => { setActiveSection('home'); navigate('/'); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.6rem' }}>🎯</span> 
        <div>
          <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>HireAI</span>
          <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent)', padding: '0.1rem 0.4rem', borderRadius: '10px', marginLeft: '0.4rem', fontWeight: 700 }}>
            ☕ 100% Human Friendly
          </span>
        </div>
      </div>

      <div className="nav-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => (isActive && (location.pathname !== '/' || activeSection === 'home')) ? "nav-link active" : "nav-link"} 
          end
          onClick={() => setActiveSection('home')}
        >
          Home
        </NavLink>

        {user ? (
          user.is_recruiter ? (
            /* RECRUITER NAVIGATION LINKS */
            <>
              <NavLink to="/hr" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <LayoutDashboard size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> HR Dashboard
              </NavLink>
              <NavLink to="/jobs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <Briefcase size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Open Vacancies
              </NavLink>
            </>
          ) : (
            /* STUDENT / CANDIDATE NAVIGATION LINKS */
            <>
              <NavLink to="/jobs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <Briefcase size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Jobs Explorer
              </NavLink>
              <NavLink to="/practice" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <Zap size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Practice Room ⚡
              </NavLink>
              <NavLink to="/ats-scorer" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <Target size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> ATS Scorer 🎯
              </NavLink>
            </>
          )
        ) : (
          /* GUEST / LANDING PAGE NAVIGATION LINKS */
          <>
            <button 
              className={`nav-link-btn ${activeSection === 'student-features' ? 'active' : ''}`} 
              onClick={() => handleSectionScroll('student-features')}
            >
              For Candidates
            </button>
            <button 
              className={`nav-link-btn ${activeSection === 'recruiter-features' ? 'active' : ''}`} 
              onClick={() => handleSectionScroll('recruiter-features')}
            >
              For Recruiters
            </button>
            <button 
              className={`nav-link-btn ${activeSection === 'investor-highlights' ? 'active' : ''}`} 
              onClick={() => handleSectionScroll('investor-highlights')}
            >
              Platform Tech
            </button>
          </>
        )}
      </div>

      <div className="nav-user" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <button 
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {user ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Interactive User Dropdown Trigger */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="user-dropdown-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.35rem 0.75rem',
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'var(--text-main)'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.85rem',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
              }}>
                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                  {user.name || user.username}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {user.is_recruiter ? '👔 Recruiter' : '🎓 Candidate'}
                </div>
              </div>
              <ChevronDown size={15} style={{ color: 'var(--text-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
            </button>

            {/* Dropdown Menu Popup */}
            {dropdownOpen && (
              <div
                className="user-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '210px',
                  background: 'var(--panel-bg)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '14px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
                  padding: '0.4rem',
                  zIndex: 1000,
                  animation: 'fadeInDown 0.2s ease'
                }}
              >
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--panel-border)', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    {user.name || user.username}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-all', marginTop: '0.1rem' }}>
                    {user.email || (user.is_recruiter ? 'Recruiter Account' : 'Candidate Account')}
                  </div>
                  <span className={`role-pill ${user.is_recruiter ? 'role-recruiter' : 'role-candidate'}`} style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                    {user.is_recruiter ? '👔 Recruiter' : '🎓 Candidate'}
                  </span>
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                  className="dropdown-item"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <User size={15} style={{ color: 'var(--primary)' }} />
                  {user.is_recruiter ? 'Recruiter Profile' : 'My Profile'}
                </button>

                <button
                  onClick={() => { setDropdownOpen(false); navigate('/settings/api-keys'); }}
                  className="dropdown-item"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Key size={15} style={{ color: '#10b981' }} />
                  AI Keys (BYOK) 🔑
                </button>

                <div style={{ height: '1px', background: 'var(--panel-border)', margin: '0.35rem 0' }} />


                <button
                  onClick={() => { setDropdownOpen(false); logoutUser(); navigate('/'); }}
                  className="dropdown-item danger"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Sign In
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Join Now
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
