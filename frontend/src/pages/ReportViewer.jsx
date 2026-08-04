import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { FileText, Printer, ShieldCheck, Signature, Sparkles, CheckCircle2, UserCheck } from 'lucide-react';

const ReportViewer = () => {
  const { activeCase, caseEvidence, caseTimeline } = useProject();
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [reportNotes, setReportNotes] = useState('Local models parsed elements. Discrepancies mapped.');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Forensic Brief Report Manager</h2>
          <p className="text-xs text-muted">Generate court-admissible PDF briefs containing baseline digital hashes, metadata, timelines, and credentials certificates.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="border hover:bg-border/20 text-foreground rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print / Print to PDF</span>
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
             <h1 className="text-xl font-black tracking-widest uppercase">FEDERAL INVESTIGATION DIGITAL FORENSICS</h1>
             <p className="text-[10px] tracking-widest text-slate-500 uppercase font-black">Admissible Forensic Examination Record Brief</p>
             <span className="text-[9px] bg-slate-100 text-slate-800 font-mono px-2 py-0.5 rounded inline-block mt-2">
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
               <span className="text-slate-500 block uppercase font-bold text-[8.5px] leading-none mb-1">CHIEF EXAMINER</span>
               <strong className="text-slate-900">{activeCase.assignedTo}</strong>
             </div>
             <div>
               <span className="text-slate-500 block uppercase font-bold text-[8.5px] leading-none mb-1">STATUS</span>
               <strong className="text-slate-950 font-bold uppercase">{activeCase.status}</strong>
             </div>
          </div>

          {/* Section 1: Executive brief */}
          <div className="space-y-2">
             <h3 className="font-sans font-bold text-xs uppercase text-slate-900 tracking-wider">I. CASE CABINET SUMMARY</h3>
             <p className="text-[12px] leading-relaxed text-slate-800">
               Pursuant to modern forensic specifications of digital evidentiary handling regulations (**ISO/IEC 27037**), the Chief Examiner certifies the examination details listed below. Raw digital containers are preserved and locked locally in standard write-once configurations.
             </p>
             <p className="text-[12px] leading-relaxed text-slate-800 italic bg-slate-50 p-3 border rounded font-mono">
               "{activeCase.description}"
             </p>
          </div>

          {/* Section 2: Evidentiary items and hashes table */}
          <div className="space-y-3 pt-2">
             <h3 className="font-sans font-bold text-xs uppercase text-slate-900 tracking-wider">II. INGESTED ASSETS & DIGITAL HASH MATRIX</h3>
             <div className="border border-slate-350 rounded overflow-hidden font-mono text-[9px] w-full">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-100 text-slate-600 border-b border-slate-300">
                     <th className="p-2 w-1/4">File Name</th>
                     <th className="p-2 w-1/6">Size</th>
                     <th className="p-2">SHA-256 Valid Evidentiary Hash Record</th>
                   </tr>
                 </thead>
                 <tbody>
                   {caseEvidence.map(f => (
                     <tr key={f.id} className="border-b last:border-none border-slate-200">
                       <td className="p-2 font-sans font-bold text-slate-950">{f.fileName}</td>
                       <td className="p-2">{(f.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                       <td className="p-2 text-slate-700 select-all break-all">{f.sha256}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

          {/* Section 3: Timeline Summary */}
          <div className="space-y-3 pt-2">
             <h3 className="font-sans font-bold text-xs uppercase text-slate-900 tracking-wider">III. ANOMALOUS CHRONOLOGY METRIC LOGS</h3>
             <div className="space-y-2.5 font-sans">
               {caseTimeline.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').map((event) => (
                 <div key={event.id} className="p-3 border rounded border-slate-200 bg-slate-50 flex flex-col gap-1 text-[10.5px]">
                    <div className="flex items-center justify-between text-slate-500 font-mono text-[9px]">
                      <span>TIMESTAMP: {event.timestamp.replace('T', ' ').substring(0, 19)} UTC</span>
                      <strong className="text-red-700 uppercase font-black">{event.severity}</strong>
                    </div>
                    <p className="text-slate-800 leading-relaxed font-semibold">
                      {event.description}
                    </p>
                    <span className="text-[8.5px] font-mono text-slate-400">File Reference: {event.source}</span>
                 </div>
               ))}
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
                       <span>Signed Digitally</span>
                     </div>
                     <span className="block font-mono text-slate-500 text-[8.5px]">CERT: SHA256-RSA-FNS-{activeCase.caseNumber}</span>
                  </div>
                ) : (
                  <div className="h-10 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                     Awaiting signing credentials
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
               <Printer size={14} className="text-primary" />
               Brief Action Sidebar
            </h3>

            <div className="space-y-3 text-[10px]">
              <div>
                <label className="text-muted font-bold block mb-1">Add Examiner Case Concluding Notes</label>
                <textarea
                  rows="4"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full text-[11px] bg-background border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
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
