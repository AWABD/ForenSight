import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Briefcase, FolderPlus, Clock, Target, Plus, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

const Cases = () => {
  const { cases, addCase, selectedCaseId, setSelectedCaseId } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [refNum, setRefNum] = useState('');
  const [assigned, setAssigned] = useState('Lead Investigator Dr. A. Sharma');

  const handleCreate = (e) => {
    e.preventDefault();
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

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Case Management Archive</h2>
          <p className="text-xs text-muted">Create workspaces and assign digital forensics investigators</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-xs font-bold transition-all shadow hover:shadow-primary/20 flex items-center gap-1.5 self-start"
        >
          <FolderPlus size={14} />
          <span>New Case Cabinet</span>
        </button>
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
                <span className="text-[10px] font-mono text-muted tracking-wider bg-background border roundedpx-2.5 py-1 font-bold">
                  {c.caseNumber}
                </span>
                
                <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase ${
                  c.status === 'ACTIVE' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                }`}>
                  {c.status}
                </span>
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
                  <span className="text-[9px] text-muted block uppercase font-bold">Clearance</span>
                  <span className="text-xs font-extrabold text-primary">Lvl 3</span>
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

      {/* Model Creation Sheet */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg glassmorphism rounded-2xl border shadow-2xl p-6 relative overflow-hidden">
            <h3 className="text-lg font-bold text-foreground mb-4">Initialize Forensight Workspace</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Case Folder Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Identity Intrusion Investigation"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs bg-background border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Evidentiary Overview</label>
                <textarea 
                  required
                  rows="3"
                  placeholder="Describe sources, targets, computers, servers to inspect."
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-background border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Case Authority/Reference Code</label>
                <input 
                  type="text" 
                  placeholder="REF-99381-IN (optional)"
                  value={refNum} 
                  onChange={(e) => setRefNum(e.target.value)}
                  className="w-full text-xs bg-background border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="border border-border/40 hover:bg-border/20 text-foreground text-xs font-bold rounded-lg px-4 py-2 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg px-6 py-2 transition-all shadow-md hover:shadow-primary/20"
                >
                  Create Case Cabinet
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
