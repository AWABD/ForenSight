import React, { useState } from 'react';
import { Fingerprint, Shield, Key, Eye, EyeOff, Loader2, ArrowLeft, Search, ShieldCheck, ShieldAlert, Copy, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Login = ({ onLoginSuccess, onGoToRegister }) => {
  const { darkMode } = useTheme();
  
  // Login form state
  const [username, setUsername] = useState('admin_root');
  const [password, setPassword] = useState('sysadminsecret');
  const [clearance, setClearance] = useState('SysAdmin');
  const [showPassword, setShowPassword] = useState(false);
  
  // App state controls
  const [viewMode, setViewMode] = useState('login'); // 'login' or 'status'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Status check state
  const [statusCheckCode, setStatusCheckCode] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [copiedField, setCopiedField] = useState(null); // 'user' or 'pass'

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username, 
        password,
        selected_role: clearance
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        let errorMsg = "Incorrect username or password";
        try {
          const errData = await res.json();
          errorMsg = errData.detail || errorMsg;
        } catch (e) {}
        const err = new Error(errorMsg);
        err.status = res.status;
        throw err;
      }
      return res.json();
    })
    .then((data) => {
      setLoading(false);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess();
    })
    .catch((err) => {
      setLoading(false);
      if (err.status === 401 || err.status === 403) {
        // Real validation error from database auth
        setErrorMessage(err.message);
      } else {
        // Connection failure - fall back to offline sandbox mode
        console.warn("FastAPI backend offline. Logging in via Local Sandbox Mode:", err);
        localStorage.setItem('token', 'mock-sandbox-token');
        localStorage.setItem('user', JSON.stringify({ username, full_name: "System Administrator Root (Sandbox)", role_level: clearance }));
        onLoginSuccess();
      }
    });
  };

  const handleCheckStatus = (e) => {
    e.preventDefault();
    if (!statusCheckCode.trim()) return;

    setLoading(true);
    setErrorMessage('');
    setStatusData(null);

    fetch(`http://127.0.0.1:8000/api/v1/auth/registration-status/${statusCheckCode.trim()}`, {
      method: 'GET'
    })
    .then(async (res) => {
      if (!res.ok) {
        let errorMsg = "Invalid registration check code.";
        try {
          const errData = await res.json();
          errorMsg = errData.detail || errorMsg;
        } catch (e) {}
        const err = new Error(errorMsg);
        err.status = res.status;
        throw err;
      }
      return res.json();
    })
    .then((data) => {
      setLoading(false);
      setStatusData(data);
    })
    .catch((err) => {
      setLoading(false);
      if (err.status === 404) {
        setErrorMessage(err.message);
      } else {
        // Simulate local check status for testing convenience
        console.warn("Backend offline. Simulating check status...");
        setTimeout(() => {
          setStatusData({
            full_name: "System Administrator Root",
            email: "admin_root@agency.gov",
            role_level: "SysAdmin",
            is_approved: true,
            secret_code: statusCheckCode,
            user_id: "c270ac76-a880-4f3b-a975-14f002fd9c06",
            username: "admin_root",
            generated_passphrase: "sysadminsecret"
          });
        }, 600);
      }
    });
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className={`min-h-screen bg-grid-dots flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? 'bg-forensic-navy' : 'bg-slate-50'}`}>
      {/* Decorative Aurora Glows in Dark Mode */}
      {darkMode && (
        <>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      <div className="w-full max-w-lg glassmorphism rounded-2xl border shadow-2xl p-6 relative overflow-hidden transition-all duration-300 neon-glow-primary">
        
        {viewMode === 'status' && (
          <button 
            onClick={() => { setViewMode('login'); setStatusData(null); setErrorMessage(''); }}
            className="absolute top-6 left-6 text-xs text-muted hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
        )}

        {/* Shield Security Banner Badge */}
        <div className="flex justify-center mb-6 pt-4">
          <div className="bg-danger/20 text-danger p-4 rounded-full ring-8 ring-danger/10 transition-transform duration-300 hover:scale-105">
            <Fingerprint size={48} className="animate-pulse" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">ForenSight SECURE PORTAL</h2>
          <p className="text-xs text-muted mt-2">AI-Powered Evidentiary Ingestion & Master Administrative Console</p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger font-medium mb-6 text-center animate-shake">
            {errorMessage}
          </div>
        )}

        {viewMode === 'login' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Clearance Level Selection */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5 flex items-center gap-1.5">
                <Shield size={12} className="text-danger" />
                Required Security Clearance Level
              </label>
              <select
                value={clearance}
                onChange={(e) => setClearance(e.target.value)}
                className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-danger font-extrabold focus:outline-none focus:ring-1 focus:ring-danger focus:border-danger transition-all font-semibold"
              >
                <option value="SysAdmin">Level 4 - System Administrator (SysAdmin)</option>
              </select>
              <span className="text-[9px] text-danger/80 font-bold block mt-1">
                🔒 System Mode: Administrator Portal Enabled
              </span>
            </div>

            {/* Operator Username */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Operator Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. investigator_sharma"
                className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-foreground placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
              />
            </div>

            {/* Passphrase */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Forensic Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passphrase"
                  className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-foreground placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono pl-4 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Legal Warning Notice */}
            <div className="p-3 bg-danger/5 border border-danger/20 rounded-md text-[10px] text-danger/80 leading-relaxed">
              <strong>ATTENTION:</strong> Unauthorized system login attempts are monitored and recorded under forensic trace log networks. Access is limited to officially sanctioned case investigators only.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white rounded-lg py-2.5 text-xs font-bold transition-all shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>VERIFYING CHAIN CREDENTIALS...</span>
                </>
              ) : (
                <span>STABILITY HANDSHAKE & ENTER</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCheckStatus} className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-sm font-bold text-foreground">CHECK CLEARANCE REGISTRATION STATUS</h3>
              <p className="text-[10px] text-muted mt-1">Input the secret verification code issued during clearance request filing.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Registration Verification Secret Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={statusCheckCode}
                  onChange={(e) => setStatusCheckCode(e.target.value)}
                  placeholder="FNS-REG-XXXXXXXX"
                  className="w-full bg-background border rounded-lg pl-4 pr-10 py-2.5 text-xs text-foreground placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono text-primary font-bold tracking-wider"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                </button>
              </div>
            </div>

            {/* Status Information Box */}
            {statusData && (
              <div className="bg-forensic-slate/40 border border-border rounded-xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-[10px] text-muted font-bold tracking-wider uppercase">Verification Details</span>
                  <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                    statusData.is_approved 
                      ? 'bg-success/20 text-success' 
                      : 'bg-warning/20 text-warning'
                  }`}>
                    {statusData.is_approved ? (
                      <>
                        <ShieldCheck size={12} />
                        <span>APPROVED & ACTIVE</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={12} />
                        <span>PENDING SYSADMIN</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] text-muted font-bold uppercase block">Operator Name</span>
                    <span className="font-semibold text-foreground">{statusData.full_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted font-bold uppercase block">Requested Clearance</span>
                    <span className="font-semibold text-foreground">{statusData.role_level}</span>
                  </div>
                </div>

                {statusData.is_approved ? (
                  <div className="border-t pt-3 mt-1 space-y-2.5">
                    <span className="text-[10px] text-success font-bold uppercase tracking-wider block">Generated Credentials:</span>
                    
                    <div className="space-y-2 bg-card/60 rounded-lg p-2.5 border text-xs">
                      {/* Generated Username */}
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[8px] font-bold text-muted block uppercase">ASSIGNED USERNAME</span>
                          <span className="font-mono text-foreground font-semibold">{statusData.username}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard(statusData.username, 'user')}
                          className="text-muted hover:text-foreground transition-colors p-1"
                        >
                          {copiedField === 'user' ? <span className="text-[9px] text-success font-bold">Copied!</span> : <Copy size={14} />}
                        </button>
                      </div>

                      {/* Generated Passphrase */}
                      <div className="flex justify-between items-center border-t pt-2">
                        <div>
                          <span className="text-[8px] font-bold text-muted block uppercase">FORENSIC PASSPHRASE</span>
                          <span className="font-mono text-foreground font-semibold text-primary">{statusData.generated_passphrase}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard(statusData.generated_passphrase, 'pass')}
                          className="text-muted hover:text-foreground transition-colors p-1"
                        >
                          {copiedField === 'pass' ? <span className="text-[9px] text-success font-bold">Copied!</span> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="p-2 bg-success/5 border border-success/20 rounded-md text-[9px] text-success/90 leading-tight">
                      <strong>Handshake Complete:</strong> Copy these credentials and select your role clearance level to enter the secure workbench.
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-warning/5 border border-warning/20 rounded-md text-[10px] text-warning/90 leading-relaxed">
                    <strong>Pending Review:</strong> The system administrator is verifying your agency credentials. Your Username and Forensic Passphrase will be generated upon approval.
                  </div>
                )}
              </div>
            )}
          </form>
        )}

        <div className="mt-6 text-center border-t pt-4 flex flex-col gap-2">
          {viewMode === 'login' && (
            <p className="text-xs text-muted">
              Operator registration filed?{' '}
              <button 
                onClick={() => { setViewMode('status'); setErrorMessage(''); setStatusData(null); }} 
                className="text-primary hover:underline font-bold"
              >
                Check Request Status
              </button>
            </p>
          )}
          <p className="text-xs text-muted">
            New operator requesting system clearance?{' '}
            <button onClick={onGoToRegister} className="text-primary hover:underline font-bold">
              Submit Clearance Request
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
