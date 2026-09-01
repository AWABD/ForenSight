import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Briefcase, FolderPlus, Trash2, Shield, Lock, AlertCircle, ShieldAlert } from 'lucide-react';

const Cases = () => {
  const { cases, addCase, selectedCaseId, setSelectedCaseId } = useProject();
  const [showModal, setShowModal] = useState(false);
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
          <p className="text-xs text-muted">Create workspaces and assign digital forensics investigators</p>
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
          return (
            <div 
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className={`border p-6 rounded-2xl glassmorphism flex flex-col space-y-4 hover:shadow-lg transition-all duration-300 cursor-pointer relative group ${
                isSelected ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/50'
              }`}
            >
              {/* Hot status badges */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted tracking-wider bg-background border rounded px-2.5 py-1 font-bold">
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
                <h3 className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                  {c.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                  {c.description}
                </p>
              </div>

              {/* Bottom statistics panel */}
              <div className="border-t pt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] text-muted block uppercase font-bold">Files</span>
                  <span className="text-xs font-extrabold text-foreground">{c.evidenceCount} Items</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted block uppercase font-bold">Anomaly Rate</span>
                  <span className="text-xs font-extrabold text-danger">{c.anomalyRate}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted block uppercase font-bold">Access Level</span>
                  <span className="text-xs font-extrabold text-primary">Lvl {roleLevel === 'SysAdmin' ? 4 : roleLevel === 'LeadInvestigator' ? 3 : roleLevel === 'Analyst' ? 2 : 1}</span>
                </div>
              </div>

              {/* Assigned Investigator details */}
              <div className="bg-border/20 border rounded-lg p-2.5 flex items-center justify-between text-[10px]">
                <span className="text-muted truncate">Assigned: {c.assignedTo}</span>
              </div>
            </div>
          );
        })}
      </div>

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
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">Description</label>
                <textarea 
                  required 
                  rows="3"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide case overview details..."
                  className="w-full bg-background border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg shadow hover:bg-primary-dark"
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
