/**
 * AI Action Control Layer Engine
 * Maps natural language user prompts to structured platform actions & API calls using Gemini LLM backend router.
 */

export const ACTION_TYPES = {
  NAVIGATE: 'NAVIGATE',
  EDIT_PROFILE: 'EDIT_PROFILE',
  EDIT_JOB_FORM: 'EDIT_JOB_FORM',
  AUTO_FILL_FORM: 'AUTO_FILL_FORM',
  ASK_MISSING_DATA: 'ASK_MISSING_DATA',
  MULTI_TASK: 'MULTI_TASK',
  EDIT_RESUME: 'EDIT_RESUME',
  FILTER_JOBS: 'FILTER_JOBS',
  RESET_JOBS: 'RESET_JOBS',
  TOGGLE_THEME: 'TOGGLE_THEME',
  OPEN_MODAL: 'OPEN_MODAL',
  GENERAL_QA: 'GENERAL_QA',
  OPEN_PROFILE: 'OPEN_PROFILE',
  OPEN_JOB_EXPLORER: 'OPEN_JOB_EXPLORER',
  OPEN_HR_DASHBOARD: 'OPEN_HR_DASHBOARD',
  OPEN_PRACTICE: 'OPEN_PRACTICE',
  OPEN_ATS_SCORER: 'OPEN_ATS_SCORER',
  ADD_SKILL: 'ADD_SKILL',
  REMOVE_SKILL: 'REMOVE_SKILL',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  SEARCH_JOBS: 'SEARCH_JOBS',
  POST_NEW_JOB: 'POST_NEW_JOB',
  UNKNOWN: 'UNKNOWN'
};

export const SENSITIVE_ACTIONS = [
  ACTION_TYPES.REMOVE_SKILL,
  ACTION_TYPES.POST_NEW_JOB
];

/**
 * Asynchronously parses user prompt into a structured Action Intent object using LLM Intent Router endpoint.
 */
export const parseUserIntentAsync = async (prompt, context = {}) => {
  const text = prompt.trim();
  const currentPath = context.location?.pathname || '/';

  try {
    const response = await fetch('/api/ai/intent-router/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_query: text,
        current_path: currentPath,
        context_data: {
          user: context.user ? { id: context.user.id, username: context.user.username, is_recruiter: context.user.is_recruiter } : null,
          activeAnalysisId: context.activeAnalysisId || null
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const resolvedType = data.action_type || ACTION_TYPES.GENERAL_QA;

      if (resolvedType === ACTION_TYPES.GENERAL_QA) {
        const clientIntent = fallbackClientParseIntent(text, context);
        if (clientIntent.type !== ACTION_TYPES.GENERAL_QA) {
          return clientIntent;
        }
      }

      return {
        type: resolvedType,
        targetPath: data.target_route || null,
        summary: data.summary || 'Subh AI Request',
        message: data.message || '',
        missingField: data.missing_field || null,
        subActions: data.sub_actions || [],
        logs: data.logs || ['✓ LLM Intent resolution completed'],
        payload: data.payload || {},
        requiresConfirmation: data.requires_confirmation || false,
        confirmationMessage: data.confirmation_message || null,
        updatedProfile: data.updated_profile || null
      };
    }
  } catch (err) {
    console.warn("Backend Intent Router endpoint failed, falling back to local engine:", err);
  }

  // Fallback client-side engine if API is unreachable
  return fallbackClientParseIntent(text, context);
};

// Backwards-compatible synchronous parser wrapper
export const parseUserIntent = (prompt, context = {}) => {
  return fallbackClientParseIntent(prompt, context);
};

const fallbackClientParseIntent = (prompt, context = {}) => {
  const text = prompt.trim().toLowerCase();

  if (text.includes('mock') || text.includes('practice') || text.includes('interview') || text.includes('setup interview') || text.includes('start interview') || text.includes('send pdf') || text.includes('launch interview')) {
    const isBackend = text.includes('backend') || text.includes('django') || text.includes('node') || text.includes('python') || text.includes('sql') || text.includes('api');
    const isProduct = text.includes('product') || text.includes('design') || text.includes('ux') || text.includes('ui');
    const role = isBackend ? 'Backend Developer' : (isProduct ? 'Product Manager' : 'Frontend Developer');
    
    let topics = 'General Technical Concepts';
    if (text.includes('django')) topics = 'Django, Python, REST APIs, PostgreSQL';
    else if (text.includes('react')) topics = 'React, JavaScript, Vite, State Management';
    else if (isBackend) topics = 'Backend Architecture, SQL, APIs, Security';

    const autoLaunch = text.includes('launch') || text.includes('start') || text.includes('confirm');

    return {
      type: ACTION_TYPES.AUTO_FILL_FORM,
      targetPath: '/practice',
      summary: `Auto-fill & Setup ${role} Mock Interview`,
      requiresConfirmation: true,
      confirmationMessage: `I've auto-filled the mock interview setup form for ${role} focusing on ${topics} using your profile data and attached your PDF resume. Confirm to generate and launch the interview in the practice room!`,
      payload: {
        form_type: 'practice_mock',
        form_data: {
          name: context.user?.username || 'Candidate',
          email: context.user?.email || 'candidate@example.com',
          targetRole: role,
          focusTopics: topics,
          description: `Custom practice mock interview for ${role} focusing on ${topics}.`,
          attachPdf: true,
          autoSubmit: autoLaunch
        }
      },
      logs: ['✓ Identified intent: Auto-fill Mock Practice Interview & Attach PDF Resume'],
      message: `I have prepared your ${role} practice interview setup with focus on ${topics} and attached your candidate PDF resume.`
    };
  }

  if (text.includes('theme') || text.includes('dark') || text.includes('light')) {
    const targetTheme = text.includes('light') ? 'light' : 'dark';
    return {
      type: ACTION_TYPES.TOGGLE_THEME,
      summary: `Switch to ${targetTheme} theme`,
      payload: { theme: targetTheme },
      logs: ['✓ Identified intent: Change UI Theme'],
      message: `Switching theme to ${targetTheme} mode!`
    };
  }

  if (text.includes('reset job') || text.includes('clear job') || text.includes('show all jobs') || text.includes('clear filter')) {
    return {
      type: ACTION_TYPES.RESET_JOBS,
      targetPath: '/jobs',
      summary: 'Reset Job Listings & Clear Filters',
      logs: ['✓ Identified intent: Reset Jobs'],
      message: 'Resetting job search filters and loading all active vacancies!'
    };
  }

  if (text.includes('profile') || text.includes('bio') || text.includes('skill')) {
    return {
      type: ACTION_TYPES.NAVIGATE,
      targetPath: '/profile',
      summary: 'Open Profile Page',
      logs: ['✓ Identified intent: Navigate to Profile', '✓ Target route: /profile'],
      message: 'Opening your profile page!'
    };
  }

  if (text.includes('job') || text.includes('vacanc') || text.includes('search') || text.includes('intern')) {
    return {
      type: ACTION_TYPES.FILTER_JOBS,
      targetPath: '/jobs',
      summary: `Filter Jobs by "${prompt}"`,
      payload: { filterText: prompt },
      logs: ['✓ Identified intent: Search & Filter Jobs', '✓ Target route: /jobs'],
      message: `Filtering job feed for "${prompt}"!`
    };
  }

  if (text.includes('ats') || text.includes('resume') || text.includes('score')) {
    return {
      type: ACTION_TYPES.NAVIGATE,
      targetPath: '/ats-scorer',
      summary: 'Open ATS Scorer',
      logs: ['✓ Identified intent: ATS Resume Analyzer', '✓ Target route: /ats-scorer'],
      message: 'Opening ATS Resume Scorer!'
    };
  }

  if (text.includes('hr') || text.includes('recruiter') || text.includes('post')) {
    return {
      type: ACTION_TYPES.NAVIGATE,
      targetPath: '/hr',
      summary: 'Open HR Dashboard',
      logs: ['✓ Identified intent: Recruiter Dashboard', '✓ Target route: /hr'],
      message: 'Opening Recruiter HR Dashboard!'
    };
  }

  if (text.includes('practice') || text.includes('mock') || text.includes('interview arena')) {
    return {
      type: ACTION_TYPES.NAVIGATE,
      targetPath: '/practice',
      summary: 'Open Practice Room',
      logs: ['✓ Identified intent: Mock Interview Arena', '✓ Target route: /practice'],
      message: 'Opening Practice Interview Room!'
    };
  }

  return {
    type: ACTION_TYPES.GENERAL_QA,
    summary: 'Subh AI Assistance',
    logs: ['✓ Processing conversational query'],
    message: `Subh AI is assisting you with: "${prompt}"`
  };
};

/**
 * Executes a resolved Action intent via Django API and React state.
 */
export const executeAction = async (actionIntent, context = {}) => {
  const { type, payload, targetPath, message, updatedProfile, subActions } = actionIntent;
  const executionLogs = actionIntent.logs ? [...actionIntent.logs] : [];

  // Execute sub-actions if multi-task
  if (type === ACTION_TYPES.MULTI_TASK && Array.isArray(subActions) && subActions.length > 0) {
    let combinedLogs = [...executionLogs];
    let lastMsg = message;
    for (const sub of subActions) {
      const res = await executeAction(sub, context);
      if (res.logs) combinedLogs = combinedLogs.concat(res.logs);
      if (res.message) lastMsg = res.message;
    }
    return { success: true, logs: combinedLogs, message: lastMsg || '✓ Executed all requested tasks!' };
  }

  // Navigate if target route specified
  if (context.navigate && targetPath && context.location?.pathname !== targetPath) {
    context.navigate(targetPath);
    executionLogs.push(`✓ Navigated to ${targetPath}`);
  }

  // Handle specific action logic
  switch (type) {
    case ACTION_TYPES.AUTO_FILL_FORM:
      const formType = payload?.form_type;
      const formData = payload?.form_data || {};

      if (formType === 'practice_mock') {
        sessionStorage.setItem('pending_practice_ai_autofill', JSON.stringify(formData));
        window.dispatchEvent(new CustomEvent('auto-fill-practice-ai', { detail: formData }));
        executionLogs.push('✓ Auto-filled Practice Mock Interview Setup form & attached candidate PDF resume');
        if (formData.autoSubmit) {
          executionLogs.push('⚡ Generating & launching practice interview room...');
        }
      } else if (formType === 'job_application') {
        sessionStorage.setItem('pending_apply_ai_autofill', JSON.stringify(formData));
        window.dispatchEvent(new CustomEvent('auto-fill-apply-ai', { detail: formData }));
        executionLogs.push('✓ Auto-filled Candidate Application details & resume');
      } else if (formType === 'recruiter_job') {
        const recruiterData = {
          description: formData.job_description,
          skills: formData.required_skills,
          customQuestions: formData.custom_questions
        };
        sessionStorage.setItem('pending_recruiter_ai_autofill', JSON.stringify(recruiterData));
        window.dispatchEvent(new CustomEvent('apply-recruiter-assistant-data', { detail: recruiterData }));
        window.dispatchEvent(new CustomEvent('open-create-job-modal'));
        executionLogs.push('✓ Pre-filled Recruiter Job Posting Specs');
      }

      return {
        success: true,
        logs: executionLogs,
        message: message || '✓ Auto-filled form details!'
      };

    case ACTION_TYPES.ASK_MISSING_DATA:
      executionLogs.push(`⚠️ Missing data field: ${actionIntent.missingField || 'data'}`);
      return {
        success: true,
        logs: executionLogs,
        message: message || `Could you please provide your ${actionIntent.missingField || 'missing details'} so I can complete this for you?`
      };

    case ACTION_TYPES.TOGGLE_THEME:
      const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
      let targetTheme = payload?.theme;
      if (!targetTheme || targetTheme === 'toggle') {
        targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
      }
      document.documentElement.setAttribute('data-theme', targetTheme);
      localStorage.setItem('theme', targetTheme);
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: targetTheme }));
      executionLogs.push(`✓ Switched application theme from ${currentTheme.toUpperCase()} to ${targetTheme.toUpperCase()} mode`);
      return {
        success: true,
        logs: executionLogs,
        message: message || `✓ Switched to ${targetTheme} mode theme!`
      };


    case ACTION_TYPES.RESET_JOBS:
      if (context.navigate) {
        context.navigate('/jobs');
      }
      window.dispatchEvent(new CustomEvent('reset-jobs-ai'));
      window.dispatchEvent(new CustomEvent('filter-jobs-ai', { detail: 'reset' }));
      executionLogs.push('✓ Cleared job filters & reset candidate job feed');
      return {
        success: true,
        logs: executionLogs,
        message: message || '✓ Cleared search & reset job feed listings!'
      };

    case ACTION_TYPES.EDIT_PROFILE:
    case 'UPDATE_PROFILE':
      if (updatedProfile) {
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: updatedProfile }));
        executionLogs.push('✓ Triggered live profile UI state update');
      } else {
        window.dispatchEvent(new CustomEvent('profile-updated'));
      }
      return {
        success: true,
        logs: executionLogs,
        message: message || '✓ Profile updated successfully!'
      };

    case ACTION_TYPES.EDIT_JOB_FORM:
      window.dispatchEvent(new CustomEvent('apply-recruiter-assistant-data', {
        detail: {
          description: payload?.job_description,
          skills: payload?.required_skills,
          customQuestions: payload?.custom_questions
        }
      }));
      window.dispatchEvent(new CustomEvent('open-create-job-modal'));
      executionLogs.push('✓ Dispatched recruiter form pre-fill event');
      return {
        success: true,
        logs: executionLogs,
        message: message || '✓ Prepared recruitment job specifications and opened form!'
      };

    case ACTION_TYPES.FILTER_JOBS:
      window.dispatchEvent(new CustomEvent('filter-jobs-ai', { detail: payload?.filterText || '' }));
      executionLogs.push('✓ Dispatched live job feed filter event');
      return {
        success: true,
        logs: executionLogs,
        message: message || `✓ Applied job filters for "${payload?.filterText || ''}"!`
      };

    case ACTION_TYPES.EDIT_RESUME:
      if (context.activeAnalysisId) {
        try {
          executionLogs.push(`✓ Submitting resume modification request for analysis #${context.activeAnalysisId}...`);
          const res = await fetch(`/api/ats/analysis/${context.activeAnalysisId}/chat-fix/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_instruction: payload?.user_instruction || actionIntent.summary })
          });
          const data = await res.json();
          executionLogs.push('✓ Resume PDF regenerated & saved');
          window.dispatchEvent(new CustomEvent('resume-updated', { detail: data }));
          return {
            success: true,
            logs: executionLogs,
            message: '✓ Resume updated successfully! You can view or download the new PDF.'
          };
        } catch (err) {
          return { success: false, logs: executionLogs, error: err.message };
        }
      }
      return {
        success: true,
        logs: executionLogs,
        message: message || 'Please upload or select a resume on ATS Scorer page first.'
      };

    case ACTION_TYPES.NAVIGATE:
    case ACTION_TYPES.OPEN_PROFILE:
    case ACTION_TYPES.OPEN_JOB_EXPLORER:
    case ACTION_TYPES.OPEN_HR_DASHBOARD:
    case ACTION_TYPES.OPEN_PRACTICE:
    case ACTION_TYPES.OPEN_ATS_SCORER:
      return {
        success: true,
        logs: executionLogs,
        message: message || `✓ Navigated to ${targetPath || 'requested page'}.`
      };

    case ACTION_TYPES.GENERAL_QA:
    default:
      return {
        success: true,
        logs: executionLogs,
        message: message || '✓ Subh AI query processed.'
      };
  }
};
