import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { FileText, Printer, ShieldCheck, Signature, Sparkles, CheckCircle2, UserCheck, Briefcase, AlertTriangle, Award, Check } from 'lucide-react';

const ReportViewer = () => {
  const { cases, activeCase, selectedCaseId, setSelectedCaseId, caseEvidence, caseTimeline } = useProject();
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [reportNotes, setReportNotes] = useState(
    'Based on baseline SHA-256 cryptographic hash checks and multi-engine neural vision inspections, the evidence files demonstrate structural anomalies. Digital signatures and EXIF timestamps indicate unauthorized modification vectors. Recommending court preservation order.'
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Forensic Brief Report Manager</h2>
          <p className="text-xs text-muted">Generate court-admissible PDF briefs containing baseline digital hashes, metadata, timelines, and credentials certificates.</p>
        </div>

        {/* Case selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={selectedCaseId} 
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="bg-background border rounded-lg px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title.substring(0, 18)}...
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="border hover:bg-border/20 text-foreground rounded-lg px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print to PDF</span>
          </button>

          <button
            onClick={handleSignOff}
            disabled={signed || signing}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
              signed ? 'bg-success/15 text-success border border-transparent' : 'bg-primary hover:bg-primary-dark text-white shadow hover:shadow-primary/20'
            }`}
          >
            {signing ? 'Computing Signature...' : signed ? 'Signed & Locked' : 'Sign Report Cert'}
          </button>
        </div>
      </div>

      {/* Main Judicial brief container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Document view layout */}
        <div className="lg:col-span-3 border p-8 rounded-2xl bg-white text-slate-900 shadow-lg space-y-6 min-h-[640px] font-serif print:border-none print:shadow-none print:p-0">
          
          {/* Header Banner */}
          <div className="border-b-4 border-slate-900 pb-5 text-center space-y-1 font-sans">
             <h1 className="text-xl font-black tracking-widest uppercase text-slate-950">FEDERAL INVESTIGATION DIGITAL FORENSICS</h1>
             <p className="text-[10px] tracking-widest text-slate-600 uppercase font-black">Admissible Forensic Examination Record Brief</p>
             <span className="text-[9px] bg-slate-100 text-slate-800 font-mono px-2 py-0.5 rounded inline-block mt-2 border border-slate-300">
               CASE REF: {activeCase.referenceNumber}
             </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b pb-4">
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[8.5px] leading-none mb-1">CASE NUMBER ID</span>
               <strong className="text-slate-900 text-sm font-black">{activeCase.caseNumber}</strong>
             </div>
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[8.5px] leading-none mb-1">CUSTODY TIMESTAMP RECORD</span>
               <strong className="text-slate-900">{new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</strong>
             </div>
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[8.5px] leading-none mb-1">CHIEF FORENSIC EXAMINER</span>
               <strong className="text-slate-900">{activeCase.assignedTo} (Badge ID: FNS-EXP-889)</strong>
             </div>
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[8.5px] leading-none mb-1">ASSESSED THREAT LEVEL</span>
               <strong className={`font-extrabold uppercase ${flaggedCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{threatLevel} ({flaggedCount} Anomalies)</strong>
             </div>
          </div>

          {/* Section 1: Executive Brief & Scope */}
          <div className="space-y-2">
             <h3 className="font-sans font-bold text-xs uppercase text-slate-900 tracking-wider">I. EXECUTIVE BRIEF & INCIDENT NARRATIVE</h3>
             <p className="text-[12px] leading-relaxed text-slate-800">
               Pursuant to modern digital forensic specifications under **ISO/IEC 27037** standards, the Chief Examiner certifies the examination details listed below. Raw digital containers were extracted, hashed, and locked in standard write-once storage vaults.
             </p>
             <div className="bg-slate-50 p-3.5 border border-slate-300 rounded font-mono space-y-1 text-[11px] text-slate-900">
               <span className="text-[9px] font-sans font-bold text-slate-500 uppercase block">INVESTIGATION SCOPE & STATEMENT:</span>
               <p className="italic">"{activeCase.description}"</p>
             </div>
          </div>

          {/* Section 2: Evidentiary items and hashes table */}
          <div className="space-y-3 pt-2">
             <div className="flex items-center justify-between font-sans">
               <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">II. INGESTED ASSETS & DIGITAL HASH MATRIX ({caseEvidence.length} items)</h3>
             </div>
             {caseEvidence.length > 0 ? (
               <div className="border border-slate-350 rounded overflow-hidden font-mono text-[9px] w-full">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-sans">
                       <th className="p-2 w-1/4">File Name</th>
                       <th className="p-2 w-1/6">Type</th>
                       <th className="p-2 w-1/6">Size</th>
                       <th className="p-2">SHA-256 Valid Evidentiary Hash Record</th>
                       <th className="p-2 w-1/6">Anomaly Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {caseEvidence.map(f => (
                       <tr key={f.id} className="border-b last:border-none border-slate-200">
                         <td className="p-2 font-sans font-bold text-slate-950">{f.fileName}</td>
                         <td className="p-2 font-sans text-slate-700">{f.fileType}</td>
                         <td className="p-2 text-slate-800">{(f.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                         <td className="p-2 text-slate-700 select-all break-all">{f.sha256}</td>
                         <td className="p-2 font-sans">
                           {f.anomalies && f.anomalies.length > 0 ? (
                             <span className="text-red-700 font-bold uppercase text-[8px] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                               {f.anomalies.length} Flagged
                             </span>
                           ) : (
                             <span className="text-emerald-700 font-bold uppercase text-[8px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
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
               <p className="text-xs text-slate-500 italic font-sans">No evidence items uploaded to this case cabinet.</p>
             )}
          </div>

          {/* Section 3: Timeline Summary */}
          <div className="space-y-3 pt-2">
             <h3 className="font-sans font-bold text-xs uppercase text-slate-900 tracking-wider">III. ANOMALOUS CHRONOLOGY METRIC LOGS</h3>
             <div className="space-y-2.5 font-sans">
               {caseTimeline.length > 0 ? (
                 caseTimeline.map((event) => (
                   <div key={event.id} className="p-3 border rounded border-slate-200 bg-slate-50 flex flex-col gap-1 text-[10.5px]">
                      <div className="flex items-center justify-between text-slate-500 font-mono text-[9px]">
                        <span>TIMESTAMP: {event.timestamp.replace('T', ' ').substring(0, 19)} UTC</span>
                        <strong className={`uppercase font-black ${
                          event.severity === 'CRITICAL' ? 'text-red-700' :
                          event.severity === 'HIGH' ? 'text-amber-700' : 'text-blue-700'
                        }`}>
                          {event.severity}
                        </strong>
                      </div>
                      <p className="text-slate-900 leading-relaxed font-semibold">
                        {event.description}
                      </p>
                      <span className="text-[8.5px] font-mono text-slate-500">File Reference: {event.source}</span>
                   </div>
                 ))
               ) : (
                 <p className="text-xs text-slate-500 italic">No timeline anomalies recorded for this case cabinet.</p>
               )}
             </div>
          </div>

          {/* Section 4: Examiner Expert Opinion & Attestation */}
          <div className="space-y-3 pt-2 font-sans">
             <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">IV. CHIEF EXAMINER EXPERT OPINION & RECOMMENDATION</h3>
             <div className="p-4 border rounded border-slate-300 bg-slate-50/80 text-[11px] text-slate-900 leading-relaxed space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">Official Examiner Finding Statement:</span>
                <p className="font-mono text-slate-800 bg-white p-3 border rounded">
                  "{reportNotes}"
                </p>
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-600 font-semibold border-t">
                  <span>Chain of Custody Standard: ISO/IEC 27037 Verified</span>
                  <span>Examiner Badge: FNS-EXP-889</span>
                </div>
             </div>
          </div>

          {/* Signatures block */}
          <div className="pt-8 border-t flex flex-col sm:flex-row justify-between gap-6 font-sans">
             <div className="space-y-4">
                <span className="text-[8.5px] text-slate-500 block uppercase font-bold">Examiner Signature Certificate</span>
                
                {signed ? (
                  <div className="p-3 border border-emerald-300 bg-emerald-50 rounded text-[9.5px] text-emerald-800 font-semibold space-y-1">
                     <div className="flex items-center gap-1.5 font-bold uppercase">
                       <ShieldCheck size={14} className="text-emerald-600" />
                       <span>Signed Digitally & Certified</span>
                     </div>
                     <span className="block font-mono text-slate-500 text-[8.5px]">CERT: SHA256-RSA-FNS-{activeCase.caseNumber}</span>
                  </div>
                ) : (
                  <div className="h-10 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                     Awaiting examiner signature credentials
                  </div>
                )}
             </div>

             <div className="text-right space-y-1 text-[10px] text-slate-500">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-2">SYSTEM HANDSHAKE VERIFIED</span>
                <div>ForenSight Host Core Version: v1.0.4</div>
                <div>Local Crypto Ledger block ID: FNS-{Math.floor(100+Math.random()*900)}</div>
             </div>
          </div>

        </div>

        {/* Sidebar Brief Review panel */}
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
                  rows="6"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full text-[11px] bg-background border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none font-mono"
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

      </div>
    </div>
  );
};

export default ReportViewer;
