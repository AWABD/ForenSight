import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { 
  HardDrive, AlertTriangle, Eye, Binary, Search, FileText, 
  ShieldCheck, Loader2, Play, Check, Copy, Calendar, BarChart3, Database
} from 'lucide-react';

// Sub-component for the OCR Examiner & Comparison Module
const EvidenceOCRPanel = ({ selectedFile }) => {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [copied, setCopied] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  const runOCRScan = () => {
    setScanning(true);
    setScanProgress('INITIALIZING ML MODELS (EASYOCR & PADDLEOCR)...');

    const steps = [
      { t: 800, log: 'PARSING FILE IMAGE CHANNELS & EXTRACTING ROW VECTORS...' },
      { t: 1600, log: 'EASYOCR ENGINE INFERENCE RUNNING (PYTORCH INT8 LAYERS)...' },
      { t: 2400, log: 'PADDLEOCR ENGINE INFERENCE RUNNING (PADDLEPADDLE FP16 LAYERS)...' },
      { t: 3200, log: 'COMPILING CHAR CONFIDENCE & INTERPOLATING EXTRACTED TEXT...' },
      { t: 4000, log: 'POST-PROCESSING TEXT, TABLES, NUMBERS & DATE ENTITIES...' }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setScanProgress(step.log);
      }, step.t);
    });

    setTimeout(() => {
      setScanning(false);
      
      const fileName = selectedFile.fileName.toLowerCase();
      let text = '';
      let tables = [];
      let numbers = [];
      let dates = [];
      let easyocrTime = 0.38;
      let paddleocrTime = 0.24;
      let easyocrAcc = 93.42;
      let paddleocrAcc = 96.15;

      // Extract details dynamically based on filename to simulate different types of files
      if (fileName.includes('tamper') || fileName.includes('log')) {
        text = "CONFIDENTIAL STAFF RECORDS. Employee Identifier: FNS-993. Clearance Rank: Level 4. Last modified date: 2026-07-30. Account balances cleared: $142,390. Server database connection ports: 5432, 8080. SQL query returned: 12 table records deleted.";
        numbers = ["993", "4", "142,390", "5432", "8080", "12"];
        dates = ["2026-07-30"];
        tables = [
          {
            headers: ["Forensic Key", "Extracted Value", "Confidence"],
            rows: [
              ["Employee ID", "FNS-993", "99.2%"],
              ["Clearance", "Level 4", "97.4%"],
              ["Balance", "$142,390", "98.1%"],
              ["Date", "2026-07-30", "99.8%"]
            ]
          }
        ];
      } else if (fileName.includes('exif')) {
        text = "TOP SECRET GPS COORDINATE VECTOR DETECTED. Reading system matrix: Exif geotags. Latitude: 28.6139, Longitude: 77.2090. Target name: New Delhi Workstation. Remote client sync date: 2026-07-28 08:12:00.";
        numbers = ["28.6139", "77.2090", "08:12:00"];
        dates = ["2026-07-28"];
        tables = [
          {
            headers: ["Forensic Parameter", "Extracted Coordinate", "Engine Confidence"],
            rows: [
              ["GPS Latitude", "28.6139", "99.4%"],
              ["GPS Longitude", "77.2090", "99.5%"],
              ["Sealed Time", "2026-07-28 08:12:00", "96.8%"]
            ]
          }
        ];
      } else {
        text = "EVIDENTIARY TEXT EXTRACTION FOR FORENSIGHT SYSTEMS. Log dump trace: SYSTEM COMPLETED ON 2026-08-01. Port check returned code 200. Open communication sockets: Port 8080, Port 22.";
        numbers = ["200", "8080", "22"];
        dates = ["2026-08-01"];
        tables = [
          {
            headers: ["Socket Descriptor", "Port Identifier", "Scan Status"],
            rows: [
              ["Web Service", "8080", "Open (98% conf)"],
              ["Secure Shell (SSH)", "22", "Open (99% conf)"]
            ]
          }
        ];
      }

      setOcrData({
        extractedText: text,
        extractedData: {
          tables,
          numbers,
          dates
        },
        comparison: {
          easyocr: {
            engineName: "EasyOCR (PyTorch)",
            time: easyocrTime,
            accuracy: easyocrAcc,
            badge: "EXCELLENT"
          },
          paddleocr: {
            engineName: "PaddleOCR (PaddlePaddle)",
            time: paddleocrTime,
            accuracy: paddleocrAcc,
            badge: "EXCELLENT"
          }
        }
      });
    }, 4500);
  };

  const copyText = () => {
    if (!ocrData) return;
    navigator.clipboard.writeText(ocrData.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Run Scan Banner */}
      {!ocrData && !scanning && (
        <div className="border border-dashed p-10 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 bg-card/20">
          <Search className="w-12 h-12 text-primary animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Multi-Engine OCR Processing Pending</h4>
            <p className="text-[10px] text-muted max-w-md">
              Run character recognition across parallel models (EasyOCR and PaddleOCR) to isolate Text strings, tabular data, numbers, and dates.
            </p>
          </div>
          <button
            onClick={runOCRScan}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-6 py-2.5 text-xs font-bold transition-all shadow hover:shadow-primary/20 flex items-center gap-1.5"
          >
            <Play size={12} fill="white" />
            Run Forensic OCR Scanner
          </button>
        </div>
      )}

      {/* Loading scanner screen */}
      {scanning && (
        <div className="border border-dashed p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 bg-card/25 animate-pulse">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold font-mono text-primary uppercase tracking-widest">OCR Pipeline Active</h4>
            <p className="text-[9px] font-mono text-muted">{scanProgress}</p>
          </div>
          {/* Mock progress line */}
          <div className="w-48 bg-border/40 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full animate-progress rounded-full" />
          </div>
        </div>
      )}

      {/* OCR scan results */}
      {ocrData && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Accuracy & Speed Comparison Matrices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PaddleOCR Card */}
            <div className="p-4 border rounded-2xl glassmorphism bg-success/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full filter blur-xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider">Engine 1 (Primary)</span>
                <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-mono font-bold text-[8px]">
                  {ocrData.comparison.paddleocr.badge}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-foreground">{ocrData.comparison.paddleocr.engineName}</h4>
              <div className="grid grid-cols-2 gap-4 mt-4 text-[10px] leading-relaxed">
                <div>
                  <span className="text-muted block font-semibold mb-0.5">INFERENCE SPEED</span>
                  <strong className="text-foreground text-xs">{(ocrData.comparison.paddleocr.time * 1000).toFixed(0)} ms</strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5">ACCURACY RATING</span>
                  <strong className="text-foreground text-xs">{ocrData.comparison.paddleocr.accuracy}%</strong>
                </div>
              </div>
            </div>

            {/* EasyOCR Card */}
            <div className="p-4 border rounded-2xl glassmorphism bg-primary/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full filter blur-xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Engine 2 (Secondary)</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono font-bold text-[8px]">
                  {ocrData.comparison.easyocr.badge}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-foreground">{ocrData.comparison.easyocr.engineName}</h4>
              <div className="grid grid-cols-2 gap-4 mt-4 text-[10px] leading-relaxed">
                <div>
                  <span className="text-muted block font-semibold mb-0.5">INFERENCE SPEED</span>
                  <strong className="text-foreground text-xs">{(ocrData.comparison.easyocr.time * 1000).toFixed(0)} ms</strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5">ACCURACY RATING</span>
                  <strong className="text-foreground text-xs">{ocrData.comparison.easyocr.accuracy}%</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Text and Entities display tabs container */}
          <div className="border rounded-2xl glassmorphism p-5 space-y-4">
            
            {/* Text header & copy action */}
            <div className="flex items-center justify-between border-b pb-3 border-border/20">
              <h3 className="text-xs uppercase font-bold tracking-wider text-primary flex items-center gap-1.5">
                <FileText size={14} />
                Extracted Text Segment
              </h3>
              <button 
                onClick={copyText}
                className="px-2.5 py-1 text-[9px] border rounded bg-background/50 hover:bg-background/80 text-muted transition-colors flex items-center gap-1 font-bold"
              >
                {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>

            {/* Extracted block */}
            <p className="text-[11px] leading-relaxed text-foreground bg-background/50 p-4 rounded-xl font-mono border border-border/10 select-all">
              {ocrData.extractedText}
            </p>

            {/* Entities extracted sub-grids (Tables, Numbers, Dates) */}
            <div className="space-y-4 pt-2">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Numbers */}
                <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <BarChart3 size={11} className="text-primary" />
                    Isolated Numbers
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.numbers.map((num, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border bg-background/50 font-mono text-[9px] text-foreground font-bold">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <Calendar size={11} className="text-primary" />
                    Isolated Dates
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.dates.map((dt, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-primary/20 bg-primary/5 font-mono text-[9px] text-primary font-bold flex items-center gap-1">
                        <Calendar size={8} />
                        {dt}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Table Data Extraction */}
              {ocrData.extractedData.tables.map((table, tIdx) => (
                <div key={tIdx} className="border rounded-xl overflow-hidden text-[9px]">
                  <div className="bg-border/20 px-3 py-1.5 border-b font-bold text-[9px] uppercase tracking-wider text-muted flex items-center gap-1">
                    <Database size={11} className="text-primary" />
                    Tabular Grid Matrix Extraction
                  </div>
                  <table className="w-full text-left border-collapse font-mono">
                    <thead>
                      <tr className="bg-background/40 border-b text-muted font-bold">
                        {table.headers.map((h, i) => (
                          <th key={i} className="p-2 border-r last:border-r-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b last:border-b-0 hover:bg-background/20 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 border-r last:border-r-0">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            </div>

            {/* Reset Button */}
            <div className="pt-2 text-right">
              <button 
                onClick={() => setOcrData(null)}
                className="text-muted hover:text-foreground text-[9px] font-bold underline"
              >
                Clear scan parameters
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

const EvidenceViewer = () => {
  const { caseEvidence } = useProject();
  const [selectedFileId, setSelectedFileId] = useState(caseEvidence[0]?.id || '');
  const [viewMode, setViewMode] = useState('STANDARD'); // STANDARD, HEX, METADATA, OCR
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
          className="bg-background border rounded-lg px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all max-w-xs font-semibold"
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
                  <span className="font-extrabold text-foreground">{(selectedFile.fileSize / (1024 * 1024)).toFixed(3)} MB</span>
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
                    <div key={idx} className="p-2.5 border border-danger/20 bg-danger/5 rounded-lg text-[9px] text-danger leading-relaxed animate-fade-in">
                      <strong className="block uppercase font-bold mb-0.5">{anom.type}</strong>
                      {anom.message}
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-success/5 border border-success/20 rounded-lg text-[10px] text-success leading-relaxed flex items-center gap-1.5 animate-fade-in">
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
                <button
                  onClick={() => setViewMode('OCR')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${
                    viewMode === 'OCR' ? 'bg-primary text-white' : 'text-muted hover:bg-border/30 hover:text-foreground'
                  }`}
                >
                  <Search size={12} className="inline mr-1" /> OCR Scanner
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
                    <div className="border rounded-xl overflow-hidden font-mono text-[10px] bg-card/40 animate-fade-in">
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
                    <div className="space-y-4 animate-fade-in">
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
                          File data dump parameters loaded. Sockets directory check found parameters: [audit_ledgers, accounts_details, system_configs, user_sessions]. Rows parsed: 194. Integrity index: 1.0. Flagged updates: 12 elements.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Mode 2: Hex dump view */}
              {viewMode === 'HEX' && (
                <div className="space-y-4 font-mono text-[11px] bg-slate-900 text-slate-350 p-4 rounded-xl shadow-inner border border-slate-800 animate-fade-in">
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

              {/* Mode 3: OCR Engine Comparison view */}
              {viewMode === 'OCR' && (
                <EvidenceOCRPanel selectedFile={selectedFile} />
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
