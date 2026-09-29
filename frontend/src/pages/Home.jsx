import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, ArrowRight, Sparkles, Filter, X, Search, ChevronDown, ChevronUp, 
  RotateCcw, MapPin, Building, Calendar, DollarSign, GraduationCap, Sliders, 
  Bot, Check, Zap, Target, Star, Send, MessageSquare
} from 'lucide-react';
import { AuthContext } from '../App';

function Home() {
  const { user } = useContext(AuthContext);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Search & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'match', 'salary'

  // Mobile Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Chatbot Drawer State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi there! 👋 I am your AI Career Assistant. Tell me what kind of jobs or internships you are looking for (e.g. "Find remote frontend developer internships" or "Show fresher friendly AI jobs"). I will automatically apply the best filters for you!'
    }
  ]);

  // Section Collapse States
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSection = (sec) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Job Description Expand/Collapse State
  const [expandedJobs, setExpandedJobs] = useState({});
  const toggleJobExpand = (id) => {
    setExpandedJobs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── 10 FILTER CATEGORIES STATE ──
  const [quickFilters, setQuickFilters] = useState([]); // ['recommended', 'fresher', 'remote', 'actively_hiring']
  const [locationModes, setLocationModes] = useState([]); // ['Remote', 'Hybrid', 'On-site']
  const [cityQuery, setCityQuery] = useState('');
  const [jobTypes, setJobTypes] = useState([]); // ['Full-time', 'Internship', 'Part-time', 'Contract', 'Freelance']
  const [datePosted, setDatePosted] = useState('all'); // 'all', 'today', '3days', '7days', '30days'
  const [roles, setRoles] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [domains, setDomains] = useState([]);
  const [candidateTypes, setCandidateTypes] = useState([]); // ['Student', 'Fresher', 'Working Professional']
  const [degrees, setDegrees] = useState([]);
  const [gradYear, setGradYear] = useState('all');
  const [workSetups, setWorkSetups] = useState([]); // ['Flexible', 'Fixed Working Hours', 'Day Shift', 'Night Shift']
  const [salaryRanges, setSalaryRanges] = useState([]); // ['0-3_lpa', '3-6_lpa', '6-10_lpa', '10-20_lpa', '20+_lpa', 'unpaid', '5k-10k', '10k-20k', '20k+']

  // Predefined lists
  const availableRoles = [
    'Software Developer', 'Frontend Developer', 'Backend Developer', 
    'Full Stack Developer', 'Data Analyst', 'Data Scientist', 
    'AI / ML Engineer', 'UI / UX Designer', 'DevOps Engineer', 
    'Product Manager', 'QA Tester', 'Mobile App Developer'
  ];

  const availableDomains = [
    'Software & IT', 'AI & Machine Learning', 'Data Science', 
    'Finance', 'Marketing', 'Sales', 'Design', 'Education', 'Healthcare', 'Other'
  ];

  const availableDegrees = [
    'B.Tech / B.E.', 'BCA', 'MCA', 'BBA', 'MBA', 'B.Com', 'M.Tech', 'Other'
  ];

  useEffect(() => {
    fetch('/api/jobs/')
      .then(res => res.json())
      .then(data => setJobs(data))
      .catch(err => console.error("Error fetching jobs:", err))
      .finally(() => setLoading(false));

    const handleAIFilter = (e) => {
      const promptText = (e.detail || '').toLowerCase();
      if (promptText === 'reset' || promptText.includes('reset') || promptText.includes('clear')) {
        clearAllFilters();
        return;
      }
      setSearchQuery(e.detail || '');
      if (promptText.includes('remote')) setLocationModes(prev => [...new Set([...prev, 'Remote'])]);
      if (promptText.includes('intern')) setJobTypes(prev => [...new Set([...prev, 'Internship'])]);
      if (promptText.includes('fresher')) {
        setQuickFilters(prev => [...new Set([...prev, 'fresher'])]);
        setCandidateTypes(prev => [...new Set([...prev, 'Fresher'])]);
      }
      if (promptText.includes('frontend') || promptText.includes('react')) setRoles(prev => [...new Set([...prev, 'Frontend Developer'])]);
      if (promptText.includes('backend') || promptText.includes('node') || promptText.includes('python')) setRoles(prev => [...new Set([...prev, 'Backend Developer'])]);
      if (promptText.includes('ai') || promptText.includes('machine learning')) setDomains(prev => [...new Set([...prev, 'AI & Machine Learning'])]);
    };

    const handleResetJobs = () => {
      clearAllFilters();
    };

    window.addEventListener('filter-jobs-ai', handleAIFilter);
    window.addEventListener('reset-jobs-ai', handleResetJobs);
    return () => {
      window.removeEventListener('filter-jobs-ai', handleAIFilter);
      window.removeEventListener('reset-jobs-ai', handleResetJobs);
    };
  }, []);


  // Helper toggle functions
  const toggleArrayFilter = (setter, list, item) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const clearAllFilters = () => {
    setQuickFilters([]);
    setLocationModes([]);
    setCityQuery('');
    setJobTypes([]);
    setDatePosted('all');
    setRoles([]);
    setRoleSearch('');
    setDomains([]);
    setCandidateTypes([]);
    setDegrees([]);
    setGradYear('all');
    setWorkSetups([]);
    setSalaryRanges([]);
    setSearchQuery('');
  };

  // Compute Total Active Selected Count for badges
  const getSelectedCount = (list) => Array.isArray(list) ? list.length : (list && list !== 'all' ? 1 : 0);

  const totalActiveFiltersCount = 
    quickFilters.length + 
    locationModes.length + 
    (cityQuery ? 1 : 0) + 
    jobTypes.length + 
    (datePosted !== 'all' ? 1 : 0) + 
    roles.length + 
    domains.length + 
    candidateTypes.length + 
    degrees.length + 
    (gradYear !== 'all' ? 1 : 0) + 
    workSetups.length + 
    salaryRanges.length;

  // AI Match Score Calculation per job based on candidate user info
  const calculateMatchScore = (job) => {
    let score = 75; // Baseline
    const reqSkills = (job.required_skills || []).map(s => s.toLowerCase());
    
    if (user && user.role === 'candidate') {
      score += 10; // Registered candidate boost
    }

    if (reqSkills.length > 0) {
      score += Math.min(15, reqSkills.length * 3);
    }
    return Math.min(98, Math.max(62, score));
  };

  // ── FILTERING & SORTING LOGIC ──
  const filteredJobs = jobs.filter(job => {
    const title = (job.title || '').toLowerCase();
    const company = (job.company || '').toLowerCase();
    const desc = (job.description || '').toLowerCase();
    const skills = (job.required_skills || []).map(s => s.toLowerCase());
    const exp = (job.experience || '').toLowerCase();

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = title.includes(q) || company.includes(q) || desc.includes(q) || skills.some(s => s.includes(q));
      if (!matchesSearch) return false;
    }

    // 2. Quick Filters
    if (quickFilters.includes('remote')) {
      if (!title.includes('remote') && !desc.includes('remote')) return false;
    }
    if (quickFilters.includes('fresher')) {
      if (!exp.includes('0') && !desc.includes('fresher') && !desc.includes('entry')) return false;
    }

    // 3. Location Modes
    if (locationModes.length > 0) {
      const isRemote = title.includes('remote') || desc.includes('remote');
      const isHybrid = desc.includes('hybrid');
      const isOnsite = !isRemote && !isHybrid;

      let locMatch = false;
      if (locationModes.includes('Remote') && isRemote) locMatch = true;
      if (locationModes.includes('Hybrid') && isHybrid) locMatch = true;
      if (locationModes.includes('On-site') && isOnsite) locMatch = true;
      if (!locMatch) return false;
    }

    // City Query
    if (cityQuery.trim()) {
      const cq = cityQuery.toLowerCase().trim();
      if (!desc.includes(cq) && !company.includes(cq)) return false;
    }

    // 4. Job Types
    if (jobTypes.length > 0) {
      const isInternship = title.includes('intern') || desc.includes('intern');
      const isPartTime = desc.includes('part-time') || desc.includes('part time');
      const isContract = desc.includes('contract');
      const isFreelance = desc.includes('freelance');
      const isFullTime = !isInternship && !isPartTime && !isContract && !isFreelance;

      let jtMatch = false;
      if (jobTypes.includes('Internship') && isInternship) jtMatch = true;
      if (jobTypes.includes('Full-time') && isFullTime) jtMatch = true;
      if (jobTypes.includes('Part-time') && isPartTime) jtMatch = true;
      if (jobTypes.includes('Contract') && isContract) jtMatch = true;
      if (jobTypes.includes('Freelance') && isFreelance) jtMatch = true;
      if (!jtMatch) return false;
    }

    // 5. Roles
    if (roles.length > 0) {
      const roleMatch = roles.some(r => {
        const rLower = r.toLowerCase();
        return title.includes(rLower) || skills.some(s => s.includes(rLower)) || desc.includes(rLower);
      });
      if (!roleMatch) return false;
    }

    // 6. Domains
    if (domains.length > 0) {
      const domainMatch = domains.some(d => {
        const dLower = d.toLowerCase().split(' ')[0];
        return title.includes(dLower) || desc.includes(dLower) || skills.some(s => s.includes(dLower));
      });
      if (!domainMatch) return false;
    }

    // 7. Candidate Types
    if (candidateTypes.length > 0) {
      if (candidateTypes.includes('Fresher') && (!exp.includes('0') && !desc.includes('fresher'))) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now());
    if (sortBy === 'match') return calculateMatchScore(b) - calculateMatchScore(a);
    return 0;
  });

  // ── CHATBOT PROMPT AI FILTER INTERPRETER ──
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const textLower = userText.toLowerCase();

    const newMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(newMessages);
    setChatInput('');

    // Interpret intent
    const applied = [];

    if (textLower.includes('remote')) {
      setLocationModes(prev => [...new Set([...prev, 'Remote'])]);
      applied.push('Location: Remote');
    }
    if (textLower.includes('intern') || textLower.includes('stipend')) {
      setJobTypes(prev => [...new Set([...prev, 'Internship'])]);
      applied.push('Job Type: Internship');
    }
    if (textLower.includes('fresher') || textLower.includes('entry level')) {
      setQuickFilters(prev => [...new Set([...prev, 'fresher'])]);
      setCandidateTypes(prev => [...new Set([...prev, 'Fresher'])]);
      applied.push('Fresher Friendly');
    }
    if (textLower.includes('frontend') || textLower.includes('react')) {
      setRoles(prev => [...new Set([...prev, 'Frontend Developer'])]);
      applied.push('Role: Frontend Developer');
    }
    if (textLower.includes('backend') || textLower.includes('node') || textLower.includes('python') || textLower.includes('django')) {
      setRoles(prev => [...new Set([...prev, 'Backend Developer'])]);
      applied.push('Role: Backend Developer');
    }
    if (textLower.includes('ai') || textLower.includes('machine learning') || textLower.includes('ml')) {
      setDomains(prev => [...new Set([...prev, 'AI & Machine Learning'])]);
      applied.push('Domain: AI & Machine Learning');
    }
    if (textLower.includes('software')) {
      setRoles(prev => [...new Set([...prev, 'Software Developer'])]);
      applied.push('Role: Software Developer');
    }

    setTimeout(() => {
      let botResponse = '';
      if (applied.length > 0) {
        botResponse = `🎯 I've automatically updated your filters! Applied: ${applied.join(', ')}. Matching positions are now updated on your screen!`;
      } else {
        setSearchQuery(userText);
        botResponse = `🔍 I've filtered the job listings for "${userText}". Check out the updated matching opportunities on the right!`;
      }
      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 400);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <div className="pulse-spinner" style={{ margin: '0 auto' }}>AI</div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Fetching open vacancies & candidate matches...</p>
      </div>
    );
  }

  // Render Sidebar Component
  const renderSidebar = () => (
    <div className={`filters-sidebar ${mobileFilterOpen ? 'filters-sidebar-drawer' : ''}`}>
      
      {/* Sidebar Header */}
      <div className="filters-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>All Filters</h3>
          {totalActiveFiltersCount > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'var(--primary)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
              {totalActiveFiltersCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {totalActiveFiltersCount > 0 && (
            <button 
              onClick={clearAllFilters}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <RotateCcw size={13} /> Clear All
            </button>
          )}
          {mobileFilterOpen && (
            <button 
              onClick={() => setMobileFilterOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Filter Sections */}
      <div className="filters-scroll-content">
        
        {/* 1. Quick Filters */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('quick')}>
            <h4>⚡ Quick Filters</h4>
            {quickFilters.length > 0 && <span className="filter-chip-count">{quickFilters.length}</span>}
          </div>
          {!collapsedSections['quick'] && (
            <div className="filter-section-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {[
                { id: 'recommended', label: '⭐ Recommended' },
                { id: 'fresher', label: '🌱 Fresher Friendly' },
                { id: 'remote', label: '🌐 Remote' },
                { id: 'actively_hiring', label: '🔥 Actively Hiring' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleArrayFilter(setQuickFilters, quickFilters, item.id)}
                  className={`filter-chip-selectable ${quickFilters.includes(item.id) ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Location */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('location')}>
            <h4>📍 Location</h4>
            {(locationModes.length > 0 || cityQuery) && (
              <span className="filter-chip-count">{locationModes.length + (cityQuery ? 1 : 0)}</span>
            )}
          </div>
          {!collapsedSections['location'] && (
            <div className="filter-section-body">
              {['Remote', 'Hybrid', 'On-site'].map(mode => (
                <label key={mode} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={locationModes.includes(mode)}
                    onChange={() => toggleArrayFilter(setLocationModes, locationModes, mode)}
                  />
                  {mode}
                </label>
              ))}
              
              {/* City / State Search Input */}
              <div style={{ marginTop: '0.4rem', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search City / State..."
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem 0.4rem 2rem',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    background: 'var(--panel-bg)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Job Type */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('jobType')}>
            <h4>💼 Job Type</h4>
            {jobTypes.length > 0 && <span className="filter-chip-count">{jobTypes.length}</span>}
          </div>
          {!collapsedSections['jobType'] && (
            <div className="filter-section-body">
              {['Full-time', 'Internship', 'Part-time', 'Contract', 'Freelance'].map(type => (
                <label key={type} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={jobTypes.includes(type)}
                    onChange={() => toggleArrayFilter(setJobTypes, jobTypes, type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 4. Date Posted */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('date')}>
            <h4>📅 Date Posted</h4>
            {datePosted !== 'all' && <span className="filter-chip-count">1</span>}
          </div>
          {!collapsedSections['date'] && (
            <div className="filter-section-body">
              {[
                { id: 'all', label: 'Anytime' },
                { id: 'today', label: 'Today' },
                { id: '3days', label: 'Last 3 days' },
                { id: '7days', label: 'Last 7 days' },
                { id: '30days', label: 'Last 30 days' }
              ].map(opt => (
                <label key={opt.id} className="filter-checkbox-label">
                  <input
                    type="radio"
                    name="datePostedRadio"
                    checked={datePosted === opt.id}
                    onChange={() => setDatePosted(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 5. Role */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('role')}>
            <h4>🎯 Role</h4>
            {roles.length > 0 && <span className="filter-chip-count">{roles.length}</span>}
          </div>
          {!collapsedSections['role'] && (
            <div className="filter-section-body">
              <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search Role..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem 0.4rem 2rem',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    background: 'var(--panel-bg)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              
              {availableRoles
                .filter(r => r.toLowerCase().includes(roleSearch.toLowerCase()))
                .slice(0, showAllRoles ? availableRoles.length : 5)
                .map(r => (
                  <label key={r} className="filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={roles.includes(r)}
                      onChange={() => toggleArrayFilter(setRoles, roles, r)}
                    />
                    {r}
                  </label>
                ))}

              {availableRoles.length > 5 && !roleSearch && (
                <button
                  onClick={() => setShowAllRoles(!showAllRoles)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', marginTop: '0.2rem' }}
                >
                  {showAllRoles ? 'Show Less ↑' : '+ View More Roles'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 6. Domain */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('domain')}>
            <h4>🏢 Domain</h4>
            {domains.length > 0 && <span className="filter-chip-count">{domains.length}</span>}
          </div>
          {!collapsedSections['domain'] && (
            <div className="filter-section-body">
              {availableDomains.map(dom => (
                <label key={dom} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={domains.includes(dom)}
                    onChange={() => toggleArrayFilter(setDomains, domains, dom)}
                  />
                  {dom}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 7. Candidate Type */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('candType')}>
            <h4>🎓 Candidate Type</h4>
            {candidateTypes.length > 0 && <span className="filter-chip-count">{candidateTypes.length}</span>}
          </div>
          {!collapsedSections['candType'] && (
            <div className="filter-section-body">
              {['Student', 'Fresher', 'Working Professional'].map(ct => (
                <label key={ct} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={candidateTypes.includes(ct)}
                    onChange={() => toggleArrayFilter(setCandidateTypes, candidateTypes, ct)}
                  />
                  {ct}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 8. Education */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('education')}>
            <h4>📖 Education</h4>
            {(degrees.length > 0 || gradYear !== 'all') && (
              <span className="filter-chip-count">{degrees.length + (gradYear !== 'all' ? 1 : 0)}</span>
            )}
          </div>
          {!collapsedSections['education'] && (
            <div className="filter-section-body">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Degree</div>
              {availableDegrees.map(deg => (
                <label key={deg} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={degrees.includes(deg)}
                    onChange={() => toggleArrayFilter(setDegrees, degrees, deg)}
                  />
                  {deg}
                </label>
              ))}

              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Graduation Year</div>
              <select
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--panel-bg)',
                  color: 'var(--text-main)'
                }}
              >
                <option value="all">Any Graduation Year</option>
                <option value="2026">2026 Batch</option>
                <option value="2025">2025 Batch</option>
                <option value="2024">2024 Batch</option>
                <option value="2023">2023 Batch</option>
                <option value="2022">2022 or Earlier</option>
              </select>
            </div>
          )}
        </div>

        {/* 9. Work Setup */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('workSetup')}>
            <h4>⏰ Work Setup</h4>
            {workSetups.length > 0 && <span className="filter-chip-count">{workSetups.length}</span>}
          </div>
          {!collapsedSections['workSetup'] && (
            <div className="filter-section-body">
              {['Flexible', 'Fixed Working Hours', 'Day Shift', 'Night Shift'].map(ws => (
                <label key={ws} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={workSetups.includes(ws)}
                    onChange={() => toggleArrayFilter(setWorkSetups, workSetups, ws)}
                  />
                  {ws}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 10. Salary / Stipend */}
        <div className="filter-section">
          <div className="filter-section-header" onClick={() => toggleSection('salary')}>
            <h4>💰 Salary / Stipend</h4>
            {salaryRanges.length > 0 && <span className="filter-chip-count">{salaryRanges.length}</span>}
          </div>
          {!collapsedSections['salary'] && (
            <div className="filter-section-body">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Jobs (LPA)</div>
              {[
                { id: '0-3_lpa', label: '₹0 – 3 LPA' },
                { id: '3-6_lpa', label: '₹3 – 6 LPA' },
                { id: '6-10_lpa', label: '₹6 – 10 LPA' },
                { id: '10-20_lpa', label: '₹10 – 20 LPA' },
                { id: '20+_lpa', label: '₹20+ LPA' }
              ].map(sal => (
                <label key={sal.id} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={salaryRanges.includes(sal.id)}
                    onChange={() => toggleArrayFilter(setSalaryRanges, salaryRanges, sal.id)}
                  />
                  {sal.label}
                </label>
              ))}

              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Internships (Monthly)</div>
              {[
                { id: 'unpaid', label: 'Unpaid' },
                { id: '5k-10k', label: '₹5K – 10K / mo' },
                { id: '10k-20k', label: '₹10K – 20K / mo' },
                { id: '20k+', label: '₹20K+ / mo' }
              ].map(stip => (
                <label key={stip.id} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={salaryRanges.includes(stip.id)}
                    onChange={() => toggleArrayFilter(setSalaryRanges, salaryRanges, stip.id)}
                  />
                  {stip.label}
                </label>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="filters-footer">
        <button
          onClick={clearAllFilters}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
        >
          Clear All
        </button>
        <button
          onClick={() => setMobileFilterOpen(false)}
          className="btn btn-primary"
          style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
        >
          Apply Filters ({filteredJobs.length})
        </button>
      </div>
    </div>
  );

  return (
    <div className="container animate-fade-in" style={{ padding: '2.5rem 1.5rem', paddingBottom: '6rem' }}>
      
      {/* Top Banner Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Sparkles size={22} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Candidate Job Explorer</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Discover curated job vacancies & internships matched to your candidate profile & ATS criteria.
          </p>
        </div>

        {/* Floating AI Chatbot Launcher Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="btn btn-primary"
          style={{
            padding: '0.55rem 1.25rem',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '24px',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
          }}
        >
          <Bot size={18} />
          {chatOpen ? 'Close AI Assistant' : '🤖 Prompt AI Job Finder'}
        </button>
      </div>

      {/* Main 2-Column Grid Layout */}
      <div className="job-explorer-container">
        
        {/* Left Sidebar (Desktop & Mobile Drawer) */}
        {renderSidebar()}

        {/* Right Main Job Listings Section */}
        <div>
          
          {/* Search & Sorting Toolbar */}
          <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Global Search Field */}
            <div style={{ position: 'relative', flex: '1 1 300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search jobs by title, company, or skills (e.g. React, Python)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  fontSize: '0.88rem',
                  borderRadius: '10px',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--panel-bg)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Mobile Filter Toggle */}
              <button
                className="btn btn-secondary"
                onClick={() => setMobileFilterOpen(true)}
                style={{ display: 'none', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
                id="mobile-filter-trigger"
              >
                <Filter size={16} /> Filters {totalActiveFiltersCount > 0 && `(${totalActiveFiltersCount})`}
              </button>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--panel-bg)',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
              >
                <option value="newest">⚡ Sort: Newest First</option>
                <option value="match">🎯 Sort: Highest Match Score</option>
              </select>
            </div>
          </div>

          {/* Active Filter Removable Chips Bar */}
          {totalActiveFiltersCount > 0 && (
            <div className="active-filters-bar">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Active Filters:</span>
              
              {quickFilters.map(f => (
                <span key={f} className="active-filter-chip">
                  ⚡ {f}
                  <button onClick={() => toggleArrayFilter(setQuickFilters, quickFilters, f)}><X size={13} /></button>
                </span>
              ))}

              {locationModes.map(l => (
                <span key={l} className="active-filter-chip">
                  📍 {l}
                  <button onClick={() => toggleArrayFilter(setLocationModes, locationModes, l)}><X size={13} /></button>
                </span>
              ))}

              {cityQuery && (
                <span className="active-filter-chip">
                  🏙️ {cityQuery}
                  <button onClick={() => setCityQuery('')}><X size={13} /></button>
                </span>
              )}

              {jobTypes.map(jt => (
                <span key={jt} className="active-filter-chip">
                  💼 {jt}
                  <button onClick={() => toggleArrayFilter(setJobTypes, jobTypes, jt)}><X size={13} /></button>
                </span>
              ))}

              {roles.map(r => (
                <span key={r} className="active-filter-chip">
                  🎯 {r}
                  <button onClick={() => toggleArrayFilter(setRoles, roles, r)}><X size={13} /></button>
                </span>
              ))}

              {domains.map(d => (
                <span key={d} className="active-filter-chip">
                  🏢 {d}
                  <button onClick={() => toggleArrayFilter(setDomains, domains, d)}><X size={13} /></button>
                </span>
              ))}

              <button
                onClick={clearAllFilters}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginLeft: '0.25rem' }}
              >
                Reset All
              </button>
            </div>
          )}

          {/* Status Counter */}
          <div style={{ marginBottom: '1.25rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text-main)' }}>{filteredJobs.length}</strong> matching vacancies
            </span>
          </div>

          {/* Job Listings Grid */}
          {filteredJobs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>No matching jobs found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Try adjusting your search keywords or clearing some filters in the left sidebar.
              </p>
              <button className="btn btn-secondary" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filteredJobs.map((job) => {
                const matchScore = calculateMatchScore(job);
                return (
                  <div key={job.id} className="glass-panel responsive-job-card" style={{ padding: '1.75rem', position: 'relative' }}>
                    
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                          {job.title}
                        </h3>
                        
                        {/* New Badge */}
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          ✨ Actively Hiring
                        </span>

                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                          💼 {job.experience}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.98rem', color: 'var(--accent)', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Building size={15} /> {job.company}
                      </h4>

                      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                        {expandedJobs[job.id] || (job.description || '').length <= 140
                          ? job.description
                          : `${(job.description || '').slice(0, 140)}... `}
                        {(job.description || '').length > 140 && (
                          <button
                            type="button"
                            onClick={() => toggleJobExpand(job.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              marginLeft: '0.35rem',
                              padding: 0,
                              textDecoration: 'underline'
                            }}
                          >
                            {expandedJobs[job.id] ? 'Show Less' : 'Read More'}
                          </button>
                        )}
                      </p>

                      {/* Required Skills Badges */}
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Skills:</span>
                          {job.required_skills.map((skill, idx) => (
                            <span key={idx} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.18)', color: 'var(--primary)', borderRadius: '6px', fontWeight: 600 }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Card Actions & Match Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch', minWidth: '180px', justifyContent: 'center' }}>
                      
                      {/* AI Match Score Badge */}
                      <div style={{
                        padding: '0.6rem 0.85rem',
                        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: '12px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Profile Match
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.1rem' }}>
                          🎯 {matchScore}%
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        ATS Target: <strong>{job.ats_threshold}%</strong>
                      </div>

                      <button className="btn btn-primary" onClick={() => navigate(`/apply/${job.id}`)} style={{ justifyContent: 'center' }}>
                        Apply Now <ArrowRight size={15} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Floating AI Job Assistant Chatbot Drawer */}
      {chatOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          height: '500px',
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--panel-border)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 3000,
          overflow: 'hidden',
          animation: 'fadeInDown 0.25s ease'
        }}>
          {/* Chatbot Header */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Bot size={22} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>AI Job Finder Assistant</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Conversational Prompt Filtering</div>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Chatbot Message List */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.06)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--panel-border)',
                  color: msg.sender === 'user' ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleChatSubmit} style={{ padding: '0.75rem', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '0.5rem', background: 'var(--panel-bg)' }}>
            <input
              type="text"
              placeholder="e.g. Find remote python internships..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{
                flex: 1,
                padding: '0.55rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: '12px',
                border: '1px solid var(--panel-border)',
                background: 'var(--panel-bg)',
                color: 'var(--text-main)'
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 0.85rem', borderRadius: '12px' }}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

export default Home;
