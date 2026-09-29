import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, File, Image, Check, ArrowRight } from 'lucide-react';

const DOMAINS = {
  "tech": {
    label: "💻 Tech & Software Engineering",
    roles: [
      "Frontend Developer", 
      "Backend Developer", 
      "Fullstack Developer", 
      "Mobile App Developer", 
      "DevOps Engineer", 
      "Machine Learning Engineer", 
      "Data Scientist", 
      "Data Analyst", 
      "Cyber Security Specialist"
    ]
  },
  "product": {
    label: "🎨 Product & Creative Design",
    roles: [
      "Product Manager", 
      "UX/UI Designer", 
      "Graphic Designer", 
      "Product Analyst"
    ]
  },
  "business": {
    label: "📊 Finance & Business Operations",
    roles: [
      "Financial Analyst", 
      "Business Analyst", 
      "Investment Banking Analyst", 
      "Accountant",
      "Auditor"
    ]
  },
  "marketing": {
    label: "📈 Marketing & Sales Development",
    roles: [
      "Digital Marketing Specialist", 
      "Content Writer / Copywriter", 
      "Business Development Representative", 
      "SEO Specialist",
      "Sales Executive"
    ]
  },
  "ops": {
    label: "⚙️ Operations & HR Management",
    roles: [
      "HR Manager / Recruiter", 
      "Operations Manager", 
      "Customer Support Representative", 
      "Office Administrator"
    ]
  },
  "custom": {
    label: "✨ Other (Custom Domain / Custom Role)",
    roles: []
  }
};

function PracticeSetup() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('tech');
  const [selectedPreset, setSelectedPreset] = useState('Frontend Developer');
  const [customRole, setCustomRole] = useState('');
  const [focusTopics, setFocusTopics] = useState('');
  const [description, setDescription] = useState('');
  const [resume, setResume] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  
  const [submitState, setSubmitState] = useState('idle'); // 'idle', 'submitting', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const createValidBinaryPdf = (candidateName, role, topics) => {
    const pdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 280>> stream
BT
/F1 12 Tf
50 720 Td
(CANDIDATE PROFILE PRACTICE RESUME) Tj
0 -24 Td
(Candidate Name: ${candidateName.replace(/[()]/g, '')}) Tj
0 -20 Td
(Target Practice Role: ${role.replace(/[()]/g, '')}) Tj
0 -20 Td
(Key Focus Skills: ${topics.replace(/[()]/g, '')}) Tj
0 -20 Td
(Technical Profile: Proficient in software architecture, REST APIs, and system design.) Tj
ET
endstream
endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000115 00000 n 
0000000240 00000 n 
0000000580 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
640
%%EOF`;
    return new File([pdfContent], "candidate_practice_resume.pdf", { type: "application/pdf" });
  };

  const fetchLatestResumePdf = async (candidateName, role, topics) => {
    try {
      const historyRes = await fetch('/api/ats/history/');
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (Array.isArray(historyData) && historyData.length > 0) {
          const latest = historyData[0];
          const resumeUrl = latest.fixed_resume_file_url || latest.resume_file_url;
          if (resumeUrl) {
            const pdfRes = await fetch(resumeUrl);
            if (pdfRes.ok) {
              const blob = await pdfRes.blob();
              return new File([blob], "candidate_profile_resume.pdf", { type: "application/pdf" });
            }
          }
        }
      }
    } catch (e) {}
    return createValidBinaryPdf(candidateName, role, topics);
  };

  useEffect(() => {
    let currentUserData = {};
    fetch('/api/auth/profile/')
      .then(res => res.json())
      .then(data => {
        if (data.full_name) setName(data.full_name);
        if (data.user?.email) setEmail(data.user.email);
        if (data.interests && data.interests.length > 0) {
          setSelectedDomain('custom');
          setCustomRole(data.interests[0]);
        }
        currentUserData = data;

        const pending = sessionStorage.getItem('pending_practice_ai_autofill');
        if (pending) {
          sessionStorage.removeItem('pending_practice_ai_autofill');
          try {
            processAutoFill(JSON.parse(pending), data);
          } catch (e) {}
        }
      })
      .catch(() => {
        const pending = sessionStorage.getItem('pending_practice_ai_autofill');
        if (pending) {
          sessionStorage.removeItem('pending_practice_ai_autofill');
          try {
            processAutoFill(JSON.parse(pending), {});
          } catch (e) {}
        }
      });

    const handleAutoFill = (e) => {
      const data = e.detail || {};
      processAutoFill(data, currentUserData);
    };

    window.addEventListener('auto-fill-practice-ai', handleAutoFill);
    return () => window.removeEventListener('auto-fill-practice-ai', handleAutoFill);
  }, []);

  const processAutoFill = async (data, profileData = {}) => {
    const candidateName = data.name || profileData.full_name || name || 'Candidate';
    const candidateEmail = data.email || profileData.user?.email || email || 'candidate@example.com';
    setName(candidateName);
    setEmail(candidateEmail);

    let finalRole = 'Backend Developer';
    if (data.targetRole) {
      finalRole = data.targetRole;
      const roleLower = data.targetRole.toLowerCase();
      let matched = false;
      for (const [dKey, dVal] of Object.entries(DOMAINS)) {
        if (dKey === 'custom') continue;
        const foundPreset = dVal.roles.find(r => r.toLowerCase().includes(roleLower) || roleLower.includes(r.toLowerCase()));
        if (foundPreset) {
          setSelectedDomain(dKey);
          setSelectedPreset(foundPreset);
          finalRole = foundPreset;
          matched = true;
          break;
        }
      }
      if (!matched) {
        setSelectedDomain('custom');
        setCustomRole(data.targetRole);
      }
    }

    const topics = data.focusTopics || focusTopics || 'Django, Python, REST APIs';
    const desc = data.description || description || `Custom practice mock interview for ${finalRole}.`;
    if (data.focusTopics) setFocusTopics(data.focusTopics);
    if (data.description) setDescription(data.description);

    // Auto-attach Candidate PDF Resume
    let pdfFile = resume;
    if (!pdfFile) {
      pdfFile = await fetchLatestResumePdf(candidateName, finalRole, topics);
      setResume(pdfFile);
    }

    if (data.autoSubmit) {
      executeMockSetupSubmit({
        candName: candidateName,
        candEmail: candidateEmail,
        title: finalRole,
        topics: topics,
        desc: desc,
        resumeFile: pdfFile
      });
    }
  };


  const handleDomainChange = (e) => {
    const domain = e.target.value;
    setSelectedDomain(domain);
    if (domain !== 'custom' && DOMAINS[domain].roles.length > 0) {
      setSelectedPreset(DOMAINS[domain].roles[0]);
    }
  };

  const getRoleTitle = () => {
    if (selectedDomain === 'custom') {
      return customRole.trim();
    }
    return selectedPreset;
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'resume') {
      if (file.type !== 'application/pdf') {
        setError("Only PDF files are supported for resume uploading.");
        return;
      }
      setResume(file);
      setError('');
    } else if (type === 'pic') {
      if (!file.type.startsWith('image/')) {
        setError("Only image files are supported for profile verification.");
        return;
      }
      setProfilePic(file);
      setError('');
    }
  };

  const executeMockSetupSubmit = async ({ candName, candEmail, title, topics, desc, resumeFile }) => {
    const finalTitle = title || getRoleTitle();
    const finalName = candName || name;
    const finalEmail = candEmail || email || "practice@hireai.internal";

    if (!finalName || !finalTitle) {
      setError("Please fill in your name and select/input your target role.");
      return;
    }

    let activeResume = resumeFile || resume;

    setSubmitState('submitting');
    setError('');

    const stages = [
      "Initializing mock practice session...",
      `Generating customized ${finalTitle} interview JD...`,
      "Analyzing focus topics & profile skills...",
      "Bypassing ATS matching thresholds...",
      "Establishing secure AI interview practice room..."
    ];
    let stageIdx = 0;
    setStatusMessage(stages[0]);
    const timer = setInterval(() => {
      if (stageIdx < stages.length - 1) {
        stageIdx++;
        setStatusMessage(stages[stageIdx]);
      }
    }, 900);

    fetch('/api/recruiter/create-mock-job/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: finalTitle,
        description: desc || description,
        focus_topics: topics || focusTopics
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Could not initialize mock practice job");
        return res.json();
      })
      .then(jobData => {
        const formData = new FormData();
        formData.append("candidate_name", finalName);
        formData.append("candidate_email", finalEmail);
        if (activeResume) {
          formData.append("resume", activeResume);
        }
        if (profilePic) {
          formData.append("candidate_image", profilePic);
        }

        return fetch(`/api/jobs/${jobData.job_id}/apply/`, {
          method: 'POST',
          body: formData
        });
      })
      .then(res => {
        clearInterval(timer);
        if (!res.ok) {
          return res.json().then(data => { throw new Error(data.error || "Failed to schedule practice session") });
        }
        return res.json();
      })
      .then(appData => {
        setSubmitState('idle');
        navigate(`/interview/${appData.id}`);
      })
      .catch(err => {
        clearInterval(timer);
        setSubmitState('error');
        setError(err.message || "Failed to launch mock practice session.");
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeMockSetupSubmit({});
  };

  if (submitState === 'submitting') {
    return (
      <div className="container" style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel scan-loader" style={{ maxWidth: '450px', width: '100%' }}>
          <div className="pulse-spinner">
            <Upload size={32} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Setting Up Practice Room</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5 }}>
            Our AI interviewer Shlok is custom-designing your practice exam now.
          </p>
          <div style={{ padding: '0.6rem 1.2rem', backgroundColor: 'rgba(139, 92, 246, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139, 92, 246, 0.15)', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
            {statusMessage}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '6rem' }}>
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem', textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          ⚡ Start AI Mock Practice
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 2rem 0' }}>
          Practice makes perfect! Set up a custom mock interview sandbox tailored directly to your target role and resume credentials.
        </p>

        {error && (
          <div style={{ padding: '0.8rem', backgroundColor: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="cand-name">Your Full Name *</label>
              <input
                type="text"
                id="cand-name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cand-email">Your Email Address (Optional)</label>
              <input
                type="email"
                id="cand-email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email (optional)"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="domain-select">Industry / Domain *</label>
              <select
                id="domain-select"
                className="form-input"
                value={selectedDomain}
                onChange={handleDomainChange}
                style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                {Object.keys(DOMAINS).map((key) => (
                  <option key={key} value={key}>
                    {DOMAINS[key].label}
                  </option>
                ))}
              </select>
            </div>

            {selectedDomain !== 'custom' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="role-select">Target Practice Role *</label>
                <select
                  id="role-select"
                  className="form-input"
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  {DOMAINS[selectedDomain].roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="custom-role-input">Specify Custom Job Role *</label>
                <input
                  type="text"
                  id="custom-role-input"
                  className="form-input"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="e.g. Mechanical Engineer, Sales Manager, Nurse"
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label" htmlFor="focus-topics">Specific Interview Topics / Key Focus Areas (Optional)</label>
            <input
              type="text"
              id="focus-topics"
              className="form-input"
              value={focusTopics}
              onChange={(e) => setFocusTopics(e.target.value)}
              placeholder="e.g. React state management, Python API testing, SQL queries, sales negotiation tactics"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Specify individual topics, concepts, or tools you wish to focus on for highly targeted questions.
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label" htmlFor="mock-jd">Job Description (JD) / Key Requirements (Optional)</label>
            <textarea
              id="mock-jd"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste specific JD details here if you have one. If left blank, Shlok will generate custom responsibilities matching your target role."
              rows="3"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Resume Upload Dropzone */}
          <div className="form-group">
            <label className="form-label">Upload Resume (PDF only) (Optional — Auto-generated if omitted)</label>
            <label className="glass-panel" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '2rem 1rem', 
              cursor: 'pointer', 
              borderStyle: resume ? 'solid' : 'dashed', 
              borderWidth: resume ? '2px' : '1px',
              borderColor: resume ? '#10b981' : 'var(--panel-border)',
              backgroundColor: resume ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
              borderRadius: '14px',
              transition: 'all 0.25s ease'
            }}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, 'resume')}
                style={{ display: 'none' }}
              />
              <File size={32} style={{ color: resume ? '#10b981' : 'var(--text-muted)', marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: resume ? '#10b981' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {resume ? (
                  <>
                    <Check size={18} />
                    📄 {resume.name}
                  </>
                ) : (
                  "Click to Upload PDF Resume"
                )}
              </span>
              <span style={{ fontSize: '0.78rem', color: resume ? '#34d399' : 'var(--text-muted)', marginTop: '0.35rem', fontWeight: resume ? 600 : 400 }}>
                {resume ? "✓ PDF Document Attached & Personalized for AI Interviewer" : "Used to personalize Shlok's technical questions based on your skills"}
              </span>
              {resume && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', textDecoration: 'underline' }}>
                  Click to replace or select a different PDF file
                </span>
              )}
            </label>
          </div>

          {/* Profile Picture Upload Dropzone */}
          <div className="form-group">
            <label className="form-label">Profile Verification Image (Optional)</label>
            <label className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', cursor: 'pointer', borderStyle: 'dashed', borderColor: profilePic ? 'var(--success)' : 'var(--panel-border)' }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'pic')}
                style={{ display: 'none' }}
              />
              <Image size={28} style={{ color: profilePic ? 'var(--success)' : 'var(--text-muted)', marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: profilePic ? 'var(--success)' : 'var(--text-main)' }}>
                {profilePic ? profilePic.name : "Select Profile Image"}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Used to match your face during camera checks inside the room
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Launch Practice Room <ArrowRight size={16} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default PracticeSetup;
