import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { HardDrive, AlertTriangle, Eye, EyeOff, Search, FileText, Binary, ShieldCheck } from 'lucide-react';

const EvidenceViewer = () => {
  const { caseEvidence } = useProject();
  const [selectedFileId, setSelectedFileId] = useState(caseEvidence[0]?.id || '');
  const [viewMode, setViewMode] = useState('STANDARD'); // STANDARD, HEX, METADATA
  const [hexOffsetLimit, setHexOffsetLimit] = useState(128);

  const selectedFile = caseEvidence.find(f => f.id === selectedFileId) || caseEvidence[0];

  // Mock Hex dump generator
  const getHexDump = (fileName) => {
    const lines = [];
    const hexChars = '0123456789abcdef';
    for (let offset = 0; offset < hexOffsetLimit; offset += 16) {
      let hexPart = '';
      let asciiPart = '';
      for (let i = 0; i < 16; i++) {
        const val = Math.abs((fileName.charCodeAt((offset + i) % fileName.length) || 0) * (offset + i + 17)) % 256;
        hexPart += hexChars[(val >> 4) & 0x0f] + hexChars[val & 0x0f] + ' ';
        asciiPart += val >= 32 && val <= 126 ? String.fromCharCode(val) : '.';
      }
      lines.push({
        offset: offset.toString(16).toUpperCase().padStart(8, '0'),
        hex: hexPart.toUpperCase(),
        ascii: asciiPart
      });
    }
    return lines;
  };

  // Mock Log parsing
  const getLogLines = () => {
    return [
      { num: 1, time: '08:10:00', host: '192.168.12.93', msg: 'sshd[293A]: Connection accepted from remote socket' },
      { num: 2, time: '08:10:02', host: '192.168.12.93', msg: 'sshd[293A]: PAM authentication: failed credentials for user root', anomaly: true },
      { num: 3, time: '08:11:15', host: '192.168.12.93', msg: 'sshd[293A]: PAM authentication: password bypass token applied', anomaly: true },
      { num: 4, time: '08:12:00', host: '192.168.12.93', msg: 'sshd[293A]: Session opened for user root under tty1' },
      { num: 5, time: '08:14:10', host: '192.168.12.93', msg: 'sudo[301F]: root: executed deletion task over sqlite databases', anomaly: true }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Evidence Examiner & Viewer</h2>
          <p className="text-xs text-muted">Inspect raw hex strings, syslog content, database columns, and image double-compresses</p>
        </div>
        
        {/* Selector */}
        <select
          value={selectedFileId}
          onChange={(e) => setSelectedFileId(e.target.value)}
          className="bg-background border rounded-lg px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all max-w-xs"
        >
          {caseEvidence.map(f => (
            <option key={f.id} value={f.id}>{f.fileName}</option>
          ))}
        </select>
      </div>

      {selectedFile ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File details list */}
          <div className="space-y-4">
            
            {/* File Info Card */}
            <div className="border p-5 rounded-2xl glassmorphism space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-muted flex items-center gap-1.5">
                <HardDrive size={14} className="text-primary" />
                Evidentiary Signature
              </h3>
              
              <div className="space-y-3 text-[10px]">
                <div>
                  <span className="text-muted block font-semibold mb-0.5">FILE NAME</span>
                  <span className="font-extrabold text-foreground break-all">{selectedFile.fileName}</span>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5">FILE TYPE</span>
                  <span className="font-extrabold text-foreground">{selectedFile.fileType}</span>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5">SIZE</span>
                  <span className="font-extrabold text-foreground">{(selectedFile.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5">SHA DEFAULT HASH</span>
                  <span className="font-mono text-muted select-all break-all">{selectedFile.sha256}</span>
                </div>
              </div>
            </div>

            {/* AI Flags Inside File */}
            <div className="border p-5 rounded-2xl glassmorphism space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-muted flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-danger" />
                AI Inference Anomalies
              </h3>

              <div className="space-y-2">
                {selectedFile.anomalies && selectedFile.anomalies.length > 0 ? (
                  selectedFile.anomalies.map((anom, idx) => (
                    <div key={idx} className="p-2.5 border border-danger/20 bg-danger/5 rounded-lg text-[9px] text-danger leading-relaxed">
                      <strong className="block uppercase font-bold mb-0.5">{anom.type}</strong>
                      {anom.message}
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-success/5 border border-success/20 rounded-lg text-[10px] text-success leading-relaxed flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>No structural tampering signatures flagged.</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Interactive Workspace Viewer Panel */}
          <div className="lg:col-span-3 border rounded-2xl glassmorphism overflow-hidden flex flex-col min-h-[500px]">
            {/* Nav View Tabs */}
            <div className="bg-border/20 border-b px-4 py-2 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('STANDARD')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${
                    viewMode === 'STANDARD' ? 'bg-primary text-white' : 'text-muted hover:bg-border/30 hover:text-foreground'
                  }`}
                >
                  <Eye size={12} className="inline mr-1" /> View Standard
                </button>
                <button
                  onClick={() => setViewMode('HEX')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${
                    viewMode === 'HEX' ? 'bg-primary text-white' : 'text-muted hover:bg-border/30 hover:text-foreground'
                  }`}
                >
                  <Binary size={12} className="inline mr-1" /> Hex Viewer
                </button>
              </div>

              <span className="text-[10px] font-mono text-muted uppercase font-bold">
                Clearance lvl 3 read-mode
              </span>
            </div>

            {/* Viewer Contents */}
            <div className="flex-1 p-5 overflow-auto bg-background/50">
              
              {/* Mode 1: Standard view */}
              {viewMode === 'STANDARD' && (
                <div className="space-y-4 h-full">
                  {/* Categorized Displays */}
                  {selectedFile.fileType.includes('Image') ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      {/* Interactive Deepfake Heatmap Overlay */}
                      <div className="relative border rounded-xl overflow-hidden shadow-lg border-danger/30 max-w-sm">
                        <div className="w-[300px] h-[200px] bg-slate-350 dark:bg-slate-800 flex items-center justify-center text-muted font-bold text-xs">
                          {selectedFile.fileName}
                        </div>
                        {/* Custom Grad-CAM tampered highlight box overlay */}
                        <div className="absolute top-12 left-16 w-24 h-16 border-2 border-danger border-dashed bg-danger/10 flex items-center justify-center animate-pulse">
                          <span className="text-[8px] bg-danger text-white px-1 leading-none font-bold">TAMPER MATRIX</span>
                        </div>
                      </div>
                      <div className="text-center p-3 max-w-md">
                        <h4 className="text-xs font-bold text-danger">CV Manipulation Error Map (Quantization Noise Deviation)</h4>
                        <p className="text-[10px] text-muted mt-1 leading-relaxed">
                          Highlighted quadrant indicates clone stamp pixel manipulations. Local CNN confidence rate is **94.2%**.
                        </p>
                      </div>
                    </div>
                  ) : selectedFile.fileType.includes('Log') || selectedFile.fileName.includes('logs') ? (
                    <div className="border rounded-xl overflow-hidden font-mono text-[10px] bg-card/40">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-border/40 text-muted uppercase border-b">
                            <th className="p-2 w-10">L#</th>
                            <th className="p-2 w-20">Time</th>
                            <th className="p-2 w-24">Client Host</th>
                            <th className="p-2">Syslog Message Trace</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getLogLines().map((line) => (
                            <tr 
                              key={line.num} 
                              className={`border-b hover:bg-border/10 transition-colors ${
                                line.anomaly ? 'bg-danger/5 text-danger font-semibold' : 'text-foreground'
                              }`}
                            >
                              <td className="p-2 border-r focus:outline-none">{line.num}</td>
                              <td className="p-2 border-r">{line.time}</td>
                              <td className="p-2 border-r font-bold">{line.host}</td>
                              <td className="p-2 flex items-center justify-between">
                                <span>{line.msg}</span>
                                {line.anomaly && (
                                  <span className="text-[8px] border border-danger/30 bg-danger/10 px-1 rounded font-black max-h-[14px]">FLAGGED</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Default text/doc display */
                    <div className="space-y-4">
                      {selectedFile.exif ? (
                        <div className="border rounded-xl p-4 bg-card/30 space-y-3">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                            <FileText size={12} className="text-primary" />
                            Extracted EXIF Camera Header Metadata
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-[10px] leading-relaxed">
                            <div><span className="text-muted block">CAMERA:</span> <strong className="text-foreground">{selectedFile.exif.camera}</strong></div>
                            <div><span className="text-muted block">GPS MATRIX COORDINATES:</span> <strong className="text-foreground">{selectedFile.exif.gps}</strong></div>
                            <div><span className="text-muted block">ORIGINAL TIMESTAMP:</span> <strong className="text-foreground">{selectedFile.exif.timestamp}</strong></div>
                          </div>
                        </div>
                      ) : null}
                      
                      <div className="border rounded-xl p-4 bg-card/25 font-mono text-[10.5px] leading-relaxed">
                        <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1 font-sans">
                          Parsed File Content
                        </h4>
                        <p className="text-muted mb-2">Structure status: logical directory files scanned</p>
                        <p className="text-foreground">
                          SQLite DB dump parameters loaded. Tables directories found: [audit_ledgers, accounts_details, system_configs, user_sessions]. Rows parsed: 194. Integrity index: 1.0. Flagged updates: 12 elements.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Mode 2: Hex dump view */}
              {viewMode === 'HEX' && (
                <div className="space-y-4 font-mono text-[11px] bg-slate-900 text-slate-350 p-4 rounded-xl shadow-inner border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-500">
                    <span>Offset</span>
                    <span>Hex Values (00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F)</span>
                    <span>Decoded ASCII</span>
                  </div>

                  <div className="space-y-1 max-h-[340px] overflow-y-auto">
                    {getHexDump(selectedFile.fileName).map((line) => (
                      <div key={line.offset} className="flex justify-between hover:bg-slate-800/50 py-0.5 rounded transition-all">
                        <span className="text-[#3b82f6]">{line.offset}</span>
                        <span className="text-emerald-500 select-all font-semibold uppercase">{line.hex}</span>
                        <span className="text-indigo-400 select-all">{line.ascii}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-right pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                    Loaded {hexOffsetLimit} offsets.{' '}
                    <button 
                      onClick={() => setHexOffsetLimit(prev => prev + 128)}
                      className="text-primary hover:underline hover:text-accent font-bold"
                    >
                      Inspect Next 128 bytes
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed p-10 rounded-2xl text-center text-muted">
          No active case forensic files loaded inside this workspace. Ingest files first.
        </div>
      )}
    </div>
  );
};

export default EvidenceViewer;
