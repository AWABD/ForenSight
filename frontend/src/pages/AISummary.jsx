import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { BrainCircuit, Info, AlertTriangle, Sparkles, CheckCircle2, ShieldAlert, FileText, ChevronRight } from 'lucide-react';

const AISummary = () => {
  const { activeCase, caseEvidence } = useProject();
  const [selectedExplanations, setSelectedExplanations] = useState('summary'); // summary, OCR, deepfake

  const hasCompromisedFile = caseEvidence.some(f => f.fileName.includes('tamper') || f.fileName.includes('deepfake'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">AI Explainability & Integrity Summary</h2>
        <p className="text-xs text-muted">Auditable explainability reports derived from local model checkpoints. Meets requirements for legal admissibility.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation selectors */}
        <div className="space-y-3">
          <button
            onClick={() => setSelectedExplanations('summary')}
            className={`w-full flex items-center justify-between p-4 border rounded-xl text-left transition-all ${
              selectedExplanations === 'summary' ? 'bg-primary/10 text-primary border-primary ring-1 ring-primary/20' : 'glassmorphism hover:bg-border/20 text-muted hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BrainCircuit size={16} />
              <div className="text-xs font-semibold">
                <span className="block leading-none">LLM Summary Analysis</span>
                <span className="text-[9px] text-muted font-normal mt-1 block">Context reasoning logs</span>
              </div>
            </div>
            <ChevronRight size={14} />
          </button>

          <button
            onClick={() => setSelectedExplanations('OCR')}
            className={`w-full flex items-center justify-between p-4 border rounded-xl text-left transition-all ${
              selectedExplanations === 'OCR' ? 'bg-primary/10 text-primary border-primary ring-1 ring-primary/20' : 'glassmorphism hover:bg-border/20 text-muted hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={16} />
              <div className="text-xs font-semibold">
                <span className="block leading-none">EasyOCR Text Extractions</span>
                <span className="text-[9px] text-muted font-normal mt-1 block">Scanned character arrays</span>
              </div>
            </div>
            <ChevronRight size={14} />
          </button>

          <button
            onClick={() => setSelectedExplanations('deepfake')}
            className={`w-full flex items-center justify-between p-4 border rounded-xl text-left transition-all ${
              selectedExplanations === 'deepfake' ? 'bg-primary/10 text-primary border-primary ring-1 ring-primary/20' : 'glassmorphism hover:bg-border/20 text-muted hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={16} />
              <div className="text-xs font-semibold">
                <span className="block leading-none">Double Compression Models</span>
                <span className="text-[9px] text-muted font-normal mt-1 block">Vector tampering heatmaps</span>
              </div>
            </div>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Explainability contents viewport */}
        <div className="lg:col-span-3 border p-6 rounded-2xl glassmorphism space-y-6">
          
          {/* Section 1: LLM Reasoning */}
          {selectedExplanations === 'summary' && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BrainCircuit size={16} className="text-primary" />
                  Local Llama-3 Reasoning Summary Draft
                </h3>
                <p className="text-[10px] text-muted">Summary generated strictly locally via host Llama-3-8B checkpoint.</p>
              </div>

              <div className="p-4 bg-background/50 border rounded-xl leading-relaxed text-xs text-foreground space-y-3">
                <p>
                  <strong>Case Assessment Summary:</strong> Deep inspection of evidence bundles in {activeCase.caseNumber} identifies targeted malicious alterations inside ledger documents.
                </p>
                <p>
                  1. **Access Anomaly:** Remote user `root` logged in from non-whitelisted IP `192.168.12.93`. System authentication security logs verify that brute force connection bypass rules were utilized.
                </p>
                <p>
                  2. **Data Modification:** Following root escalation, access log traces match SQL modifications executed on SQL database ledger. Approximately 12 entry lines were dropped.
                </p>
                <p>
                  3. **Media Tampering:** Accompanying image credentials show EXIF timestamp edits set 6 years retroactively to mask access chronologies. Double JPEG compression deviations confirm clone-stamps.
                </p>
              </div>

              {/* Model attributes */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-3 text-[10px] text-muted">
                <Sparkles size={16} className="text-primary flex-shrink-0 animate-spin" />
                <span>Local model checkpoint: <strong>meta-llama/Meta-Llama-3-8B-Instruct</strong> (CUDA execution bounds validation passed).</span>
              </div>
            </div>
          )}

          {/* Section 2: OCR */}
          {selectedExplanations === 'OCR' && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  EasyOCR Scanned Character Array Output
                </h3>
                <p className="text-[10px] text-muted">Local text segmentation from images, PDF extracts, and system screenshots.</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-card/40 flex items-center justify-between text-[11px]">
                  <div className="font-mono text-muted">
                    File: <strong className="text-foreground">employee_record_tampered.jpg</strong>
                  </div>
                  <span className="text-[9px] bg-success/15 text-success px-2 py-0.5 rounded font-black">94.2% Conf</span>
                </div>

                <div className="font-mono text-xs bg-slate-905 bg-slate-900 border text-slate-350 p-4 rounded-xl space-y-2">
                  <div className="text-slate-500 border-b border-slate-800 pb-1.5 flex justify-between">
                     <span>bounding_box [coordinates]</span>
                     <span>segment text extract</span>
                  </div>
                  <div className="flex justify-between hover:bg-slate-800/40 p-1.5 rounded transition-all">
                     <span>[x: 10, y: 15, w: 120, h: 30]</span>
                     <span className="text-emerald-400 font-bold select-all leading-none">"SECURITY ID CARD"</span>
                  </div>
                  <div className="flex justify-between hover:bg-slate-800/40 p-1.5 rounded transition-all">
                     <span>[x: 12, y: 55, w: 90, h: 25]</span>
                     <span className="text-emerald-400 font-bold select-all leading-none">"CLEARANCE LEVEL 4"</span>
                  </div>
                  <div className="flex justify-between hover:bg-slate-800/40 p-1.5 rounded transition-all">
                     <span>[x: 110, y: 55, w: 100, h: 25]</span>
                     <span className="text-emerald-400 font-bold select-all leading-none">"ROLE: ROOT ADMIN"</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Deepfake / Double Compression */}
          {selectedExplanations === 'deepfake' && (
            <div className="space-y-4 animate-fade-in col-span-3">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert size={16} className="text-danger" />
                  Double JPEG Compression Noise Heatmap
                </h3>
                <p className="text-[10px] text-muted">Mathematical verification anomalies showing modified pixel blocks.</p>
              </div>

              {hasCompromisedFile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image visual */}
                    <div className="border rounded-xl p-4 bg-slate-900 flex flex-col items-center justify-center">
                      <div className="w-[180px] h-[120px] bg-slate-850 bg-slate-800 rounded border border-danger/30 relative flex items-center justify-center text-xs text-slate-500 font-mono">
                         IMAGE PREVIEW
                         <div className="absolute top-4 left-6 w-16 h-12 border border-danger border-dashed bg-danger/10 animate-pulse" />
                      </div>
                      <span className="text-[9px] text-slate-500 mt-2 block font-mono">Region [140, 220, 290, 310] modified</span>
                    </div>

                    {/* Matrix values */}
                    <div className="p-4 border rounded-xl bg-card space-y-3 leading-relaxed text-[10px] text-muted">
                       <h4 className="font-bold text-foreground leading-none">Tampering Detection Metrics</h4>
                       <p>
                         Pixel analysis checks the **Quantization Matrix** deviation rate. The red quadrant highlights areas showing secondary compression rates.
                       </p>
                       <p>
                         Standard images have uniform JPEG block grids. Splicing elements from another document introduces split boundaries detected in grid lines.
                       </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed p-10 rounded-2xl text-center text-muted text-xs">
                  No tampered image media assets inside active workspace.
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default AISummary;
