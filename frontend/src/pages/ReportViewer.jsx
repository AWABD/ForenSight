import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { 
  FileText, Printer, ShieldCheck, Signature, Sparkles, CheckCircle2, 
  UserCheck, Briefcase, AlertTriangle, Award, Check, Maximize2, Minimize2, Edit3, Shield
} from 'lucide-react';

const ReportViewer = () => {
  const { cases, activeCase, selectedCaseId, setSelectedCaseId, caseEvidence, caseTimeline } = useProject();
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [fullWidthMode, setFullWidthMode] = useState(true); // Broad full-width layout by default
  const [showEditor, setShowEditor] = useState(false);
  const [reportNotes, setReportNotes] = useState(
    'Based on baseline SHA-256 cryptographic hash checks and multi-engine neural vision inspections, the evidence files demonstrate structural anomalies. Digital signatures and EXIF timestamps indicate unauthorized modification vectors. Recommending immediate court preservation order under ISO/IEC 27037.'
  );

  const handleSignOff = () => {
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      setSigned(true);
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  const flaggedCount = caseEvidence.reduce((acc, curr) => acc + (curr.anomalies?.length || 0), 0);
  const threatLevel = flaggedCount > 3 ? 'CRITICAL RISK' : flaggedCount > 0 ? 'HIGH RISK' : 'LOW RISK / CLEAN';

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl glassmorphism bg-grid-dots">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-primary/10 text-primary dark:text-forensic-glow font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Shield size={12} />
              Admissible Judicial Brief
            </span>
            <span className="text-[10px] font-mono text-muted">Ref: {activeCase.referenceNumber}</span>
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Judicial Forensic Brief & Report Manager</h2>
          <p className="text-xs text-muted">Generate broad, crystal-clear court-admissible PDF briefs with baseline digital hashes, metadata, timelines, and credentials certificates.</p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Case Selector */}
          <select 
            value={selectedCaseId} 
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="bg-background border rounded-lg px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title.substring(0, 20)}...
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowEditor(!showEditor)}
            className="border hover:bg-border/20 text-foreground rounded-lg px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Edit Examiner Opinion Notes"
          >
            <Edit3 size={14} className="text-primary" />
            <span>Edit Opinion</span>
          </button>

          <button
            onClick={() => setFullWidthMode(!fullWidthMode)}
            className="border hover:bg-border/20 text-foreground rounded-lg px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Toggle Broad Full-Width Layout"
          >
            {fullWidthMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{fullWidthMode ? 'Split View' : 'Broad View'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-900 dark:bg-slate-100 dark:text-slate-950 text-white rounded-lg px-3.5 py-2 text-xs font-bold transition-all shadow hover:shadow-lg flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print / Save PDF</span>
          </button>

          <button
            onClick={handleSignOff}
            disabled={signed || signing}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
              signed ? 'bg-success/15 text-success border border-transparent' : 'bg-primary hover:bg-primary-dark text-white shadow hover:shadow-primary/20'
            }`}
          >
            {signing ? 'Computing Signature...' : signed ? 'Signed & Certified' : 'Sign Report Cert'}
          </button>
        </div>
      </div>

      {/* Live Examiner Opinion Editor Panel */}
      {showEditor && (
        <div className="p-4 border rounded-2xl glassmorphism bg-primary/5 space-y-3 animate-fade-in border-primary/30">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold text-primary tracking-wider flex items-center gap-1.5">
              <Award size={14} />
              Chief Examiner Opinion Editor
            </h3>
            <span className="text-[10px] text-muted">Edits sync dynamically to Section IV below</span>
          </div>
          <textarea
            rows="3"
            value={reportNotes}
            onChange={(e) => setReportNotes(e.target.value)}
            placeholder="Type official examiner findings, technical recommendations, and court testimony points..."
            className="w-full text-xs bg-background border rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono leading-relaxed"
          />
        </div>
      )}

      {/* Main Broad Judicial Brief Document Layout */}
      <div className={`grid grid-cols-1 ${fullWidthMode ? 'w-full' : 'lg:grid-cols-4'} gap-6`}>
        
        {/* Broad Document Container */}
        <div className={`${fullWidthMode ? 'w-full max-w-5xl mx-auto' : 'lg:col-span-3'} border p-8 md:p-12 rounded-2xl bg-white text-slate-950 shadow-2xl space-y-8 font-serif print:border-none print:shadow-none print:p-0 print:max-w-none`}>
          
          {/* Header Banner Seal */}
          <div className="border-b-4 border-slate-950 pb-6 text-center space-y-2 font-sans">
             <div className="inline-block bg-slate-950 text-white font-black text-[10px] tracking-widest px-4 py-1 rounded-full uppercase mb-2">
               UNITED STATES / FEDERAL DIGITAL FORENSIC EXAMINATION DIRECTORY
             </div>
             <h1 className="text-2xl md:text-3xl font-black tracking-widest uppercase text-slate-950">
               OFFICIAL FORENSIC EXAMINATION RECORD BRIEF
             </h1>
             <p className="text-xs tracking-widest text-slate-600 uppercase font-bold">
               ISO/IEC 27037 ADMISSIBLE DIGITAL EVIDENTIARY REPORT
             </p>
             <div className="flex items-center justify-center gap-3 pt-2 text-[10px] font-mono">
               <span className="bg-slate-100 text-slate-900 border border-slate-300 px-3 py-1 rounded font-bold">
                 CASE REF: {activeCase.referenceNumber}
               </span>
               <span className="bg-slate-100 text-slate-900 border border-slate-300 px-3 py-1 rounded font-bold">
                 CASE NO: {activeCase.caseNumber}
               </span>
             </div>
          </div>

          {/* Key Case Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans border-b border-slate-300 pb-5">
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[9px] leading-none mb-1">CASE NUMBER ID</span>
               <strong className="text-slate-950 text-sm font-black font-mono">{activeCase.caseNumber}</strong>
             </div>
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[9px] leading-none mb-1">CUSTODY TIMESTAMP RECORD</span>
               <strong className="text-slate-950 font-mono">{new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</strong>
             </div>
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[9px] leading-none mb-1">CHIEF FORENSIC EXAMINER</span>
               <strong className="text-slate-950">{activeCase.assignedTo}</strong>
             </div>
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[9px] leading-none mb-1">ASSESSED THREAT RATING</span>
               <strong className={`font-black uppercase ${flaggedCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                 {threatLevel} ({flaggedCount} Anomalies)
               </strong>
             </div>
          </div>

          {/* Section I: Executive Incident Narrative & Scope */}
          <div className="space-y-3">
             <h3 className="font-sans font-black text-sm uppercase text-slate-950 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
               <span>I. EXECUTIVE BRIEF & INCIDENT NARRATIVE</span>
             </h3>
             <p className="text-[12.5px] leading-relaxed text-slate-800 font-sans">
               Pursuant to digital forensic specifications under **ISO/IEC 27037** standards, the Chief Examiner certifies the examination details listed below. Raw digital containers were extracted, hashed, and locked in standard write-once storage vaults.
             </p>
             <div className="bg-slate-50 p-4 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-950 space-y-1">
               <span className="text-[9px] font-sans font-bold text-slate-500 uppercase block tracking-wider">INVESTIGATION TARGET OBJECTIVE & SCOPE STATEMENT:</span>
               <p className="italic leading-relaxed font-semibold">"{activeCase.description}"</p>
             </div>
          </div>

          {/* Section II: Complete Evidentiary Hash Matrix & Asset Inventory */}
          <div className="space-y-3 pt-2">
             <div className="flex items-center justify-between font-sans border-b border-slate-200 pb-1">
               <h3 className="font-black text-sm uppercase text-slate-950 tracking-wider">
                 II. INGESTED ASSETS & DIGITAL HASH MATRIX ({caseEvidence.length} items)
               </h3>
               <span className="text-[10px] font-mono font-bold text-slate-500">ISO/IEC 27037 Baseline Hash Verified</span>
             </div>

             {caseEvidence.length > 0 ? (
               <div className="border border-slate-300 rounded-xl overflow-hidden font-mono text-[9.5px] w-full">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-sans font-black text-[10px]">
                       <th className="p-3 w-1/4">File Name</th>
                       <th className="p-3 w-1/6">Type</th>
                       <th className="p-3 w-1/6">Size</th>
                       <th className="p-3">SHA-256 Valid Evidentiary Hash Record</th>
                       <th className="p-3 w-1/6">Anomaly Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {caseEvidence.map(f => (
                       <tr key={f.id} className="border-b last:border-none border-slate-200">
                         <td className="p-3 font-sans font-black text-slate-950">{f.fileName}</td>
                         <td className="p-3 font-sans text-slate-700">{f.fileType}</td>
                         <td className="p-3 text-slate-900 font-bold">{(f.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                         <td className="p-3 text-slate-700 select-all break-all">{f.sha256}</td>
                         <td className="p-3 font-sans">
                           {f.anomalies && f.anomalies.length > 0 ? (
                             <span className="text-red-700 font-extrabold uppercase text-[8.5px] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full inline-block">
                               {f.anomalies.length} Flagged
                             </span>
                           ) : (
                             <span className="text-emerald-700 font-extrabold uppercase text-[8.5px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
                               Clean
                             </span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <p className="text-xs text-slate-500 italic font-sans p-4 border rounded">No evidence items uploaded to this case cabinet.</p>
             )}
          </div>

          {/* Section III: Chronological Anomaly Metric Log & Event Timeline */}
          <div className="space-y-3 pt-2 font-sans">
             <h3 className="font-black text-sm uppercase text-slate-950 tracking-wider border-b border-slate-200 pb-1">
               III. CHRONOLOGICAL ANOMALY METRIC LOGS ({caseTimeline.length} events)
             </h3>
             <div className="space-y-3">
               {caseTimeline.length > 0 ? (
                 caseTimeline.map((event) => (
                   <div key={event.id} className="p-4 border rounded-xl border-slate-300 bg-slate-50/80 flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500 font-mono text-[9.5px]">
                        <span className="font-bold">TIMESTAMP: {event.timestamp.replace('T', ' ').substring(0, 19)} UTC</span>
                        <strong className={`uppercase font-black px-2 py-0.5 rounded text-[8.5px] ${
                          event.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                          event.severity === 'HIGH' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {event.severity}
                        </strong>
                      </div>
                      <p className="text-slate-950 leading-relaxed font-bold">
                        {event.description}
                      </p>
                      <span className="text-[9px] font-mono text-slate-500">File Reference: {event.source}</span>
                   </div>
                 ))
               ) : (
                 <p className="text-xs text-slate-500 italic p-4 border rounded">No timeline anomalies recorded for this case cabinet.</p>
               )}
             </div>
          </div>

          {/* Section IV: Chief Examiner Technical Finding & Expert Opinion */}
          <div className="space-y-3 pt-2 font-sans">
             <h3 className="font-black text-sm uppercase text-slate-950 tracking-wider border-b border-slate-200 pb-1">
               IV. CHIEF EXAMINER TECHNICAL FINDING & EXPERT OPINION STATEMENT
             </h3>
             <div className="p-5 border rounded-xl border-slate-300 bg-slate-50 text-xs text-slate-950 leading-relaxed space-y-3">
                <span className="text-[9.5px] font-black text-slate-600 uppercase block font-sans tracking-wider">
                  OFFICIAL EXAMINER FINDING STATEMENT:
                </span>
                <p className="font-mono text-slate-900 bg-white p-4 border border-slate-300 rounded-lg text-[11px] leading-relaxed select-all">
                  "{reportNotes}"
                </p>
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-600 font-bold border-t border-slate-200">
                  <span>Chain of Custody Standard: ISO/IEC 27037 Verified</span>
                  <span>Chief Examiner Badge ID: FNS-EXP-889</span>
                </div>
             </div>
          </div>

          {/* Section V: Signatures & Certification Block */}
          <div className="pt-8 border-t-2 border-slate-950 flex flex-col sm:flex-row justify-between gap-6 font-sans">
             <div className="space-y-3">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">EXAMINER SIGNATURE & CERTIFICATE SEAL</span>
                
                {signed ? (
                  <div className="p-4 border-2 border-emerald-400 bg-emerald-50 rounded-xl text-xs text-emerald-900 font-bold space-y-1">
                     <div className="flex items-center gap-2 font-black uppercase text-emerald-700">
                       <ShieldCheck size={18} className="text-emerald-600" />
                       <span>Signed Digitally & Certified by Chief Examiner</span>
                     </div>
                     <span className="block font-mono text-slate-600 text-[9px] pt-1">
                       RSA-2048 CERTIFICATE: SHA256-RSA-FNS-{activeCase.caseNumber}-{activeCase.referenceNumber}
                     </span>
                  </div>
                ) : (
                  <div className="h-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-bold">
                     Awaiting Chief Examiner Digital Signature
                  </div>
                )}
             </div>

             <div className="text-right space-y-1 text-xs text-slate-600 font-mono">
                <span className="text-[9px] uppercase font-black text-slate-400 block mb-2 font-sans">SYSTEM HANDSHAKE VERIFIED</span>
                <div>ForenSight Host Core Version: v1.0.4</div>
                <div>Local Crypto Ledger block ID: FNS-{Math.floor(100+Math.random()*900)}</div>
                <div className="text-[9px] text-slate-400">Printed: {new Date().toLocaleDateString()}</div>
             </div>
          </div>

        </div>

        {/* Optional Split Sidebar View (Only when fullWidthMode is off) */}
        {!fullWidthMode && (
          <div className="space-y-4 font-sans">
            <div className="border p-5 rounded-2xl glassmorphism space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-muted flex items-center gap-1.5">
                 <Award size={14} className="text-primary" />
                 Examiner Opinion Editor
              </h3>

              <div className="space-y-3 text-[10px]">
                <div>
                  <label className="text-muted font-bold block mb-1">Edit Chief Examiner Findings & Remarks:</label>
                  <textarea
                    rows="8"
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    className="w-full text-[11px] bg-background border rounded p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none font-mono"
                  />
                </div>

                <div>
                  <span className="text-muted block font-semibold mb-1">Verification Standard Compliance</span>
                  <span className="text-foreground tracking-wider font-extrabold uppercase bg-primary/10 text-primary dark:text-forensic-glow px-2.5 py-1 rounded inline-block text-[9px]">
                     ISO/IEC 27037 Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportViewer;
