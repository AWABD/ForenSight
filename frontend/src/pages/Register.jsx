import React, { useState } from 'react';
import { Fingerprint, Shield, Mail, FileText, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Register = ({ onGoToLogin }) => {
  const { darkMode } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [clearance, setClearance] = useState('Analyst');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [secretCode, setSecretCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    fetch('http://127.0.0.1:8000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        full_name: fullName,
        role_level: clearance,
        password: "analystsecret" // Default registration password for sandbox testing
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Registration failed");
      }
      return res.json();
    })
    .then((data) => {
      setLoading(false);
      setSecretCode(data.secret_code || `FNS-REG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
      setSubmitted(true);
    })
    .catch((err) => {
      console.warn("FastAPI registration offline. Simulating local sandbox registration filing:", err);
      setTimeout(() => {
        setLoading(false);
        setSecretCode(`FNS-REG-${Math.random().toString(36).substring(2, 10).toUpperCase()} (LOCAL)`);
        setSubmitted(true);
      }, 800);
    });
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
        
        {/* Back to Login Button */}
        {!submitted && (
          <button 
            onClick={onGoToLogin} 
            className="absolute top-6 left-6 text-xs text-muted hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Go Back</span>
          </button>
        )}

        <div className="flex justify-center mb-6 pt-4">
          <div className="bg-primary/20 text-primary dark:text-forensic-glow p-4 rounded-full ring-8 ring-primary/5">
            <Shield size={48} className="animate-pulse" />
          </div>
        </div>

        {submitted ? (
          <div className="text-center space-y-4 py-6">
            <div className="flex justify-center text-success">
              <CheckCircle2 size={56} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Clearance Request Filed</h2>
            <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
              Your request for clearance has been submitted to the database administrator trace directory.
            </p>
            
            {/* Secret code card display */}
            <div className="bg-forensic-slate/40 dark:bg-forensic-slate/80 border rounded-xl p-4 my-4 max-w-xs mx-auto space-y-2 text-center shadow-inner border-border">
              <span className="text-[10px] text-muted font-bold tracking-wider block uppercase">Registration Check Secret Code</span>
              <span className="text-sm font-mono font-bold tracking-widest text-primary block">{secretCode}</span>
              <span className="text-[9px] text-muted/80 block leading-tight">
                Save this code. You must present this to verify your name, email, clearance level, and approve status before your ID is fully generated.
              </span>
            </div>

            <button
              onClick={onGoToLogin}
              className="mt-6 bg-primary hover:bg-primary-dark text-white rounded-lg px-6 py-2.5 text-xs font-bold transition-all shadow-lg hover:shadow-primary/30"
            >
              Return to Login Portal
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">CLEARANCE REGISTRATION</h2>
              <p className="text-xs text-muted mt-2">Request platform access tokens under forensic verification rules</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  Officer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Inspector Protyush B."
                  className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-foreground placeholder-muted/55 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {/* Agency Mail */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5 flex items-center gap-1">
                  <Mail size={12} className="text-primary" />
                  Gov/Agency Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator.pro@agency.gov"
                  className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-foreground placeholder-muted/55 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
                />
              </div>

              {/* Agency Badge / ID */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  Official Badge / Federal ID Reference
                </label>
                <input
                  type="text"
                  required
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                  placeholder="BADGE-IND-83818"
                  className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-foreground placeholder-muted/55 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
                />
              </div>

              {/* Requested Clearance Level */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  Clearance Level Requested
                </label>
                <select
                  value={clearance}
                  onChange={(e) => setClearance(e.target.value)}
                  className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-semibold"
                >
                  <option value="LeadInvestigator">Level 3 - Lead Forensic Examiner</option>
                  <option value="Analyst">Level 2 - Forensic Analyst</option>
                  <option value="LegalAuditor">Level 1 - Legal Auditor / Observer</option>
                </select>
              </div>

              {/* Justification Text area */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5 flex items-center gap-1">
                  <FileText size={12} className="text-accent" />
                  Investigative Access Justification
                </label>
                <textarea
                  required
                  rows="3"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="State Case details or oversight logs referencing why access credential keys are demanded."
                  className="w-full bg-background border rounded-lg px-4 py-2.5 text-xs text-foreground placeholder-muted/55 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white rounded-lg py-2.5 text-xs font-bold transition-all shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-55"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>FILING ACCESS CLAIM...</span>
                  </>
                ) : (
                  <span>REQUEST FORENSIC ASSIGNMENT</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
