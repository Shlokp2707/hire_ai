import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Eye, EyeOff, Zap, Sparkles, Plus, Globe, Mic, Search, Cpu, Trash2 } from 'lucide-react';
import './APIKeySettings.css';

const DEFAULT_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    badge: 'Zero-Cost Tier 🌟',
    badgeClass: 'badge-free',
    description: '100% FREE AI Key from Google AI Studio (15 RPM free, no credit card required).',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIzaSy...',
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast & Free)' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Advanced Reasoning)' }
    ]
  },
  groq: {
    name: 'Groq AI',
    badge: 'Ultra-Fast & Low Cost ⚡',
    badgeClass: 'badge-groq',
    description: 'Blazing fast inference on LPU chips ($0.05-$0.59 / 1M tokens). Includes Whisper STT.',
    getKeyUrl: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Recommended)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Lightning Fast)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (High Context)' }
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    badge: 'Universal Router 🌐',
    badgeClass: 'badge-openrouter',
    description: 'Access 100+ models (DeepSeek R1, Llama 3.3, Qwen) using a single API key.',
    getKeyUrl: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-v1-...',
    models: [
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Ultra Cheap)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B' }
    ]
  },
  deepseek: {
    name: 'DeepSeek Direct',
    badge: 'Ultra Cheap AI 🐋',
    badgeClass: 'badge-deepseek',
    description: 'Direct API access to DeepSeek V3 & R1 ($0.14 / 1M tokens).',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    placeholder: 'sk-...',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 Reasoner' }
    ]
  },
  openai: {
    name: 'OpenAI',
    badge: 'Premium Standard 🧠',
    badgeClass: 'badge-openai',
    description: 'Industry standard models (GPT-4o-mini ~$0.15 / 1M tokens).',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o-mini (Cost Optimized)' },
      { id: 'gpt-4o', name: 'GPT-4o (Full Intelligence)' }
    ]
  },
  anthropic: {
    name: 'Anthropic Claude',
    badge: 'Enterprise Reasoning 🏛️',
    badgeClass: 'badge-anthropic',
    description: 'Advanced nuance & deep technical evaluation (Claude 3.5 Sonnet / Haiku).',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...',
    models: [
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Pro)' }
    ]
  },
  tavily: {
    name: 'Tavily Search API',
    badge: 'Web Research 🔍',
    badgeClass: 'badge-tavily',
    description: 'Real-time web search key for live candidate research & ATS skill enrichment.',
    getKeyUrl: 'https://tavily.com',
    placeholder: 'tvly-...',
    models: [{ id: 'default', name: 'Tavily Search API' }]
  },
  elevenlabs: {
    name: 'ElevenLabs Voice',
    badge: 'Voice Synthesis 🎙️',
    badgeClass: 'badge-elevenlabs',
    description: 'Ultra-realistic AI voice generation for interviewer speech.',
    getKeyUrl: 'https://elevenlabs.io',
    placeholder: 'sk_...',
    models: [{ id: 'eleven_multilingual_v2', name: 'Eleven Multilingual V2' }]
  }
};

export default function APIKeySettings() {
  const [userKeys, setUserKeys] = useState({});
  const [systemDefaults, setSystemDefaults] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [keyInputs, setKeyInputs] = useState({});
  const [baseUrls, setBaseUrls] = useState({});
  const [selectedModels, setSelectedModels] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [validating, setValidating] = useState({});
  const [saving, setSaving] = useState({});
  const [feedback, setFeedback] = useState({});

  // Custom provider modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({
    provider_id: '',
    provider_name: '',
    api_base_url: '',
    api_key: '',
    selected_model: ''
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user-keys/');
      if (res.ok) {
        const data = await res.json();
        const keyMap = {};
        const modelMap = {};
        const urlMap = {};

        (data.user_keys || []).forEach(k => {
          keyMap[k.provider] = k;
          if (k.selected_model) modelMap[k.provider] = k.selected_model;
          if (k.api_base_url) urlMap[k.provider] = k.api_base_url;
        });

        setUserKeys(keyMap);
        setSelectedModels(prev => ({ ...prev, ...modelMap }));
        setBaseUrls(prev => ({ ...prev, ...urlMap }));
        setSystemDefaults(data.system_defaults || {});
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestKey = async (provider, customUrl = '') => {
    const key = keyInputs[provider] || (userKeys[provider] ? 'EXISTING_KEY' : '');
    const url = baseUrls[provider] || customUrl;

    if (!key) {
      setFeedback(prev => ({ ...prev, [provider]: { type: 'error', text: 'Please enter an API key to test.' } }));
      return;
    }

    setValidating(prev => ({ ...prev, [provider]: true }));
    setFeedback(prev => ({ ...prev, [provider]: null }));

    try {
      const res = await fetch('/api/user-keys/validate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          api_key: key === 'EXISTING_KEY' ? userKeys[provider].masked_key : key,
          api_base_url: url
        })
      });
      const data = await res.json();

      if (data.is_valid) {
        setFeedback(prev => ({ ...prev, [provider]: { type: 'success', text: '✓ ' + data.message } }));
      } else {
        setFeedback(prev => ({ ...prev, [provider]: { type: 'error', text: '✕ ' + (data.error || data.message || 'Key validation failed.') } }));
      }
    } catch (err) {
      setFeedback(prev => ({ ...prev, [provider]: { type: 'error', text: 'Network error verifying key.' } }));
    } finally {
      setValidating(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSaveKey = async (provider, providerName = '', customUrl = '') => {
    const key = keyInputs[provider];
    if (!key) {
      setFeedback(prev => ({ ...prev, [provider]: { type: 'error', text: 'Please enter an API key to save.' } }));
      return;
    }

    setSaving(prev => ({ ...prev, [provider]: true }));
    setFeedback(prev => ({ ...prev, [provider]: null }));

    const payload = {
      provider,
      provider_name: providerName || (DEFAULT_PROVIDERS[provider] ? DEFAULT_PROVIDERS[provider].name : provider),
      api_key: key,
      api_base_url: baseUrls[provider] || customUrl,
      selected_model: selectedModels[provider] || '',
      validate: true
    };

    try {
      const res = await fetch('/api/user-keys/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback(prev => ({ ...prev, [provider]: { type: 'success', text: '✓ ' + data.message } }));
        setKeyInputs(prev => ({ ...prev, [provider]: '' }));
        fetchKeys();
      } else {
        setFeedback(prev => ({ ...prev, [provider]: { type: 'error', text: '✕ ' + (data.error || 'Failed to save key.') } }));
      }
    } catch (err) {
      setFeedback(prev => ({ ...prev, [provider]: { type: 'error', text: 'Error connecting to server.' } }));
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleDeleteKey = async (provider) => {
    const providerName = DEFAULT_PROVIDERS[provider] ? DEFAULT_PROVIDERS[provider].name : provider;
    if (!window.confirm(`Are you sure you want to remove your ${providerName} key?`)) return;

    try {
      const res = await fetch(`/api/user-keys/${provider}/`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback(prev => ({ ...prev, [provider]: { type: 'success', text: `${providerName} key removed.` } }));
        fetchKeys();
      }
    } catch (err) {
      console.error('Delete key error:', err);
    }
  };

  const handleSaveCustomModal = async (e) => {
    e.preventDefault();
    const pid = customForm.provider_id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!pid || !customForm.api_key) {
      alert('Provider ID and API Key are required.');
      return;
    }

    setSaving(prev => ({ ...prev, [pid]: true }));
    try {
      const res = await fetch('/api/user-keys/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: pid,
          provider_name: customForm.provider_name || pid,
          api_base_url: customForm.api_base_url,
          api_key: customForm.api_key,
          selected_model: customForm.selected_model,
          validate: false
        })
      });
      if (res.ok) {
        setShowCustomModal(false);
        setCustomForm({ provider_id: '', provider_name: '', api_base_url: '', api_key: '', selected_model: '' });
        fetchKeys();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save custom provider key.');
      }
    } catch (err) {
      alert('Network error saving custom provider.');
    } finally {
      setSaving(prev => ({ ...prev, [pid]: false }));
    }
  };

  if (loading) {
    return (
      <div className="byok-container">
        <div className="byok-loader">
          <RefreshCw className="spin-icon" size={32} />
          <p>Loading AI Provider Settings...</p>
        </div>
      </div>
    );
  }

  // Combine standard provider keys with user's custom created keys
  const allProvidersKeys = Array.from(new Set([...Object.keys(DEFAULT_PROVIDERS), ...Object.keys(userKeys)]));

  return (
    <div className="byok-container">
      {/* Header Banner */}
      <div className="byok-header-card">
        <div className="byok-header-content">
          <div className="byok-icon-badge">
            <Key size={32} className="header-icon" />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h1>Bring Your Own Key (BYOK) & Custom AI Endpoints</h1>
            <p>Connect your own API key for **Google Gemini (Free)**, **Groq**, **OpenRouter**, **DeepSeek**, or **ANY Custom OpenAI-Compatible Provider** (Ollama, LM Studio, Together AI).</p>
          </div>
          <button className="btn-add-custom-provider" onClick={() => setShowCustomModal(true)}>
            <Plus size={18} /> Add Custom Provider
          </button>
        </div>
        
        <div className="byok-zero-cost-banner">
          <Sparkles className="sparkle-icon" size={20} />
          <span>
            <strong>💡 Zero-Cost Recommendation:</strong> Connect your free <strong>Google Gemini API Key</strong> (15 requests/min for free with no credit card required) or <strong>OpenRouter / Groq</strong> keys for pennies per month.
          </span>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="byok-providers-grid">
        {allProvidersKeys.map((providerKey) => {
          const info = DEFAULT_PROVIDERS[providerKey] || {
            name: userKeys[providerKey]?.provider_name || providerKey.toUpperCase(),
            badge: 'Custom Endpoint 🚀',
            badgeClass: 'badge-custom',
            description: `Custom API endpoint (${userKeys[providerKey]?.api_base_url || 'User Defined'}).`,
            getKeyUrl: '',
            placeholder: 'API Key...',
            models: [{ id: userKeys[providerKey]?.selected_model || 'custom-model', name: userKeys[providerKey]?.selected_model || 'Custom Model' }]
          };

          const configuredKey = userKeys[providerKey];
          const hasSystemDefault = systemDefaults[providerKey];

          return (
            <div key={providerKey} className={`byok-card ${configuredKey ? 'card-active' : ''}`}>
              <div className="byok-card-header">
                <div className="byok-title-group">
                  <h3>{info.name}</h3>
                  <span className={`byok-badge ${info.badgeClass}`}>{info.badge}</span>
                </div>

                <div className="byok-status-pill">
                  {configuredKey ? (
                    <span className="status-configured">
                      <CheckCircle size={14} /> Custom Key Active
                    </span>
                  ) : hasSystemDefault ? (
                    <span className="status-fallback">
                      <Zap size={14} /> System Default Active
                    </span>
                  ) : (
                    <span className="status-missing">
                      <AlertTriangle size={14} /> Not Configured
                    </span>
                  )}
                </div>
              </div>

              <p className="byok-description">{info.description}</p>

              {/* Active Key Display */}
              {configuredKey && (
                <div className="byok-active-key-info">
                  <div className="key-preview">
                    <Shield size={16} />
                    <span>Key: <strong>{configuredKey.masked_key}</strong></span>
                  </div>
                  <button className="btn-remove-key" onClick={() => handleDeleteKey(providerKey)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              )}

              {/* Get Key Link */}
              {info.getKeyUrl && (
                <div className="byok-get-key-link">
                  <a href={info.getKeyUrl} target="_blank" rel="noreferrer">
                    Get {info.name} Key <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Optional Custom Base URL input if custom or openai */}
              {(!DEFAULT_PROVIDERS[providerKey] || providerKey === 'openai') && (
                <div className="byok-form-group">
                  <label>API Base URL (Endpoint)</label>
                  <input
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    value={baseUrls[providerKey] || ''}
                    onChange={(e) => setBaseUrls(prev => ({ ...prev, [providerKey]: e.target.value }))}
                    className="byok-input-field"
                  />
                </div>
              )}

              {/* Form Input */}
              <div className="byok-form-group">
                <label>API Key</label>
                <div className="byok-input-wrapper">
                  <input
                    type={showKeys[providerKey] ? 'text' : 'password'}
                    placeholder={info.placeholder}
                    value={keyInputs[providerKey] || ''}
                    onChange={(e) => setKeyInputs(prev => ({ ...prev, [providerKey]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowKeys(prev => ({ ...prev, [providerKey]: !prev[providerKey] }))}
                  >
                    {showKeys[providerKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Model Selector */}
              <div className="byok-form-group">
                <label>Target Model</label>
                {info.models && info.models.length > 1 ? (
                  <select
                    value={selectedModels[providerKey] || info.models[0].id}
                    onChange={(e) => setSelectedModels(prev => ({ ...prev, [providerKey]: e.target.value }))}
                    className="byok-model-select"
                  >
                    {info.models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. gpt-4o-mini, llama3, deepseek-r1"
                    value={selectedModels[providerKey] || (info.models && info.models[0] ? info.models[0].id : '')}
                    onChange={(e) => setSelectedModels(prev => ({ ...prev, [providerKey]: e.target.value }))}
                    className="byok-input-field"
                  />
                )}
              </div>

              {/* Feedback Alert */}
              {feedback[providerKey] && (
                <div className={`byok-feedback ${feedback[providerKey].type}`}>
                  {feedback[providerKey].text}
                </div>
              )}

              {/* Actions */}
              <div className="byok-card-actions">
                <button
                  type="button"
                  className="btn-test"
                  disabled={validating[providerKey]}
                  onClick={() => handleTestKey(providerKey)}
                >
                  {validating[providerKey] ? <RefreshCw className="spin-icon" size={14} /> : 'Test Connection'}
                </button>

                <button
                  type="button"
                  className="btn-save"
                  disabled={saving[providerKey]}
                  onClick={() => handleSaveKey(providerKey, info.name)}
                >
                  {saving[providerKey] ? <RefreshCw className="spin-icon" size={14} /> : 'Save & Activate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Provider Modal */}
      {showCustomModal && (
        <div className="byok-modal-overlay">
          <div className="byok-modal-card">
            <div className="byok-modal-header">
              <h3><Plus size={20} /> Add Custom AI Provider / Endpoint</h3>
              <button className="btn-close-modal" onClick={() => setShowCustomModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveCustomModal} className="byok-modal-form">
              <div className="byok-form-group">
                <label>Provider Unique ID (e.g. together, mistral, local_ollama)</label>
                <input
                  type="text"
                  required
                  placeholder="together"
                  value={customForm.provider_id}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, provider_id: e.target.value }))}
                  className="byok-input-field"
                />
              </div>

              <div className="byok-form-group">
                <label>Display Name (e.g. Together AI, Local Ollama)</label>
                <input
                  type="text"
                  placeholder="Together AI"
                  value={customForm.provider_name}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, provider_name: e.target.value }))}
                  className="byok-input-field"
                />
              </div>

              <div className="byok-form-group">
                <label>API Base URL (OpenAI-Compatible Endpoint)</label>
                <input
                  type="text"
                  placeholder="https://api.together.xyz/v1 or http://localhost:11434/v1"
                  value={customForm.api_base_url}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, api_base_url: e.target.value }))}
                  className="byok-input-field"
                />
              </div>

              <div className="byok-form-group">
                <label>API Key</label>
                <input
                  type="password"
                  required
                  placeholder="sk-..."
                  value={customForm.api_key}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, api_key: e.target.value }))}
                  className="byok-input-field"
                />
              </div>

              <div className="byok-form-group">
                <label>Target Model Name</label>
                <input
                  type="text"
                  placeholder="meta-llama/Llama-3-70b-chat-hf"
                  value={customForm.selected_model}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, selected_model: e.target.value }))}
                  className="byok-input-field"
                />
              </div>

              <div className="byok-modal-actions">
                <button type="button" className="btn-test" onClick={() => setShowCustomModal(false)}>Cancel</button>
                <button type="submit" className="btn-save">Save & Connect</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
