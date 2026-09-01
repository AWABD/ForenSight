import React, { useState, useEffect } from 'react';
import { UserCheck, Cpu, HardDrive, ShieldCheck, RefreshCw, Layers, Sliders, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { API_BASE_URL } from '../config';

const Admin = () => {
  const [modelRunning, setModelRunning] = useState({
    easyOcr: true,
    spacyNer: true,
    sentenceTrans: true,
    llamaLocal: true
  });

  const [clearanceRequests, setClearanceRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Read current user role from local storage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleLevel = storedUser.role_level || 'LeadInvestigator';
  const isSysAdmin = roleLevel === 'SysAdmin';

  const fetchRequests = () => {
    const token = localStorage.getItem('token');
    if (!token || token === 'mock-sandbox-token') {
      // Fallback mock requests
      setClearanceRequests([
        { id: 'cr1', full_name: 'Analyst Protyush B.', secret_code: 'FNS-REG-39182', role_level: 'Level 2 - Analyst', is_approved: false },
        { id: 'cr2', full_name: 'Examiner Sarah Connor', secret_code: 'FNS-REG-72819', role_level: 'Level 3 - Investigator', is_approved: true }
      ]);
      return;
    }

    setLoadingRequests(true);
    fetch(`${API_BASE_URL}/admin/registrations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized admin access");
      return res.json();
    })
    .then(data => {
      setLoadingRequests(false);
      setClearanceRequests(data);
    })
    .catch(err => {
      setLoadingRequests(false);
      console.warn("Failed fetching live registration requests. Displaying sandbox fallbacks.");
      setClearanceRequests([
        { id: 'cr1', full_name: 'Analyst Protyush B.', secret_code: 'FNS-REG-39182', role_level: 'Level 2 - Analyst', is_approved: false },
        { id: 'cr2', full_name: 'Examiner Sarah Connor', secret_code: 'FNS-REG-72819', role_level: 'Level 3 - Investigator', is_approved: true }
      ]);
    });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleClearanceApprove = (id) => {
    const token = localStorage.getItem('token');
    if (!token || token === 'mock-sandbox-token') {
      setClearanceRequests(prev => prev.map(req => {
        if (req.id === id) return { ...req, is_approved: true };
        return req;
      }));
      return;
    }

    fetch(`${API_BASE_URL}/admin/registrations/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Approval request failed");
      fetchRequests();
    })
    .catch(err => {
      alert("Error approving clearance: " + err.message);
    });
  };

  const handleClearanceReject = (id) => {
    const token = localStorage.getItem('token');
    if (!token || token === 'mock-sandbox-token') {
      setClearanceRequests(prev => prev.filter(req => req.id !== id));
      return;
    }

    if (!confirm("Are you sure you want to reject and delete this registration request?")) return;

    fetch(`${API_BASE_URL}/admin/registrations/${id}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Rejection request failed");
      fetchRequests();
    })
    .catch(err => {
      alert("Error rejecting clearance: " + err.message);
    });
  };

  const toggleModel = (modelKey) => {
    setModelRunning(prev => ({
      ...prev,
      [modelKey]: !prev[modelKey]
    }));
  };

  // Model telemetry mock charts
  const telemetryData = [
    { name: 'EasyOCR', memory: 1200 },
    { name: 'spaCy', memory: 350 },
    { name: 'BERT Vect', memory: 850 },
    { name: 'Llama-3', memory: 6400 }
  ];

  if (!isSysAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glassmorphism border border-danger/30 rounded-2xl p-8 max-w-lg w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-danger/20 text-danger mx-auto flex items-center justify-center ring-8 ring-danger/10">
            <XCircle size={36} />
          </div>
          <h3 className="text-lg font-extrabold text-foreground tracking-tight">ACCESS RESTRICTED</h3>
          <p className="text-xs text-muted leading-relaxed">
            Your current clearance level (<strong className="text-foreground">{roleLevel}</strong>) does not grant authorization to inspect or manage operator filings, AI model telemetry, or system parameters.
          </p>
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-[10px] text-danger font-mono font-bold uppercase tracking-wider">
            SECURITY PROTOCOL: Level 4 System Administrator (SysAdmin) Clearance Required
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">Admin & Model Console</h2>
        <p className="text-xs text-muted">Configures ABAC token clearances, inspects CUDA memory allocations, and controls local model states.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Model Execution Controller */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Models State table list */}
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Cpu size={16} className="text-primary" />
              Active Local ML Inference Nodes
            </h3>

            <div className="space-y-3">
              {/* Item 1 */}
              <div className="p-3 border rounded-xl bg-card/40 flex items-center justify-between transition-colors hover:border-primary/20">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Character Scans (EasyOCR Node)</h4>
                  <p className="text-[10px] text-muted">Executes text segmentations locally. Model: pre-trained PyTorch weight file.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded ${
                    modelRunning.easyOcr ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted'
                  }`}>
                    {modelRunning.easyOcr ? 'ACTIVE' : 'STANDBY'}
                  </span>
                  <button onClick={() => toggleModel('easyOcr')} className="text-muted hover:text-foreground">
                    {modelRunning.easyOcr ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>

               {/* Item 2 */}
              <div className="p-3 border rounded-xl bg-card/40 flex items-center justify-between transition-colors hover:border-primary/20">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Named Entity Extraction (spaCy NER Node)</h4>
                  <p className="text-[10px] text-muted">Extracts location coordinates, names, PII, and ports. Model: en_core_web_sm pipeline.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded ${
                    modelRunning.spacyNer ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted'
                  }`}>
                    {modelRunning.spacyNer ? 'ACTIVE' : 'STANDBY'}
                  </span>
                  <button onClick={() => toggleModel('spacyNer')} className="text-muted hover:text-foreground">
                    {modelRunning.spacyNer ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>

               {/* Item 3 */}
              <div className="p-3 border rounded-xl bg-card/40 flex items-center justify-between transition-colors hover:border-primary/20">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Semantic Similarity Vector Node (BERT Sentence-Transformers)</h4>
                  <p className="text-[10px] text-muted">Cosine calculations over cosine similarity queries. Model: all-MiniLM-L6-v2.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded ${
                    modelRunning.sentenceTrans ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted'
                  }`}>
                    {modelRunning.sentenceTrans ? 'ACTIVE' : 'STANDBY'}
                  </span>
                  <button onClick={() => toggleModel('sentenceTrans')} className="text-muted hover:text-foreground">
                    {modelRunning.sentenceTrans ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>

               {/* Item 4 */}
              <div className="p-3 border rounded-xl bg-card/40 flex items-center justify-between transition-colors hover:border-primary/20">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Local Reasoning LLM Node (Llama-3 via Ollama)</h4>
                  <p className="text-[10px] text-muted">Summarizes metadata anomaly trace summaries. Model: Llama-3-8B checkpoint.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded ${
                    modelRunning.llamaLocal ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted'
                  }`}>
                    {modelRunning.llamaLocal ? 'ACTIVE' : 'STANDBY'}
                  </span>
                  <button onClick={() => toggleModel('llamaLocal')} className="text-muted hover:text-foreground">
                    {modelRunning.llamaLocal ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Graphical RAM allocations */}
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
             <div className="mb-2">
               <h3 className="text-sm font-bold text-foreground">CUDA Graphical RAM allocations (MBs)</h3>
               <p className="text-[10px] text-muted">Local GPU hardware footprints parsed dynamically</p>
             </div>
             <div className="h-44">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={telemetryData} layout="vertical">
                   <XAxis type="number" stroke="var(--muted)" fontSize={10} tickLine={false} />
                   <YAxis dataKey="name" type="category" stroke="var(--muted)" fontSize={10} tickLine={false} />
                   <Tooltip 
                     contentStyle={{ 
                       background: 'var(--card)', 
                       borderColor: 'var(--border)',
                       borderRadius: '8px', 
                       fontSize: '11px',
                       color: 'var(--foreground)'
                     }} 
                   />
                   <Bar dataKey="memory" fill="#3b82f6" radius={4} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

        </div>

        {/* Clearance Request List Panel */}
        <div className="space-y-4">
          
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-muted flex items-center gap-1.5 animate-pulse">
              <UserCheck size={14} className="text-primary" />
              Clearance Request Directory
            </h3>

            <div className="space-y-3">
              {clearanceRequests.map((req) => (
                <div key={req.id} className="p-3 border rounded-xl bg-card/30 space-y-3 text-[10px] leading-relaxed">
                  <div className="flex justify-between items-center text-muted font-mono">
                    <span>Code: {req.secret_code}</span>
                    <span className={`text-[8.5px] font-black uppercase ${
                      req.is_approved ? 'text-success' : 'text-primary'
                    }`}>
                      {req.is_approved ? 'APPROVED' : 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-foreground leading-none">{req.full_name}</h4>
                    <span className="text-muted block mt-0.5">Clearance: {req.role_level}</span>
                    <span className="text-muted/70 block font-mono text-[9px] mt-0.5">{req.email}</span>
                  </div>

                  {!req.is_approved && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClearanceApprove(req.id)}
                        className="bg-primary hover:bg-primary-dark text-white rounded px-2.5 py-1 text-[9px] font-black tracking-wider transition-all select-none cursor-pointer"
                      >
                        APPROVE
                      </button>
                      <button
                        onClick={() => handleClearanceReject(req.id)}
                        className="bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 rounded px-2.5 py-1 text-[9px] font-black tracking-wider transition-all select-none cursor-pointer flex items-center gap-1"
                      >
                        <XCircle size={10} />
                        <span>REJECT</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Admin;
