import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Shield, ShieldAlert, Activity, Server, Scan, AlertTriangle,
  RefreshCw, Bug, Lock, Cloud, Eye, Zap, ChevronRight, CheckCircle2, XCircle, Plus
} from 'lucide-react';

const API = '/api';

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */
const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

const CATEGORY_ICONS = {
  IAM: Lock,
  NETWORK: Cloud,
  STORAGE: Server,
  COMPUTE: Zap,
  LOGGING: Eye,
  ENCRYPTION: Shield,
  SECRETS: Bug,
  THREAT: AlertTriangle,
};

function riskColor(score) {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f97316';
  if (score >= 20) return '#eab308';
  return '#22c55e';
}

/* ═══════════════════════════════════════════════════════
   Risk Gauge SVG
   ═══════════════════════════════════════════════════════ */
function RiskGauge({ score }) {
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = riskColor(score);

  return (
    <div className="risk-gauge">
      <div className="risk-gauge__circle">
        <svg className="risk-gauge__svg" width="180" height="180" viewBox="0 0 180 180">
          <circle className="risk-gauge__bg" cx="90" cy="90" r={radius} />
          <circle
            className="risk-gauge__fill"
            cx="90" cy="90" r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="risk-gauge__value">
          <div className="risk-gauge__number" style={{ color }}>{score}</div>
          <div className="risk-gauge__label">Risk Score</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Components
   ═══════════════════════════════════════════════════════ */

function StatCard({ icon, color, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-card__header">
        <div className={`stat-card__icon stat-card__icon--${color}`}>{icon}</div>
        <span className="stat-card__label">{label}</span>
      </div>
      <div className="stat-card__value">{value ?? 0}</div>
    </div>
  );
}

function buildCategoryData(findings) {
  const counts = {};
  findings.forEach(f => {
    counts[f.category] = (counts[f.category] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/* ═══════════════════════════════════════════════════════
   Main App Component
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [view, setView] = useState('loading'); // loading, onboarding, dashboard
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  
  // Onboarding state
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [formData, setFormData] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Initialize
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API}/cloud-accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
          setActiveAccountId(data[0].id);
          setView('dashboard');
        } else {
          setView('onboarding');
        }
      } else {
        setView('onboarding');
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err);
      // Fallback to onboarding if API is down so UI shows something
      setView('onboarding');
    }
  };

  const fetchDashboard = useCallback(async () => {
    if (view !== 'dashboard') return;
    try {
      const res = await fetch(`${API}/dashboard`);
      if (res.ok) {
        setDashboard(await res.json());
        setError(null);
      } else {
          setDashboard(DEMO_DATA);
      }
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
      setDashboard(DEMO_DATA);
    }
  }, [view]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const triggerScan = async () => {
    if (!activeAccountId) return setError("No active cloud account selected.");
    setScanning(true);
    try {
      const res = await fetch(`${API}/scans`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_account_id: activeAccountId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTimeout(fetchDashboard, 2000);
    } catch {
      setError('Could not trigger scan. Is the backend running?');
    } finally {
      setScanning(false);
    }
  };

  // --- Onboarding Handlers ---
  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setFormData({});
    setTestResult(null);
    setOnboardingStep(2);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    let submitData = {
      provider: selectedProvider,
      display_name: `${selectedProvider.toUpperCase()} Account`,
      credentials: {},
      region: formData.region || 'us-east-1'
    };

    if (selectedProvider === 'aws') {
      submitData.credentials = {
        access_key_id: formData.access_key,
        secret_access_key: formData.secret_key
      };
    } else if (selectedProvider === 'azure') {
      submitData.credentials = {
        tenant_id: formData.tenant_id,
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        subscription_id: formData.subscription_id
      };
    } else if (selectedProvider === 'gcp') {
        try {
            submitData.credentials = {
                project_id: formData.project_id,
                service_account_json: JSON.parse(formData.service_account_json)
            };
        } catch (e) {
            setTestResult({ success: false, message: "Invalid JSON for Service Account." });
            setIsTesting(false);
            return;
        }
    }

    try {
      // 1. Create account
      const createRes = await fetch(`${API}/cloud-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      if (!createRes.ok) throw new Error('Failed to save account');
      const account = await createRes.json();

      // 2. Test account connection
      const testRes = await fetch(`${API}/cloud-accounts/${account.id}/test`, {
        method: 'POST'
      });
      
      const testData = await testRes.json();
      setTestResult(testData);

      if (testData.success) {
        setTimeout(() => {
          fetchAccounts();
        }, 1500);
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };


  if (view === 'loading') {
    return <div className="app loading-screen"><span className="spinner" /> Loading...</div>;
  }

  /* ═══════════════════════════════════════════════════════
     Onboarding View
     ═══════════════════════════════════════════════════════ */
  if (view === 'onboarding') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-header">
            <div className="header__logo" style={{fontSize: '3rem', marginBottom: '1rem'}}>🛡️</div>
            <h1>Welcome to CloudGuard</h1>
            <p>Connect your cloud environment to start monitoring your security posture.</p>
        </div>

        <div className="onboarding-card">
            {/* Step Indicators */}
            <div className="steps-indicator">
                <div className={`step ${onboardingStep >= 1 ? 'active' : ''}`}>1. Select Provider</div>
                <div className={`step-line ${onboardingStep >= 2 ? 'active' : ''}`}></div>
                <div className={`step ${onboardingStep >= 2 ? 'active' : ''}`}>2. Credentials</div>
                <div className={`step-line ${testResult ? 'active' : ''}`}></div>
                <div className={`step ${testResult ? 'active' : ''}`}>3. Verify</div>
            </div>

            {/* Step 1: Select Provider */}
            {onboardingStep === 1 && (
                <div className="provider-grid">
                    <button className="provider-card" onClick={() => handleProviderSelect('aws')}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="provider-logo aws" />
                        <span>Amazon Web Services</span>
                    </button>
                    <button className="provider-card" onClick={() => handleProviderSelect('azure')}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg" alt="Azure" className="provider-logo azure" />
                        <span>Microsoft Azure</span>
                    </button>
                    <button className="provider-card" onClick={() => handleProviderSelect('gcp')}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg" alt="GCP" className="provider-logo gcp" />
                        <span>Google Cloud</span>
                    </button>
                </div>
            )}

            {/* Step 2: Credentials */}
            {onboardingStep === 2 && (
                <div className="credentials-form-container">
                    <button className="btn btn--ghost back-btn" onClick={() => setOnboardingStep(1)}>
                         Back
                    </button>
                    <h2 style={{textTransform: 'capitalize', marginBottom: '20px'}}>{selectedProvider} Credentials</h2>
                    
                    <form onSubmit={handleConnect} className="credentials-form">
                        {selectedProvider === 'aws' && (
                            <>
                                <div className="form-group">
                                    <label>Access Key ID</label>
                                    <input required type="text" name="access_key" onChange={handleFormChange} placeholder="AKIAIOSFODNN7EXAMPLE" />
                                </div>
                                <div className="form-group">
                                    <label>Secret Access Key</label>
                                    <input required type="password" name="secret_key" onChange={handleFormChange} placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
                                </div>
                                <div className="form-group">
                                    <label>Region</label>
                                    <input required type="text" name="region" defaultValue="us-east-1" onChange={handleFormChange} />
                                </div>
                            </>
                        )}

                        {selectedProvider === 'azure' && (
                            <>
                                <div className="form-group">
                                    <label>Tenant ID</label>
                                    <input required type="text" name="tenant_id" onChange={handleFormChange} />
                                </div>
                                <div className="form-group">
                                    <label>Client ID</label>
                                    <input required type="text" name="client_id" onChange={handleFormChange} />
                                </div>
                                <div className="form-group">
                                    <label>Client Secret</label>
                                    <input required type="password" name="client_secret" onChange={handleFormChange} />
                                </div>
                                <div className="form-group">
                                    <label>Subscription ID</label>
                                    <input required type="text" name="subscription_id" onChange={handleFormChange} />
                                </div>
                            </>
                        )}

                        {selectedProvider === 'gcp' && (
                            <>
                                <div className="form-group">
                                    <label>Project ID</label>
                                    <input required type="text" name="project_id" onChange={handleFormChange} />
                                </div>
                                <div className="form-group">
                                    <label>Service Account JSON</label>
                                    <textarea required name="service_account_json" rows={6} onChange={handleFormChange} placeholder='{ "type": "service_account", ... }' />
                                </div>
                            </>
                        )}

                        <button disabled={isTesting} type="submit" className="btn btn--primary submit-btn">
                            {isTesting ? <span className="spinner" /> : <Shield size={16} />}
                            {isTesting ? 'Verifying Connection...' : 'Connect & Verify'}
                        </button>
                    </form>

                    {testResult && (
                        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                            {testResult.success ? <CheckCircle2 /> : <XCircle />}
                            <span>{testResult.message}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Skip Option for demo mode */}
            {onboardingStep === 1 && (
                <div style={{textAlign: 'center', marginTop: '30px'}}>
                   <button className="btn btn--ghost" onClick={() => setView('dashboard')}>
                     Skip & View Demo Dashboard <ChevronRight size={14}/>
                   </button>
                </div>
            )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Dashboard View
     ═══════════════════════════════════════════════════════ */
  const data = dashboard || DEMO_DATA;
  const activeAccount = accounts.find(a => a.id === activeAccountId);

  const severityPieData = [
    { name: 'Critical', value: data.critical_count, color: SEVERITY_COLORS.CRITICAL },
    { name: 'High', value: data.high_count, color: SEVERITY_COLORS.HIGH },
    { name: 'Medium', value: data.medium_count, color: SEVERITY_COLORS.MEDIUM },
    { name: 'Low', value: data.low_count, color: SEVERITY_COLORS.LOW },
  ].filter(d => d.value > 0);

  const categoryData = buildCategoryData(data.recent_findings || []);

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="header">
        <div className="header__brand">
          <div className="header__logo">🛡️</div>
          <div>
            <div className="header__title">CloudGuard</div>
            <div className="header__subtitle">Cloud Security Posture Management</div>
          </div>
        </div>
        
        <div className="header__actions">
          {/* Active Account Badge */}
          {activeAccount && (
             <div className={`provider-badge provider-badge--${activeAccount.provider}`}>
                <Cloud size={14} />
                <span>{activeAccount.provider.toUpperCase()}</span>
                {activeAccount.is_verified && <CheckCircle2 size={12} style={{marginLeft: '4px', color:'var(--success)'}}/>}
             </div>
          )}

          <div className="header__status">
            <span className="header__status-dot" />
            Monitoring Active
          </div>
          
          <button className="btn btn--ghost" onClick={() => setView('onboarding')}>
            <Plus size={14} /> Add Cloud
          </button>
          
          <button className="btn btn--ghost" onClick={fetchDashboard}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn--primary" onClick={triggerScan} disabled={scanning}>
            {scanning ? <span className="spinner" /> : <Scan size={14} />}
            {scanning ? 'Scanning…' : 'New Scan'}
          </button>
        </div>
      </header>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          color: '#ef4444',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard icon={<ShieldAlert size={18} />} color="cyan" label="Risk Score" value={data.latest_risk_score} />
        <StatCard icon={<Activity size={18} />} color="blue" label="Total Findings" value={data.total_findings} />
        <StatCard icon={<Server size={18} />} color="purple" label="Cloud Assets" value={data.total_assets} />
        <StatCard icon={<Scan size={18} />} color="green" label="Total Scans" value={data.total_scans} />
        <StatCard icon={<AlertTriangle size={18} />} color="red" label="Critical" value={data.critical_count} />
        <StatCard icon={<ShieldAlert size={18} />} color="orange" label="High" value={data.high_count} />
        <StatCard icon={<Shield size={18} />} color="yellow" label="Medium" value={data.medium_count} />
        <StatCard icon={<Shield size={18} />} color="green" label="Low" value={data.low_count} />
      </div>

      {/* ── Charts ──────────────────────────────────────── */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-card__title">Risk Score</div>
          <RiskGauge score={data.latest_risk_score} />
        </div>
        <div className="chart-card">
          <div className="chart-card__title">Findings by Severity</div>
          {severityPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {severityPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a2236',
                    border: '1px solid #1e3a5f',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">📊</div>
              <div className="empty-state__text">No findings yet</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Category bar chart ──────────────────────────── */}
      {categoryData.length > 0 && (
        <div className="chart-card" style={{ marginBottom: '32px' }}>
          <div className="chart-card__title">Findings by Category</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1a2236',
                  border: '1px solid #1e3a5f',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={['#22d3ee', '#3b82f6', '#a855f7', '#f97316', '#eab308', '#22c55e', '#ef4444', '#ec4899'][i % 8]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Findings Table ──────────────────────────────── */}
      <div className="findings-section">
        <div className="findings-section__header">
          <div className="findings-section__title">Recent Security Findings</div>
          <div className="findings-section__count">{(data.recent_findings || []).length} shown</div>
        </div>
        {(data.recent_findings || []).length > 0 ? (
          <table className="findings-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Title</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_findings || []).map((f, i) => {
                const Icon = CATEGORY_ICONS[f.category] || Shield;
                return (
                  <tr key={f.id || i}>
                    <td>
                      <span className={`severity-badge severity-badge--${f.severity}`}>
                        ● {f.severity}
                      </span>
                    </td>
                    <td>
                      <span className="category-tag">
                        <Icon size={11} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                        {f.category}
                      </span>
                    </td>
                    <td style={{ maxWidth: '400px' }}>{f.title}</td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.resource_arn || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">🔍</div>
            <div className="empty-state__text">No findings yet — trigger a scan to start</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Demo / Fallback Data
   ═══════════════════════════════════════════════════════ */
const DEMO_DATA = {
  total_scans: 3,
  latest_risk_score: 67.4,
  total_findings: 24,
  critical_count: 4,
  high_count: 8,
  medium_count: 7,
  low_count: 5,
  total_assets: 42,
  recent_findings: [
    { id: '1', severity: 'CRITICAL', category: 'IAM', title: 'MFA disabled for user admin@company.com', resource_arn: 'arn:aws:iam::123456:user/admin', description: '', recommendation: '' },
    { id: '2', severity: 'CRITICAL', category: 'NETWORK', title: 'Security group sg-0abc allows all traffic from 0.0.0.0/0', resource_arn: 'arn:aws:ec2:::security-group/sg-0abc', description: '', recommendation: '' },
    { id: '3', severity: 'CRITICAL', category: 'STORAGE', title: 'S3 bucket prod-data-lake has public ACL grant', resource_arn: 'arn:aws:s3:::prod-data-lake', description: '', recommendation: '' },
    { id: '4', severity: 'CRITICAL', category: 'ENCRYPTION', title: 'RDS instance prod-db is not encrypted', resource_arn: 'arn:aws:rds:::db/prod-db', description: '', recommendation: '' },
    { id: '5', severity: 'HIGH', category: 'IAM', title: 'User deploy-bot has AdministratorAccess policy', resource_arn: 'arn:aws:iam::123456:user/deploy-bot', description: '', recommendation: '' },
    { id: '6', severity: 'HIGH', category: 'NETWORK', title: 'SG web-servers exposes SSH (port 22) to the internet', resource_arn: 'arn:aws:ec2:::security-group/sg-22ssh', description: '', recommendation: '' },
    { id: '7', severity: 'HIGH', category: 'SECRETS', title: 'Access key AKIA… for dev-user is 142 days old', resource_arn: 'arn:aws:iam::123456:user/dev-user', description: '', recommendation: '' },
    { id: '8', severity: 'HIGH', category: 'THREAT', title: 'Privilege escalation attempt: AttachRolePolicy', resource_arn: 'arn:aws:cloudtrail:::event/evt-1234', description: '', recommendation: '' },
    { id: '9', severity: 'MEDIUM', category: 'COMPUTE', title: 'Instance i-0abc123 does not enforce IMDSv2', resource_arn: 'arn:aws:ec2:::instance/i-0abc123', description: '', recommendation: '' },
    { id: '10', severity: 'LOW', category: 'LOGGING', title: 'No CloudWatch alarms configured', resource_arn: 'arn:aws:cloudwatch:::alarm/*', description: '', recommendation: '' },
  ],
};
