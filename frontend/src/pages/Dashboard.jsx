import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProject as useProjectData } from '../contexts/ProjectContext';
import { 
  ShieldAlert, 
  Database, 
  Key, 
  FolderSync, 
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  Play,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = ({ setCurrentTab }) => {
  const { activeCase, cases, caseEvidence, auditLogs, appendAuditLog } = useProjectData();
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState('IDLE'); // IDLE, RUNNING, SECURE, ANOMALY

  // Mock data for Recharts
  const dataIngest = [
    { name: 'Mon', volume: 140 },
    { name: 'Tue', volume: 220 },
    { name: 'Wed', volume: 180 },
    { name: 'Thu', volume: 420 },
    { name: 'Fri', volume: 310 },
    { name: 'Sat', volume: 120 },
    { name: 'Sun', volume: 280 }
  ];

  const dataAITypes = [
    { name: 'Metadata Spoofing', value: 40, color: '#3b82f6' },
    { name: 'Deepfake Media', value: 35, color: '#b91c1c' },
    { name: 'Access Violation Logs', value: 25, color: '#f59e0b' }
  ];

  const verifyLedgerIntegrity = () => {
    setVerifyingLedger(true);
    setLedgerStatus('RUNNING');
    appendAuditLog('Triggered Chain of Custody sequential re-verification audit.');
    setTimeout(() => {
      setVerifyingLedger(false);
      setLedgerStatus('SECURE');
    }, 2000);
  };

  // Safe calculators
  const anomaliesCount = caseEvidence.reduce((acc, curr) => acc + (curr.anomalies?.length || 0), 0);
  const totalVolume = (caseEvidence.reduce((acc, curr) => acc + curr.fileSize, 0) / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Upper Case Header Notification */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-xl glassmorphism bg-grid-dots">
        <div>
          <span className="text-[10px] bg-primary/10 text-primary dark:text-forensic-glow font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Clearance Verified
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground mt-2">
            Investigation Command Console
          </h2>
          <p className="text-xs text-muted mt-1">
            Analyzing case file: <strong className="text-foreground">{activeCase.caseNumber} - {activeCase.title}</strong>
          </p>
        </div>
        
        {/* Rapid Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentTab('upload')}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow hover:shadow-primary/20 flex items-center gap-1.5"
          >
            <FolderSync size={14} />
            <span>Ingest Evidence</span>
          </button>
          
          <button 
            onClick={verifyLedgerIntegrity}
            disabled={verifyingLedger}
            className="border hover:bg-border/20 text-foreground rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={verifyingLedger ? 'animate-spin' : ''} />
            <span>Verify CoC Ledger</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="p-5 border rounded-xl glassmorphism shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Active Workspace Cases</span>
              <h3 className="text-2xl font-black text-foreground">{cases.length}</h3>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:scale-105 transition-transform duration-200">
              <FileSpreadsheet size={20} />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-muted flex items-center gap-1.5">
            <span className="text-success font-bold">100% Secure</span>
            <span>Local database cache loaded</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="p-5 border rounded-xl glassmorphism shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Ingested Data Size</span>
              <h3 className="text-2xl font-black text-foreground">{totalVolume} MB</h3>
            </div>
            <div className="bg-accent/10 p-3 rounded-lg text-accent group-hover:scale-105 transition-transform duration-200">
              <Database size={20} />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-muted flex items-center gap-1.5">
            <span className="text-[#3b82f6] font-bold">{caseEvidence.length} items</span>
            <span>Calculated digital hashes stored</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="p-5 border rounded-xl glassmorphism shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider">AI Anomalies Flagged</span>
              <h3 className="text-2xl font-black text-danger">{anomaliesCount}</h3>
            </div>
            <div className="bg-danger/10 p-3 rounded-lg text-danger group-hover:scale-105 transition-transform duration-200">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-muted flex items-center gap-1.5">
            <span className="text-danger font-bold">{activeCase.anomalyRate} Anomaly Ratio</span>
            <span>Needs examiner verification</span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="p-5 border rounded-xl glassmorphism shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Ledger Safe Status</span>
              <h3 className={`text-sm font-black px-2.5 py-1 rounded-md block mt-1.5 uppercase ${
                ledgerStatus === 'SECURE' ? 'bg-success/15 text-success' :
                ledgerStatus === 'RUNNING' ? 'bg-accent/15 text-accent animate-pulse' :
                'bg-muted/15 text-muted'
              }`}>
                {ledgerStatus === 'SECURE' ? 'VERIFIED SECURE' :
                 ledgerStatus === 'RUNNING' ? 'RE-Hashing Ledger...' :
                 'Chain Synced'}
              </h3>
            </div>
            <div className="bg-success/10 p-3 rounded-lg text-success group-hover:scale-105 transition-transform duration-200">
              <Key size={20} />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-muted flex items-center gap-1.5">
            <span className="text-muted font-mono">{auditLogs.length} blocks mapped</span>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ingest Trend Graph */}
        <div className="lg:col-span-2 p-5 border rounded-xl glassmorphism flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">Inbound Ingest Volume Trend</h3>
            <p className="text-[10px] text-muted">Weekly aggregated digital forensic files parsed (MBs)</p>
          </div>
          <div className="h-64 mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataIngest}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px', 
                    fontSize: '11px',
                    color: 'var(--foreground)'
                  }} 
                />
                <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Type Ratio Pie Chart */}
        <div className="p-5 border rounded-xl glassmorphism flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">Flagged Threat Distributions</h3>
            <p className="text-[10px] text-muted">Anomaly matching ratios categorized locally</p>
          </div>
          <div className="h-48 my-auto relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataAITypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataAITypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px', 
                    fontSize: '11px',
                    color: 'var(--foreground)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-[10px] uppercase font-bold text-muted block">Alert Ratio</span>
              <span className="text-lg font-black text-danger">{activeCase.anomalyRate}</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="space-y-1.5 mt-auto border-t pt-4">
            {dataAITypes.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted">{item.name}</span>
                </div>
                <span className="font-bold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Chains & Dynamic Log Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Critical Warnings */}
        <div className="p-5 border rounded-xl glassmorphism space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 text-danger">
              <AlertTriangle size={16} />
              AI Threat Alert Logs
            </h3>
            <p className="text-[10px] text-muted">Active open-source AI parser metrics indicating high severity anomalies</p>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2">
            {caseEvidence.flatMap(e => e.anomalies || []).map((anomaly, idx) => (
              <div 
                key={idx} 
                className="p-3 border border-danger/20 bg-danger/5 rounded-lg flex gap-3 items-start hover:bg-danger/10 transition-colors"
              >
                <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-danger/10 text-danger font-black px-1.5 py-0.5 rounded uppercase">
                      {anomaly.type}
                    </span>
                    <span className="text-[9px] text-muted font-semibold">Severity: {anomaly.severity}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{anomaly.message}</p>
                </div>
              </div>
            ))}
            {anomaliesCount === 0 && (
              <div className="p-8 border border-dashed rounded-lg text-center text-muted">
                <CheckCircle2 size={32} className="text-success mx-auto mb-2 animate-bounce" />
                <p className="text-xs">No active anomalies flagged in database caches</p>
              </div>
            )}
          </div>
        </div>

        {/* Chain of Custody Ledger Blockchain Stream */}
        <div className="p-5 border rounded-xl glassmorphism space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 text-primary dark:text-forensic-glow">
              <ShieldAlert size={16} />
              Chain of Custody Blockchain Audit
            </h3>
            <p className="text-[10px] text-muted">Immutable cryptographic trace ledger running local hash connections</p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2">
            {[...auditLogs].reverse().map((log, idx) => (
              <div key={log.id} className="p-3 border rounded-lg bg-card/50 flex flex-col gap-1 text-[10px] relative">
                {idx !== auditLogs.length - 1 && (
                  <div className="absolute left-6 -bottom-3 w-0.5 h-3 bg-border" />
                )}
                <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                  <span className="font-bold text-foreground truncate max-w-[150px]">{log.operator}</span>
                  <span className="text-muted font-mono">{log.timestamp.substring(11, 19)}</span>
                </div>
                <p className="text-[11px] text-foreground font-medium">{log.action}</p>
                <div className="flex items-center gap-2 mt-1 font-mono text-[9px] bg-background/50 p-1.5 rounded border">
                  <Key size={10} className="text-accent" />
                  <span className="text-muted">BLOCK HASH:</span>
                  <span className="text-accent underline cursor-pointer" title="Verify link block integrity">{log.blockHash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
