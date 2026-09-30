import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { 
  Briefcase, FolderPlus, Trash2, Shield, Lock, AlertCircle, 
  ShieldAlert, Eye, FolderOpen, FolderSync, FileText, X, HardDrive, CheckCircle2, AlertTriangle
} from 'lucide-react';

const Cases = ({ setCurrentTab }) => {
  const { cases, addCase, selectedCaseId, setSelectedCaseId, evidence, timeline } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [detailModalCase, setDetailModalCase] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [refNum, setRefNum] = useState('');
  const [assigned, setAssigned] = useState('Lead Investigator Sharma');

  // Read current user role from local storage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleLevel = storedUser.role_level || 'LeadInvestigator';

  const isSysAdmin = roleLevel === 'SysAdmin'; // Level 4
  const canCreateCase = roleLevel === 'SysAdmin' || roleLevel === 'LeadInvestigator'; // Level 3+
  const isAuditor = roleLevel === 'LegalAuditor'; // Level 1

  const handleCreate = (e) => {
    e.preventDefault();
    if (!canCreateCase) {
      alert("Access Denied: Level 3 (Lead Investigator) clearance required to create cases.");
      return;
    }
    if (!title || !description) return;
    
    addCase({
      title,
      description,
      referenceNumber: refNum,
      assignedTo: assigned
    });

    setTitle('');
    setDescription('');
    setRefNum('');
    setShowModal(false);
  };

  const handleDelete = (caseId, caseNumber, e) => {
    e.stopPropagation();
    if (!isSysAdmin) {
      alert(`Access Restricted: Deleting Case ${caseNumber} requires Level 4 SysAdmin clearance.`);
      return;
    }
    if (window.confirm(`Are you sure you want to permanently purge Case ${caseNumber}? This action cannot be undone.`)) {
      alert(`Case ${caseNumber} purged from system catalog by Level 4 SysAdmin.`);
    }
  };

  const openCaseDetails = (c) => {
    setSelectedCaseId(c.id);
    setDetailModalCase(c);
  };

  return (
    <div className="space-y-6">
      {/* Role Clearance Banner Notice */}
      {isAuditor && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-xl flex items-center justify-between text-xs text-success font-semibold">
          <div className="flex items-center gap-2">
            <Shield size={16} />
            <span>LEGAL AUDITOR OVERSIGHT MODE: Viewing case evidence and chain of custody logs. Creation and deletion rights are restricted.</span>
          </div>
          <span className="bg-success/20 px-2 py-0.5 rounded text-[10px] font-bold">LEVEL 1 READ-ONLY</span>
        </div>
      )}

      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Case Management Archive</h2>
          <p className="text-xs text-muted">Click any case cabinet card to view full uploaded evidence files and investigation details</p>
        </div>
        
        {canCreateCase ? (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-xs font-bold transition-all shadow hover:shadow-primary/20 flex items-center gap-1.5 self-start"
          >
            <FolderPlus size={14} />
            <span>New Case Cabinet</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-border/20 border border-border rounded-lg text-xs text-muted font-bold cursor-not-allowed">
            <Lock size={14} />
            <span>Create Case (Level 3+ Clearance Required)</span>
          </div>
        )}
      </div>

      {/* Case list grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.map((c) => {
          const isSelected = c.id === selectedCaseId;
          const caseEvList = evidence[c.id] || [];

          return (
            <div 
              key={c.id}
              onClick={() => openCaseDetails(c)}
              className={`border p-6 rounded-2xl glassmorphism flex flex-col space-y-4 hover:shadow-xl transition-all duration-300 cursor-pointer relative group ${
                isSelected ? 'ring-2 ring-primary border-transparent bg-primary/5' : 'hover:border-primary/50'
              }`}
            >
              {/* Hot status badges */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted tracking-wider bg-background border rounded px-2.5 py-1 font-bold flex items-center gap-1">
                  <Briefcase size={12} className="text-primary" />
                  {c.caseNumber}
                </span>
                
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase ${
                    c.status === 'ACTIVE' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                  }`}>
                    {c.status}
                  </span>

                  {/* Level 4 Delete Case Button */}
                  {isSysAdmin && (
                    <button
                      onClick={(e) => handleDelete(c.id, c.caseNumber, e)}
                      className="p-1 text-muted hover:text-danger rounded hover:bg-danger/10 transition-colors"
                      title="Purge Case (Level 4 SysAdmin)"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Title descriptions */}
              <div className="space-y-2 flex-grow">
                <h3 className="text-sm font-black text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>{c.title}</span>
                  <Eye size={14} className="text-muted group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                </h3>
                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                  {c.description}
                </p>
              </div>

              {/* Ingested evidence items preview bar */}
              <div className="bg-background/40 border rounded-lg p-2.5 text-[10px] space-y-1">
                <span className="text-[9px] font-bold text-muted uppercase block">Uploaded Evidence Overview ({caseEvList.length} files)</span>
                {caseEvList.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {caseEvList.slice(0, 3).map((f, idx) => (
                      <span key={idx} className="bg-border/30 px-2 py-0.5 rounded font-mono text-foreground font-semibold truncate max-w-[120px]">
                        {f.fileName}
                      </span>
                    ))}
                    {caseEvList.length > 3 && (
                      <span className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">+{caseEvList.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted italic">No evidence files ingested yet.</span>
                )}
              </div>

              {/* Bottom statistics panel */}
              <div className="border-t pt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] text-muted block uppercase font-bold">Files</span>
                  <span className="text-xs font-extrabold text-foreground">{caseEvList.length} Items</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted block uppercase font-bold">Anomaly Rate</span>
                  <span className="text-xs font-extrabold text-danger">{c.anomalyRate || '0%'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted block uppercase font-bold">Ref No.</span>
                  <span className="text-xs font-mono font-bold text-primary truncate block">{c.referenceNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Assigned Investigator details */}
              <div className="bg-border/20 border rounded-lg p-2.5 flex items-center justify-between text-[10px]">
                <span className="text-muted truncate">Assigned: {c.assignedTo}</span>
                <span className="text-primary font-bold group-hover:underline">Click to Inspect &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Case Inspection Detail Modal */}
      {detailModalCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border glassmorphism rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-scale-up border-border">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                    {detailModalCase.caseNumber}
                  </span>
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase ${
                    detailModalCase.status === 'ACTIVE' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                  }`}>
                    {detailModalCase.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-foreground mt-2">{detailModalCase.title}</h3>
                <p className="text-xs text-muted font-mono mt-0.5">Reference: {detailModalCase.referenceNumber} | Created: {new Date(detailModalCase.createdAt).toLocaleDateString()}</p>
              </div>

              <button 
                onClick={() => setDetailModalCase(null)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-border/30 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Case Overview Description */}
            <div className="space-y-1.5 bg-background/50 p-4 rounded-xl border border-border/20">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Case Description & Objective</span>
              <p className="text-xs text-foreground leading-relaxed italic">{detailModalCase.description}</p>
            </div>

            {/* Ingested Evidence Details Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <HardDrive size={14} />
                  Ingested Evidence Items & SHA-256 Hashes ({evidence[detailModalCase.id]?.length || 0})
                </h4>
                {setCurrentTab && (
                  <button
                    onClick={() => { setDetailModalCase(null); setCurrentTab('upload'); }}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <FolderSync size={12} />
                    <span>+ Ingest New File</span>
                  </button>
                )}
              </div>

              {evidence[detailModalCase.id] && evidence[detailModalCase.id].length > 0 ? (
                <div className="border rounded-xl overflow-hidden text-xs bg-background/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-border/30 text-muted uppercase text-[9px] border-b font-bold">
                        <th className="p-3">File Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Size</th>
                        <th className="p-3">SHA-256 Hash</th>
                        <th className="p-3">Anomalies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidence[detailModalCase.id].map((f) => (
                        <tr key={f.id} className="border-b last:border-none hover:bg-border/10 transition-colors text-[11px]">
                          <td className="p-3 font-bold text-foreground font-mono">{f.fileName}</td>
                          <td className="p-3 text-muted">{f.fileType}</td>
                          <td className="p-3 font-mono text-muted">{(f.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                          <td className="p-3 font-mono text-[9.5px] text-muted select-all break-all">{f.sha256}</td>
                          <td className="p-3">
                            {f.anomalies && f.anomalies.length > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-danger/20 text-danger font-bold text-[9px] flex items-center gap-1 w-fit">
                                <AlertTriangle size={10} />
                                <span>{f.anomalies.length} Flagged</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-success/20 text-success font-bold text-[9px] flex items-center gap-1 w-fit">
                                <CheckCircle2 size={10} />
                                <span>Clean</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 border border-dashed rounded-xl text-center text-xs text-muted space-y-2">
                  <p>No evidence files uploaded to this case cabinet yet.</p>
                </div>
              )}
            </div>

            {/* Investigation Timeline Log */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileText size={14} />
                Chronological Investigation Events ({timeline[detailModalCase.id]?.length || 0})
              </h4>
              {timeline[detailModalCase.id] && timeline[detailModalCase.id].length > 0 ? (
                <div className="space-y-2">
                  {timeline[detailModalCase.id].map((ev) => (
                    <div key={ev.id} className="p-3 border rounded-lg bg-background/30 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                        <span>{ev.timestamp.replace('T', ' ').substring(0, 19)} UTC</span>
                        <span className={`font-bold uppercase px-1.5 py-0.5 rounded ${
                          ev.severity === 'CRITICAL' ? 'bg-danger/20 text-danger' :
                          ev.severity === 'HIGH' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'
                        }`}>
                          {ev.severity}
                        </span>
                      </div>
                      <p className="text-foreground font-medium">{ev.description}</p>
                      <span className="text-[9px] font-mono text-muted">Source: {ev.source}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic">No timeline events recorded.</p>
              )}
            </div>

            {/* Modal Footer Quick Actions */}
            <div className="border-t pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted font-mono">
                Assigned Examiner: <strong className="text-foreground">{detailModalCase.assignedTo}</strong>
              </div>

              <div className="flex items-center gap-2">
                {setCurrentTab && (
                  <>
                    <button
                      onClick={() => { setDetailModalCase(null); setCurrentTab('viewer'); }}
                      className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      <span>Inspect in Evidence Viewer</span>
                    </button>

                    <button
                      onClick={() => { setDetailModalCase(null); setCurrentTab('report'); }}
                      className="border hover:bg-border/20 text-foreground rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <FileText size={14} />
                      <span>Generate Judicial Brief</span>
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setDetailModalCase(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-muted hover:text-foreground hover:bg-border/20 transition-all"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal for Creating New Case */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border glassmorphism rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <h3 className="text-lg font-bold text-foreground">Create New Case Cabinet</h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">Case Title</label>
                <input 
                  type="text" 
                  required 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Operation Deep Storage Audit"
                  className="w-full bg-background border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">Reference Number</label>
                <input 
                  type="text" 
                  value={refNum} 
                  onChange={(e) => setRefNum(e.target.value)}
                  placeholder="e.g. REF-99281-IND"
                  className="w-full bg-background border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">Investigation Description</label>
                <textarea 
                  rows="3" 
                  required 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe case parameters, targets, and evidence requirements."
                  className="w-full bg-background border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-muted hover:bg-border/20 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow hover:shadow-primary/20"
                >
                  Create Cabinet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cases;
