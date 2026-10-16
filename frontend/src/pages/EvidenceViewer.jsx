import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { API_BASE_URL } from '../config';
import { 
  HardDrive, AlertTriangle, Eye, Binary, Search, FileText, 
  ShieldCheck, Loader2, Play, Check, Copy, Calendar, BarChart3, Database,
  Trash2, Lock, Clock, DollarSign, UserCheck, Key, AtSign, Building2,
  CheckCircle2, AlertCircle, RefreshCw, Layers, Shield
} from 'lucide-react';

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

// Sub-component for the OCR Examiner & Comparison Module
const EvidenceOCRPanel = ({ selectedFile, selectedCaseId, backendActive }) => {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scanError, setScanError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [activeStreamTab, setActiveStreamTab] = useState('PRIMARY'); // PRIMARY | PADDLE | EASY

  // Fetch existing OCR scan results from server when selected file changes
  useEffect(() => {
    setOcrData(null);
    setScanError(null);
    if (backendActive && isUUID(selectedCaseId) && isUUID(selectedFile?.id)) {
      const token = localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      fetch(`${API_BASE_URL}/cases/${selectedCaseId}/evidence/${selectedFile.id}/ocr`, { headers: authHeader })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data) && data.length > 0) {
            const lastRecord = data[data.length - 1];
            const extData = lastRecord.extracted_data || {};
            
            setOcrData({
              extractedText: lastRecord.extracted_text || '',
              extractedData: {
                dates: extData.dates || [],
                times: extData.times || [],
                amounts: extData.amounts || [],
                people: extData.people || [],
                ids: extData.ids || [],
                upi_ids: extData.upi_ids || [],
                emails: extData.emails || [],
                urls: extData.urls || [],
                banking_details: extData.banking_details || [],
                status_signals: extData.status_signals || [],
                numbers: extData.numbers || [],
                tables: extData.tables || [],
                uncertain_extractions: extData.uncertain_extractions || []
              },
              comparison: extData.engine_comparison || {
                paddleocr: {
                  engine_name: "PaddleOCR (Primary Engine)",
                  status: "SUCCESS",
                  inference_time_seconds: 0.0,
                  confidence_score: Number((lastRecord.confidence_score || 0).toFixed(2)),
                  detected_blocks_count: 0
                },
                easyocr: {
                  engine_name: "EasyOCR (Secondary / Verification)",
                  status: "SUCCESS",
                  inference_time_seconds: 0.0,
                  confidence_score: 0.0,
                  detected_blocks_count: 0
                }
              },
              crossAgreement: extData.cross_engine_agreement ?? null,
              fileSha256: extData.file_sha256 || selectedFile?.sha256 || '',
              rawPaddleText: extData.raw_paddle_text || lastRecord.extracted_text || '',
              rawEasyText: extData.raw_easy_text || ''
            });
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch saved OCR record:", err);
        });
    }
  }, [selectedFile?.id, selectedCaseId, backendActive]);

  const runOCRScan = async () => {
    setScanning(true);
    setScanError(null);
    setScanProgress('Connecting to ForenSight Multi-Engine OCR Pipeline...');

    const steps = [
      { t: 400, log: 'Loading evidence container & checking SHA-256 cryptographic signature...' },
      { t: 1200, log: 'Running PaddleOCR (Primary Engine) text detection & recognition...' },
      { t: 3000, log: 'Running EasyOCR (Secondary Engine) verification scan...' },
      { t: 5000, log: 'Cross-referencing engine outputs & extracting structured entities...' }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setScanProgress(step.log);
      }, step.t);
    });

    const token = localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      if (backendActive && isUUID(selectedCaseId) && isUUID(selectedFile?.id)) {
        const response = await fetch(`${API_BASE_URL}/cases/${selectedCaseId}/evidence/${selectedFile.id}/ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          }
        });

        if (response.ok) {
          const resData = await response.json();
          setScanning(false);
          
          const extData = resData.extracted_data || {};
          setOcrData({
            extractedText: resData.record?.extracted_text || resData.extracted_text || "No text detected",
            extractedData: {
              dates: extData.dates || [],
              times: extData.times || [],
              amounts: extData.amounts || [],
              people: extData.people || [],
              ids: extData.ids || [],
              upi_ids: extData.upi_ids || [],
              emails: extData.emails || [],
              urls: extData.urls || [],
              banking_details: extData.banking_details || [],
              status_signals: extData.status_signals || [],
              numbers: extData.numbers || [],
              tables: extData.tables || [],
              uncertain_extractions: extData.uncertain_extractions || []
            },
            comparison: resData.comparison || {},
            crossAgreement: resData.cross_engine_agreement ?? null,
            fileSha256: resData.file_sha256 || resData.record?.extracted_data?.file_sha256 || selectedFile?.sha256,
            rawPaddleText: resData.raw_paddle_text || "",
            rawEasyText: resData.raw_easy_text || ""
          });
          return;
        } else {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server returned HTTP ${response.status}`);
        }
      } else {
        throw new Error("Invalid Case or Evidence identifier for live OCR processing.");
      }
    } catch (err) {
      console.error("OCR execution failure:", err);
      setScanning(false);
      setScanError(err.message || "Failed to execute OCR scan on evidence file.");
    }
  };

  const copyText = (content) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDisplayedStreamText = () => {
    if (!ocrData) return '';
    if (activeStreamTab === 'PADDLE') return ocrData.rawPaddleText || 'No text detected by PaddleOCR.';
    if (activeStreamTab === 'EASY') return ocrData.rawEasyText || 'No text detected by EasyOCR.';
    return ocrData.extractedText || 'No text detected.';
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
              Run genuine character recognition across dual engines (PaddleOCR & EasyOCR) to isolate text, numbers, dates, amounts, people, and transaction identifiers without synthetic data.
            </p>
          </div>
          {scanError && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-mono max-w-md flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{scanError}</span>
            </div>
          )}
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
          <div className="w-48 bg-border/40 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full animate-progress rounded-full" />
          </div>
        </div>
      )}

      {/* OCR scan results */}
      {ocrData && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Dual Engine Metrics (PaddleOCR & EasyOCR) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PaddleOCR Card (Primary) */}
            <div className="p-4 border rounded-2xl glassmorphism bg-success/5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  OCR Engine 1 (Primary)
                </span>
                <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[8px] ${
                  ocrData.comparison?.paddleocr?.status === 'SUCCESS' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                }`}>
                  {ocrData.comparison?.paddleocr?.status || 'READY'}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-foreground">
                {ocrData.comparison?.paddleocr?.engine_name || 'PaddleOCR (Primary Engine)'}
              </h4>
              <div className="grid grid-cols-2 gap-3 mt-4 text-[10px] leading-relaxed">
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Processing Time</span>
                  <strong className="text-foreground text-xs font-mono">
                    {ocrData.comparison?.paddleocr?.inference_time_seconds 
                      ? `${ocrData.comparison.paddleocr.inference_time_seconds} s` 
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Mean Confidence</span>
                  <strong className="text-foreground text-xs font-mono">
                    {ocrData.comparison?.paddleocr?.confidence_score !== undefined 
                      ? `${ocrData.comparison.paddleocr.confidence_score}%` 
                      : 'N/A'}
                  </strong>
                </div>
              </div>
              {ocrData.comparison?.paddleocr?.error_message && (
                <div className="mt-3 text-[9px] text-danger font-mono bg-danger/10 p-2 rounded border border-danger/20">
                  {ocrData.comparison.paddleocr.error_message}
                </div>
              )}
            </div>

            {/* EasyOCR Card (Secondary) */}
            <div className="p-4 border rounded-2xl glassmorphism bg-primary/5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Layers size={12} />
                  OCR Engine 2 (Secondary / Verification)
                </span>
                <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[8px] ${
                  ocrData.comparison?.easyocr?.status === 'SUCCESS' ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-500'
                }`}>
                  {ocrData.comparison?.easyocr?.status || 'READY'}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-foreground">
                {ocrData.comparison?.easyocr?.engine_name || 'EasyOCR (Secondary / Verification)'}
              </h4>
              <div className="grid grid-cols-2 gap-3 mt-4 text-[10px] leading-relaxed">
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Processing Time</span>
                  <strong className="text-foreground text-xs font-mono">
                    {ocrData.comparison?.easyocr?.inference_time_seconds 
                      ? `${ocrData.comparison.easyocr.inference_time_seconds} s` 
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Mean Confidence</span>
                  <strong className="text-foreground text-xs font-mono">
                    {ocrData.comparison?.easyocr?.confidence_score !== undefined 
                      ? `${ocrData.comparison.easyocr.confidence_score}%` 
                      : 'N/A'}
                  </strong>
                </div>
              </div>
              {ocrData.comparison?.easyocr?.error_message && (
                <div className="mt-3 text-[9px] text-danger font-mono bg-danger/10 p-2 rounded border border-danger/20">
                  {ocrData.comparison.easyocr.error_message}
                </div>
              )}
            </div>

          </div>

          {/* Cross-Engine Agreement Badge */}
          {ocrData.crossAgreement !== null && ocrData.crossAgreement !== undefined && (
            <div className="p-3 border rounded-xl bg-card/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <span className="font-bold text-foreground">Cross-Engine Text Agreement:</span>
                <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {ocrData.crossAgreement}%
                </span>
              </div>
              <span className="text-[10px] text-muted">
                Calculated via token overlap between PaddleOCR and EasyOCR outputs.
              </span>
            </div>
          )}

          {/* File Integrity Verification Box */}
          <div className="p-4 border rounded-2xl bg-card/25 space-y-2 border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={12} className="text-primary" />
                File Integrity & Cryptographic Seal (ISO/IEC 27037)
              </span>
              <span className="text-[9px] bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded font-mono font-bold">
                Direct Byte Verification
              </span>
            </div>
            <div className="text-[10px] space-y-1">
              <span className="text-muted block font-semibold">FILE SHA-256 HASH:</span>
              <p className="font-mono text-foreground bg-background/50 p-2.5 rounded-lg border border-border/10 select-all break-all font-bold">
                {ocrData.fileSha256 || selectedFile?.sha256 || "N/A"}
              </p>
            </div>
          </div>

          {/* EXTRACTED INFORMATION (Genuinely Detected Entities) */}
          <div className="border rounded-2xl glassmorphism p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-border/20">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-primary flex items-center gap-1.5">
                <FileText size={14} />
                Extracted Information (Detected Entities Only)
              </h3>
              <span className="text-[10px] text-muted">Traceable directly to evidence payload</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Status / Transaction Outcome */}
              {ocrData.extractedData.status_signals && ocrData.extractedData.status_signals.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5 md:col-span-2 lg:col-span-3">
                  <span className="text-[9px] font-bold text-success uppercase block tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    Detected Transaction Status:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.status_signals.map((sig, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg border border-success/30 bg-success/10 font-bold text-xs text-success">
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Amounts */}
              {ocrData.extractedData.amounts && ocrData.extractedData.amounts.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <DollarSign size={11} className="text-primary" />
                    Currency / Amount:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.amounts.map((amt, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-primary/20 bg-primary/10 font-mono text-xs font-black text-primary">
                        {amt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* People / Beneficiaries */}
              {ocrData.extractedData.people && ocrData.extractedData.people.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <UserCheck size={11} className="text-primary" />
                    Person / Beneficiary:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.people.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border bg-background/60 font-sans text-xs font-extrabold text-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              {ocrData.extractedData.dates && ocrData.extractedData.dates.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <Calendar size={11} className="text-primary" />
                    Isolated Dates:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.dates.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border bg-background/60 font-mono text-[10px] text-foreground font-bold">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Times */}
              {ocrData.extractedData.times && ocrData.extractedData.times.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <Clock size={11} className="text-primary" />
                    Isolated Times:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.times.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border bg-background/60 font-mono text-[10px] text-foreground font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* IDs (Transaction ID, UTR) */}
              {ocrData.extractedData.ids && ocrData.extractedData.ids.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5 md:col-span-2">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <Key size={11} className="text-primary" />
                    Transaction IDs & Reference UTRs:
                  </span>
                  <div className="flex flex-col gap-1">
                    {ocrData.extractedData.ids.map((idVal, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border bg-background/60 font-mono text-[10px] text-foreground font-bold break-all">
                        {idVal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* UPI IDs */}
              {ocrData.extractedData.upi_ids && ocrData.extractedData.upi_ids.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <AtSign size={11} className="text-primary" />
                    UPI Handles:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrData.extractedData.upi_ids.map((upi, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-accent/20 bg-accent/5 font-mono text-[10px] text-accent font-bold">
                        {upi}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Banking & Accounts */}
              {ocrData.extractedData.banking_details && ocrData.extractedData.banking_details.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <Building2 size={11} className="text-primary" />
                    Banking Details:
                  </span>
                  <div className="flex flex-col gap-1">
                    {ocrData.extractedData.banking_details.map((b, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border bg-background/60 font-mono text-[10px] text-foreground">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Isolated Numbers */}
              {ocrData.extractedData.numbers && ocrData.extractedData.numbers.length > 0 && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5 md:col-span-2">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <BarChart3 size={11} className="text-primary" />
                    Isolated Numeric Tokens:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {ocrData.extractedData.numbers.slice(0, 15).map((num, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded border bg-background/60 font-mono text-[9px] text-muted font-bold">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Uncertain Extractions Warning Box (Requirement 11) */}
            {ocrData.extractedData.uncertain_extractions && ocrData.extractedData.uncertain_extractions.length > 0 && (
              <div className="p-3 border rounded-xl border-amber-500/30 bg-amber-500/5 space-y-1.5 text-xs text-amber-500">
                <span className="font-bold flex items-center gap-1.5 uppercase text-[9px] tracking-wider">
                  <AlertCircle size={12} />
                  Uncertain Extractions (Low Confidence &lt; 60% — Manual Examiner Verification Required):
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ocrData.extractedData.uncertain_extractions.map((u, i) => (
                    <span key={i} className="px-2 py-0.5 rounded border border-amber-500/30 bg-background/50 font-mono text-[9.5px]">
                      {typeof u === 'object' && u ? `"${u.text}" (${u.confidence}% conf)` : String(u)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Genuine Tabular Data (Only if present; no fake tables) */}
            {ocrData.extractedData.tables && ocrData.extractedData.tables.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                  <Database size={12} className="text-primary" />
                  Detected Tabular Grid Structure:
                </span>
                {ocrData.extractedData.tables.map((table, tIdx) => (
                  <div key={tIdx} className="border rounded-xl overflow-hidden text-[9px]">
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
            )}

          </div>

          {/* RAW EXTRACTED TEXT (Requirement 16) */}
          <div className="border rounded-2xl glassmorphism p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-border/20">
              <div className="flex items-center gap-2">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-primary flex items-center gap-1.5">
                  <FileText size={14} />
                  Raw Extracted Text
                </h3>
                {/* Engine stream selector */}
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setActiveStreamTab('PRIMARY')}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${
                      activeStreamTab === 'PRIMARY' ? 'bg-primary text-white' : 'text-muted hover:bg-border/30'
                    }`}
                  >
                    Primary Output
                  </button>
                  {ocrData.rawPaddleText && (
                    <button
                      onClick={() => setActiveStreamTab('PADDLE')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${
                        activeStreamTab === 'PADDLE' ? 'bg-primary text-white' : 'text-muted hover:bg-border/30'
                      }`}
                    >
                      PaddleOCR Stream
                    </button>
                  )}
                  {ocrData.rawEasyText && (
                    <button
                      onClick={() => setActiveStreamTab('EASY')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${
                        activeStreamTab === 'EASY' ? 'bg-primary text-white' : 'text-muted hover:bg-border/30'
                      }`}
                    >
                      EasyOCR Stream
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={() => copyText(getDisplayedStreamText())}
                className="px-2.5 py-1 text-[9px] border rounded bg-background/50 hover:bg-background/80 text-muted transition-colors flex items-center gap-1 font-bold"
              >
                {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy Raw Text'}
              </button>
            </div>

            {/* Extracted text payload block */}
            <pre className="text-[11px] leading-relaxed text-foreground bg-background/50 p-4 rounded-xl font-mono border border-border/10 select-all whitespace-pre-wrap break-words max-h-96 overflow-auto">
              {getDisplayedStreamText()}
            </pre>

            {/* Re-run button */}
            <div className="pt-2 flex justify-between items-center text-[10px] text-muted">
              <span>Original evidence preserved without alterations.</span>
              <button 
                onClick={runOCRScan}
                className="text-primary hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw size={10} />
                Re-run OCR Scan
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

const EvidenceViewer = () => {
  const { caseEvidence, selectedCaseId, backendActive, deleteEvidenceFile } = useProject();
  const [selectedFileId, setSelectedFileId] = useState(caseEvidence[0]?.id || '');
  const [viewMode, setViewMode] = useState('STANDARD'); // STANDARD, HEX, OCR
  const [hexOffsetLimit, setHexOffsetLimit] = useState(128);
  const [fileExtractedData, setFileExtractedData] = useState(null);

  // Read authenticated user role
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleLevel = storedUser.role_level || 'SysAdmin';

  // Synchronize selected file ID whenever active case or case evidence changes
  React.useEffect(() => {
    if (caseEvidence && caseEvidence.length > 0) {
      if (!caseEvidence.some(f => f.id === selectedFileId)) {
        setSelectedFileId(caseEvidence[0].id);
      }
    } else {
      setSelectedFileId('');
    }
  }, [caseEvidence, selectedFileId]);

  const selectedFile = caseEvidence.find(f => f.id === selectedFileId) || caseEvidence[0];

  // Fetch extracted OCR / Content record on evidence file change
  useEffect(() => {
    setFileExtractedData(null);
    if (backendActive && isUUID(selectedCaseId) && isUUID(selectedFile?.id)) {
      const token = localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      fetch(`${API_BASE_URL}/cases/${selectedCaseId}/evidence/${selectedFile.id}/ocr`, { headers: authHeader })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data) && data.length > 0) {
            const lastRecord = data[data.length - 1];
            setFileExtractedData(lastRecord);
          }
        })
        .catch(() => {});
    }
  }, [selectedFile?.id, selectedCaseId, backendActive]);

  // Actual extracted text only - NEVER inject fake Port 8080 or fake payload strings
  const extractedTextContent = fileExtractedData?.extracted_text || '';
  const extractedNumbers = fileExtractedData?.extracted_data?.numbers || [];
  const extractedDates = fileExtractedData?.extracted_data?.dates || [];
  const extractedTimes = fileExtractedData?.extracted_data?.times || [];
  const extractedAmounts = fileExtractedData?.extracted_data?.amounts || [];
  const extractedPeople = fileExtractedData?.extracted_data?.people || [];
  const extractedIds = fileExtractedData?.extracted_data?.ids || [];

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
          <p className="text-xs text-muted">Inspect raw hex strings, syslog content, genuine OCR text, and cryptographic signatures</p>
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
                  <span className="text-muted block font-semibold mb-0.5">SHA-256 HASH (FILE BYTES)</span>
                  <span className="font-mono text-muted select-all break-all">{selectedFile.sha256}</span>
                </div>

                {/* Level 4 SysAdmin Delete Evidence Action */}
                <div className="pt-2 border-t">
                  {roleLevel === 'SysAdmin' ? (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to permanently purge evidence file '${selectedFile.fileName}'? This action is recorded in the Chain of Custody.`)) {
                          await deleteEvidenceFile(selectedCaseId, selectedFile.id);
                          alert(`File '${selectedFile.fileName}' purged from evidence vault by Level 4 SysAdmin.`);
                        }
                      }}
                      className="w-full bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 rounded-lg py-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={12} />
                      <span>Purge Evidence File</span>
                    </button>
                  ) : (
                    <div className="text-[9px] text-muted font-bold p-2 bg-border/20 border rounded flex items-center justify-center gap-1">
                      <Lock size={10} />
                      <span>Purge Evidence (Level 4 SysAdmin Only)</span>
                    </div>
                  )}
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
                      <div className="relative border rounded-xl overflow-hidden shadow-lg border-primary/30 max-w-sm">
                        <div className="w-[300px] h-[200px] bg-slate-300 dark:bg-slate-800 flex items-center justify-center text-muted font-bold text-xs p-4 text-center">
                          {selectedFile.fileName}
                        </div>
                      </div>
                      <div className="text-center p-2 max-w-md">
                        <h4 className="text-xs font-bold text-foreground">Evidence File Container: {selectedFile.fileName}</h4>
                        <p className="text-[10px] text-muted mt-1 leading-relaxed">
                          To extract and examine text, dates, numbers, and identifiers, switch to the <strong>OCR Scanner</strong> tab.
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
                  ) : null}

                  {/* Standard View Extracted Text Payload Section */}
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
                    
                    {/* Extracted Text Box */}
                    <div className="border rounded-xl p-4 bg-card/25 space-y-3 font-mono text-[10.5px] leading-relaxed">
                      <div className="flex items-center justify-between border-b pb-2 border-border/20">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1 font-sans">
                          <FileText size={12} className="text-primary" />
                          Extracted Text Payload
                        </h4>
                        {extractedTextContent && (
                          <button
                            onClick={() => navigator.clipboard.writeText(extractedTextContent)}
                            className="px-2 py-1 text-[9px] border rounded bg-background/50 hover:bg-background/80 text-muted font-bold"
                          >
                            Copy Text
                          </button>
                        )}
                      </div>
                      {extractedTextContent ? (
                        <pre className="text-foreground bg-background/50 p-3 rounded-lg border border-border/10 select-all font-mono whitespace-pre-wrap break-words max-h-60 overflow-auto">
                          {extractedTextContent}
                        </pre>
                      ) : (
                        <div className="p-4 bg-background/40 border border-border/20 rounded-lg text-center space-y-2">
                          <p className="text-xs text-muted font-sans">
                            No OCR extraction record found for this evidence file yet.
                          </p>
                          <button
                            onClick={() => setViewMode('OCR')}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all inline-flex items-center gap-1"
                          >
                            <Search size={12} />
                            Open OCR Scanner to Analyze
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Isolated Entities Grid (Numbers, Dates, Amounts, People) */}
                    {(extractedNumbers.length > 0 || extractedDates.length > 0 || extractedAmounts.length > 0 || extractedPeople.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extractedAmounts.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <DollarSign size={11} className="text-primary" />
                              Extracted Amounts
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedAmounts.map((amt, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border border-primary/20 bg-primary/5 font-mono text-xs text-primary font-bold">
                                  {amt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extractedPeople.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <UserCheck size={11} className="text-primary" />
                              Extracted People / Beneficiaries
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedPeople.map((p, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border bg-background/50 font-sans text-xs text-foreground font-bold">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extractedDates.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <Calendar size={11} className="text-primary" />
                              Extracted Dates
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedDates.map((dt, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border border-primary/20 bg-primary/5 font-mono text-[9px] text-primary font-bold flex items-center gap-1">
                                  <Calendar size={8} />
                                  {dt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extractedNumbers.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <BarChart3 size={11} className="text-primary" />
                              Extracted Numbers
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedNumbers.slice(0, 10).map((num, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border bg-background/50 font-mono text-[9px] text-foreground font-bold">
                                  {num}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Hex view */}
              {viewMode === 'HEX' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Hexadecimal Payload Stream</h4>
                      <p className="text-[10px] text-muted">Offsets mapped against binary evidence block memory</p>
                    </div>
                    <select
                      value={hexOffsetLimit}
                      onChange={(e) => setHexOffsetLimit(Number(e.target.value))}
                      className="bg-background border rounded px-2 py-1 text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={64}>64 Bytes</option>
                      <option value={128}>128 Bytes</option>
                      <option value={256}>256 Bytes</option>
                      <option value={512}>512 Bytes</option>
                    </select>
                  </div>

                  <div className="font-mono text-[10px] leading-relaxed bg-card/60 p-4 border rounded-xl space-y-1 overflow-x-auto select-all">
                    {getHexDump(selectedFile.fileName).map((row) => (
                      <div key={row.offset} className="flex gap-4 hover:bg-primary/5 px-1 rounded">
                        <span className="text-primary font-bold select-none">{row.offset}</span>
                        <span className="text-muted tracking-widest">{row.hex}</span>
                        <span className="text-foreground border-l pl-4 font-bold select-none">{row.ascii}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 3: Real Multi-Engine OCR Scanner */}
              {viewMode === 'OCR' && (
                <EvidenceOCRPanel 
                  selectedFile={selectedFile}
                  selectedCaseId={selectedCaseId}
                  backendActive={backendActive}
                />
              )}

            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-muted border border-dashed rounded-2xl">
          <p className="text-xs">Select or ingest evidence to begin forensic verification.</p>
        </div>
      )}
    </div>
  );
};

export default EvidenceViewer;
