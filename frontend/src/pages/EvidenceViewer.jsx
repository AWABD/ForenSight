import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { API_BASE_URL } from '../config';
import { 
  HardDrive, AlertTriangle, Eye, Binary, Search, FileText, 
  ShieldCheck, Loader2, Play, Check, Copy, Calendar, BarChart3, Database,
  Trash2, Lock, Clock, DollarSign, UserCheck, Key, AtSign, Building2,
  CheckCircle2, AlertCircle, RefreshCw, Layers, Shield, ArrowRight
} from 'lucide-react';

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
const isValidCaseIdentifier = (str) => typeof str === 'string' && (isUUID(str) || /^c\d+$/i.test(str.trim()) || /^FS-\d{4}-\d+$/i.test(str.trim()));

const isImageEvidence = (file) => {
  if (!file) return false;
  const ft = (file.fileType || '').toLowerCase();
  const fn = (file.fileName || '').toLowerCase();
  return ft.startsWith('image/') || ft.includes('image') || /\.(jpg|jpeg|png|bmp|webp|tiff|gif)$/i.test(fn);
};

const isTextEvidence = (file) => {
  if (!file) return false;
  const ft = (file.fileType || '').toLowerCase();
  const fn = (file.fileName || '').toLowerCase();
  return ft.startsWith('text/') || ft.includes('log') || ft.includes('json') || ft.includes('csv') || /\.(txt|log|csv|json|sql|xml|html|md|eml|msg)$/i.test(fn);
};

const getEngineBadgeStyle = (status) => {
  switch (status) {
    case 'SUCCESS':
      return 'bg-success/15 text-success';
    case 'DEFERRED':
      return 'bg-primary/15 text-primary';
    case 'NOT_AVAILABLE':
    case 'NOT_CONFIGURED':
    case 'LEGACY_RECORD':
      return 'bg-amber-500/15 text-amber-500';
    default:
      return 'bg-danger/15 text-danger';
  }
};

// Format saved OCR DB record into unified UI state
const normalizeSavedOcrRecord = (lastRecord, fallbackSha256 = '') => {
  const extData = lastRecord.extracted_data || {};
  const hasStoredComparison = Boolean(extData.engine_comparison);

  const comparison = extData.engine_comparison || {
    paddleocr: {
      engine_name: "PaddleOCR / Primary Engine",
      status: lastRecord.extracted_text ? "SUCCESS" : "LEGACY_RECORD",
      inference_time_seconds: null,
      confidence_score: typeof lastRecord.confidence_score === 'number'
        ? Number(lastRecord.confidence_score.toFixed(2))
        : null,
      detected_blocks_count: Array.isArray(lastRecord.bounding_boxes) ? lastRecord.bounding_boxes.length : 0
    },
    easyocr: {
      engine_name: "EasyOCR (Secondary / Verification)",
      status: hasStoredComparison ? "NOT_AVAILABLE" : "LEGACY_RECORD",
      inference_time_seconds: null,
      confidence_score: null,
      detected_blocks_count: 0,
      error_message: "Run Forensic OCR Scanner to capture full dual-engine telemetry."
    }
  };

  return {
    extractedText: lastRecord.extracted_text || '',
    mediaClassification: extData.media_classification || null,
    threatIntelligence: extData.threat_intelligence || null,
    threats: extData.threats || [],
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
      threats: extData.threats || [],
      uncertain_extractions: extData.uncertain_extractions || []
    },
    comparison,
    crossAgreement: extData.cross_engine_agreement ?? null,
    fileSha256: extData.file_sha256 || fallbackSha256 || '',
    rawPaddleText: extData.raw_paddle_text || lastRecord.extracted_text || '',
    rawEasyText: extData.raw_easy_text || ''
  };
};

// Sub-component for the OCR Examiner & Comparison Module
const EvidenceOCRPanel = ({ selectedFile, selectedCaseId, backendActive, onOcrComplete }) => {
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scanError, setScanError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [activeStreamTab, setActiveStreamTab] = useState('PRIMARY'); // PRIMARY | PADDLE | EASY

  const selectedFileId = selectedFile?.id;
  const selectedFileSha256 = selectedFile?.sha256;

  // Fetch existing OCR scan results from server when selected file changes
  useEffect(() => {
    let cancelled = false;
    setOcrData(null);
    setScanError(null);
    setActiveStreamTab('PRIMARY');

    if (backendActive && isValidCaseIdentifier(selectedCaseId) && isUUID(selectedFileId)) {
      setLoadingSaved(true);
      const token = localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      fetch(`${API_BASE_URL}/cases/${selectedCaseId}/evidence/${selectedFileId}/ocr`, { headers: authHeader })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (cancelled) return;
          setLoadingSaved(false);
          if (data && Array.isArray(data) && data.length > 0) {
            const lastRecord = data[data.length - 1];
            setOcrData(normalizeSavedOcrRecord(lastRecord, selectedFileSha256));
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadingSaved(false);
          console.warn("Failed to fetch saved OCR record:", err);
        });
    } else {
      setLoadingSaved(false);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedFileId, selectedFileSha256, selectedCaseId, backendActive]);

  const runOCRScan = async () => {
    setScanning(true);
    setScanError(null);
    setScanProgress('Connecting to ForenSight Multi-Engine OCR Pipeline...');

    const steps = [
      { t: 400, log: 'Loading evidence container & checking SHA-256 cryptographic signature...' },
      { t: 1200, log: 'Running Primary OCR (PaddleOCR / RapidOCR ONNX) text detection & recognition...' },
      { t: 3000, log: 'Running EasyOCR (Secondary Engine) verification scan...' },
      { t: 5000, log: 'Cross-referencing engine outputs & extracting structured entities...' }
    ];

    const timers = steps.map((step) =>
      setTimeout(() => {
        setScanProgress(step.log);
      }, step.t)
    );

    const token = localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      if (backendActive && isValidCaseIdentifier(selectedCaseId) && isUUID(selectedFile?.id)) {
        const response = await fetch(`${API_BASE_URL}/cases/${selectedCaseId}/evidence/${selectedFile.id}/ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          }
        });

        timers.forEach(clearTimeout);

        if (response.ok) {
          const resData = await response.json();
          setScanning(false);
          
          const extData = resData.extracted_data || {};
          const nextData = {
            extractedText: resData.record?.extracted_text || resData.extracted_text || "No text detected",
            mediaClassification: extData.media_classification || null,
            threatIntelligence: extData.threat_intelligence || null,
            threats: extData.threats || [],
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
              threats: extData.threats || [],
              uncertain_extractions: extData.uncertain_extractions || []
            },
            comparison: resData.comparison || {},
            crossAgreement: resData.cross_engine_agreement ?? null,
            fileSha256: resData.file_sha256 || resData.record?.extracted_data?.file_sha256 || selectedFile?.sha256,
            rawPaddleText: resData.raw_paddle_text || "",
            rawEasyText: resData.raw_easy_text || ""
          };
          setOcrData(nextData);
          if (onOcrComplete && resData.record) {
            onOcrComplete(resData.record);
          }
          return;
        } else {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server returned HTTP ${response.status}`);
        }
      } else {
        timers.forEach(clearTimeout);
        throw new Error("Live backend authentication is required to execute real server OCR.");
      }
    } catch (err) {
      timers.forEach(clearTimeout);
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
    if (activeStreamTab === 'PADDLE') return ocrData.rawPaddleText || 'No text detected by Primary Engine.';
    if (activeStreamTab === 'EASY') return ocrData.rawEasyText || 'No text detected by EasyOCR.';
    return ocrData.extractedText || 'No text detected.';
  };

  const displayedText = getDisplayedStreamText();
  const displayedLineCount = displayedText ? displayedText.split(/\r?\n/).filter(l => l.trim()).length : 0;
  const paddleStatus = ocrData?.comparison?.paddleocr?.status || 'READY';
  const easyStatus = ocrData?.comparison?.easyocr?.status || 'READY';

  return (
    <div className="space-y-6">

      {/* Loading saved record */}
      {loadingSaved && !scanning && !ocrData && (
        <div className="border border-dashed p-10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-card/20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-mono text-muted">Checking database for saved OCR extraction results...</p>
        </div>
      )}
      
      {/* Run Scan Banner */}
      {!loadingSaved && !ocrData && !scanning && (
        <div className="border border-dashed p-10 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 bg-card/20">
          <Search className="w-12 h-12 text-primary animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Multi-Engine OCR Processing Pending</h4>
            <p className="text-[10px] text-muted max-w-md">
              Run genuine character recognition across dual engines (PaddleOCR / RapidOCR &amp; EasyOCR) to isolate text, numbers, dates, amounts, people, and transaction identifiers without synthetic data.
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
      {ocrData && !scanning && (
        <div className="space-y-6 animate-fade-in">

          {scanError && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-mono flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Engine Unavailable Warning Banner */}
          {ocrData.mediaClassification?.media_class === 'OCR_ENGINE_UNAVAILABLE' && (
            <div className="p-4 border-2 border-amber-500/40 bg-amber-500/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded uppercase">
                  OCR ENGINE EXECUTION INCOMPLETE
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                  {ocrData.mediaClassification.ocr_explanation || ocrData.extractedText}
                </p>
              </div>
              <button
                onClick={runOCRScan}
                className="shrink-0 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Retry OCR Scan
              </button>
            </div>
          )}

          {/* Quick-Ingest Verification Prompt Banner */}
          {easyStatus === 'DEFERRED' && (
            <div className="p-3.5 border rounded-xl bg-primary/10 border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-primary uppercase text-[10px] tracking-wider block">
                  Quick-Ingest Auto-OCR Completed (Engine 1)
                </span>
                <p className="text-[11px] text-muted">
                  Initial text and entities were extracted automatically on upload. Run Dual-Engine Verification to execute EasyOCR cross-verification.
                </p>
              </div>
              <button
                onClick={runOCRScan}
                className="shrink-0 bg-primary hover:bg-primary-dark text-white rounded-lg px-3.5 py-2 text-[11px] font-bold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw size={12} />
                Run Dual-Engine Verification
              </button>
            </div>
          )}

          {/* Crime Scene Media Banner (Physical Evidence, Shooting, Weapons) */}
          {(ocrData.mediaClassification?.media_class === 'CRIME_SCENE_MEDIA' || selectedFile?.anomalies?.some(a => a.type === 'CRIME_SCENE_MEDIA')) && (
            <div className="p-4 border-2 border-danger/40 bg-danger/10 rounded-2xl flex items-start gap-3 shadow-sm">
              <AlertTriangle size={22} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-danger text-white font-black px-2 py-0.5 rounded uppercase">CRIME SCENE MEDIA</span>
                  <span className="text-xs font-bold text-danger">Physical Evidence (Non-Document Photograph)</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  This photograph represents physical crime scene evidence (e.g. suspected shooting, weapon, or violent incident). Optical Character Recognition (OCR) is specialized for text documents and receipts, and is not applicable to physical scene actions.
                </p>
              </div>
            </div>
          )}

          {/* Plain Text Document Banner */}
          {(ocrData.mediaClassification?.media_class === 'DIGITAL_TEXT_DOCUMENT' || selectedFile?.fileName?.match(/\.(txt|log|csv|md)$/i)) && (
            <div className="p-3.5 border rounded-xl bg-primary/10 border-primary/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <span className="font-bold text-foreground">Digital Plain Text Evidence</span>
              </div>
              <span className="text-[10px] text-muted">
                Direct text stream parsed natively. Standard image OCR bypassed.
              </span>
            </div>
          )}

          {/* Critical Threat Intelligence Alert Banner */}
          {((ocrData.threats && ocrData.threats.length > 0) || ocrData.threatIntelligence?.has_threats || selectedFile?.anomalies?.some(a => a.type === 'VIOLENT_THREAT_DETECTED')) && (
            <div className="p-4 border-2 border-rose-500/50 bg-rose-500/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded uppercase flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  CRITICAL FORENSIC THREAT DETECTED
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-500">Violent Intent / Contraband Identified</span>
              </div>
              <div className="space-y-2">
                {ocrData.threats && ocrData.threats.length > 0 ? (
                  ocrData.threats.map((threat, i) => (
                    <div key={i} className="p-2.5 bg-background/80 rounded-lg border border-rose-500/30 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-rose-600 text-[10px] uppercase">{threat.category} ({threat.tag})</span>
                        <span className="text-[9px] bg-rose-600/20 text-rose-600 font-mono font-bold px-1.5 py-0.5 rounded">{threat.severity}</span>
                      </div>
                      <p className="font-mono text-foreground text-[11px] select-all leading-relaxed">{threat.context}</p>
                    </div>
                  ))
                ) : (
                  selectedFile?.anomalies?.filter(a => a.type === 'VIOLENT_THREAT_DETECTED' || a.type === 'CRIME_SCENE_MEDIA' || a.type === 'WEAPON_CONTRABAND_FLAG').map((anom, i) => (
                    <div key={i} className="p-2.5 bg-background/80 rounded-lg border border-rose-500/30 text-xs">
                      <span className="font-bold text-rose-600 text-[10px] uppercase block mb-0.5">{anom.type}</span>
                      <p className="font-mono text-foreground text-[11px]">{anom.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Dual Engine Metrics (PaddleOCR / RapidOCR & EasyOCR) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PaddleOCR Card (Primary) */}
            <div className="p-4 border rounded-2xl glassmorphism bg-success/5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  OCR Engine 1 (Primary)
                </span>
                <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[8px] ${getEngineBadgeStyle(paddleStatus)}`}>
                  {paddleStatus}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-foreground">
                {ocrData.comparison?.paddleocr?.engine_name || 'PaddleOCR (Primary Engine)'}
              </h4>
              <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] leading-relaxed">
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Time</span>
                  <strong className="text-foreground text-xs font-mono">
                    {typeof ocrData.comparison?.paddleocr?.inference_time_seconds === 'number'
                      ? `${ocrData.comparison.paddleocr.inference_time_seconds} s`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Confidence</span>
                  <strong className="text-foreground text-xs font-mono">
                    {paddleStatus === 'SUCCESS' && typeof ocrData.comparison?.paddleocr?.confidence_score === 'number'
                      ? `${ocrData.comparison.paddleocr.confidence_score}%`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Blocks</span>
                  <strong className="text-foreground text-xs font-mono">
                    {ocrData.comparison?.paddleocr?.detected_blocks_count ?? 'N/A'}
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
                <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[8px] ${getEngineBadgeStyle(easyStatus)}`}>
                  {easyStatus}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-foreground">
                {ocrData.comparison?.easyocr?.engine_name || 'EasyOCR (Secondary / Verification)'}
              </h4>
              <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] leading-relaxed">
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Time</span>
                  <strong className="text-foreground text-xs font-mono">
                    {easyStatus === 'SUCCESS' && typeof ocrData.comparison?.easyocr?.inference_time_seconds === 'number'
                      ? `${ocrData.comparison.easyocr.inference_time_seconds} s`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Confidence</span>
                  <strong className="text-foreground text-xs font-mono">
                    {easyStatus === 'SUCCESS' && typeof ocrData.comparison?.easyocr?.confidence_score === 'number'
                      ? `${ocrData.comparison.easyocr.confidence_score}%`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted block font-semibold mb-0.5 uppercase tracking-wider">Blocks</span>
                  <strong className="text-foreground text-xs font-mono">
                    {easyStatus === 'SUCCESS'
                      ? (ocrData.comparison?.easyocr?.detected_blocks_count ?? 0)
                      : 'N/A'}
                  </strong>
                </div>
              </div>
              {ocrData.comparison?.easyocr?.error_message && (
                <div className={`mt-3 text-[9px] font-mono p-2 rounded border ${
                  easyStatus === 'FAILED'
                    ? 'text-danger bg-danger/10 border-danger/20'
                    : 'text-muted bg-background/40 border-border/30'
                }`}>
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
                Calculated via token overlap between Primary OCR and EasyOCR outputs.
              </span>
            </div>
          )}

          {/* RAW EXTRACTED TEXT (Placed up front for immediate inspection) */}
          <div className="border rounded-2xl glassmorphism p-5 space-y-3 border-primary/25">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-border/20">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-primary flex items-center gap-1.5">
                  <FileText size={14} />
                  Raw Extracted Text ({displayedLineCount} lines)
                </h3>
                {/* Engine stream selector */}
                <div className="flex gap-1 ml-1">
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
                onClick={() => copyText(displayedText)}
                className="px-2.5 py-1 text-[9px] border rounded bg-background/50 hover:bg-background/80 text-muted transition-colors flex items-center gap-1 font-bold self-start sm:self-auto"
              >
                {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy Raw Text'}
              </button>
            </div>

            {/* Extracted text payload block */}
            <pre className="text-[11px] leading-relaxed text-foreground bg-background/60 p-4 rounded-xl font-mono border border-border/20 select-all whitespace-pre-wrap break-words max-h-96 overflow-auto">
              {displayedText}
            </pre>

            {/* Re-run action */}
            <div className="pt-1 flex flex-wrap justify-between items-center gap-2 text-[10px] text-muted">
              <span>Original evidence file preserved untouched in vault storage.</span>
              <button 
                onClick={runOCRScan}
                className="text-primary hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw size={10} />
                Re-run Full OCR Scan
              </button>
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

              {/* Flagged Violent Threats & Contraband */}
              {ocrData.threats && ocrData.threats.length > 0 && (
                <div className="p-3.5 border-2 border-danger/40 bg-danger/10 rounded-xl space-y-2 md:col-span-2 lg:col-span-3 animate-fade-in">
                  <span className="text-[10px] font-black text-danger uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-danger" />
                    Flagged Violent Threats &amp; Contraband:
                  </span>
                  <div className="space-y-1.5">
                    {ocrData.threats.map((threat, i) => (
                      <div key={i} className="p-2 bg-background/80 rounded-lg border border-danger/30 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-danger text-[10px] uppercase">{threat.category} ({threat.tag})</span>
                          <span className="text-[9px] bg-danger text-white font-mono font-bold px-1.5 py-0.5 rounded">{threat.severity}</span>
                        </div>
                        <p className="font-mono text-foreground text-[11px] select-all">{threat.context}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
                    Transaction IDs &amp; Reference UTRs:
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

              {/* Emails & URLs */}
              {((ocrData.extractedData.emails?.length > 0) || (ocrData.extractedData.urls?.length > 0)) && (
                <div className="p-3 border rounded-xl bg-background/40 space-y-1.5">
                  <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                    <AtSign size={11} className="text-primary" />
                    Emails &amp; URLs:
                  </span>
                  <div className="flex flex-col gap-1">
                    {(ocrData.extractedData.emails || []).map((em, i) => (
                      <span key={`em-${i}`} className="px-2 py-0.5 rounded border bg-background/60 font-mono text-[10px] text-foreground break-all">
                        {em}
                      </span>
                    ))}
                    {(ocrData.extractedData.urls || []).map((u, i) => (
                      <span key={`url-${i}`} className="px-2 py-0.5 rounded border bg-background/60 font-mono text-[10px] text-primary break-all">
                        {u}
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

            {(!ocrData.extractedData.amounts?.length &&
              !ocrData.extractedData.people?.length &&
              !ocrData.extractedData.dates?.length &&
              !ocrData.extractedData.ids?.length &&
              !ocrData.extractedData.upi_ids?.length &&
              !ocrData.extractedData.banking_details?.length &&
              !ocrData.extractedData.status_signals?.length &&
              !ocrData.extractedData.numbers?.length) && (
              <p className="text-[11px] text-muted italic">
                No structured financial, date, person, or identifier entities matched patterns in the extracted text. Inspect the Raw Extracted Text block above for full content.
              </p>
            )}

            {/* Uncertain Extractions Warning Box */}
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

          {/* File Integrity Verification Box */}
          <div className="p-4 border rounded-2xl bg-card/25 space-y-2 border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={12} className="text-primary" />
                File Integrity &amp; Cryptographic Seal (ISO/IEC 27037)
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

        </div>
      )}

    </div>
  );
};

const EvidenceViewer = ({ setCurrentTab }) => {
  const {
    caseEvidence,
    activeCase,
    selectedCaseId,
    backendActive,
    deleteEvidenceFile,
    focusedEvidenceId,
    setFocusedEvidenceId,
    preferredViewerTab,
    setPreferredViewerTab
  } = useProject();

  const effectiveCaseId = activeCase?.id || selectedCaseId;

  const [selectedFileId, setSelectedFileId] = useState(caseEvidence[0]?.id || '');
  const [viewMode, setViewMode] = useState('STANDARD'); // STANDARD, HEX, OCR
  const [hexOffsetLimit, setHexOffsetLimit] = useState(128);
  const [fileExtractedData, setFileExtractedData] = useState(null);
  const [loadingOcr, setLoadingOcr] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [rawTextPreview, setRawTextPreview] = useState(null);
  const [rawBytesPreview, setRawBytesPreview] = useState(null);
  const [contentError, setContentError] = useState(null);

  // Read authenticated user role
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleLevel = storedUser.role_level || 'SysAdmin';

  // Jump directly to requested evidence item & tab (e.g. from EvidenceUpload or AISummary)
  useEffect(() => {
    if (focusedEvidenceId && caseEvidence && caseEvidence.length > 0) {
      if (caseEvidence.some(f => f.id === focusedEvidenceId)) {
        setSelectedFileId(focusedEvidenceId);
        if (preferredViewerTab) {
          setViewMode(preferredViewerTab);
        }
        setFocusedEvidenceId(null);
        setPreferredViewerTab('STANDARD');
      }
    }
  }, [focusedEvidenceId, preferredViewerTab, caseEvidence, setFocusedEvidenceId, setPreferredViewerTab]);

  // Synchronize selected file ID whenever active case or case evidence changes
  useEffect(() => {
    if (focusedEvidenceId) return;
    if (caseEvidence && caseEvidence.length > 0) {
      if (!caseEvidence.some(f => f.id === selectedFileId)) {
        setSelectedFileId(caseEvidence[0].id);
      }
    } else {
      setSelectedFileId('');
    }
  }, [caseEvidence, selectedFileId, focusedEvidenceId]);

  const selectedFile = caseEvidence.find(f => f.id === selectedFileId) || caseEvidence[0];

  // Fetch extracted OCR record on evidence file change
  useEffect(() => {
    let cancelled = false;
    setFileExtractedData(null);

    if (backendActive && isValidCaseIdentifier(effectiveCaseId) && isUUID(selectedFile?.id)) {
      setLoadingOcr(true);
      const token = localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      fetch(`${API_BASE_URL}/cases/${effectiveCaseId}/evidence/${selectedFile.id}/ocr`, { headers: authHeader })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (cancelled) return;
          setLoadingOcr(false);
          if (data && Array.isArray(data) && data.length > 0) {
            setFileExtractedData(data[data.length - 1]);
          }
        })
        .catch(() => {
          if (!cancelled) setLoadingOcr(false);
        });
    } else {
      setLoadingOcr(false);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedFile?.id, effectiveCaseId, backendActive]);

  // Fetch authentic raw file bytes from storage vault for image preview, plain text inspection, and real hex dump
  const selectedContentId = selectedFile?.id;
  const selectedContentSize = selectedFile?.fileSize || 0;
  const selectedIsImage = isImageEvidence(selectedFile);
  const selectedIsText = isTextEvidence(selectedFile);

  useEffect(() => {
    let activeObjectUrl = null;
    const controller = new AbortController();

    setPreviewUrl(null);
    setRawTextPreview(null);
    setRawBytesPreview(null);
    setContentError(null);

    const shouldFetchContent =
      backendActive &&
      isValidCaseIdentifier(effectiveCaseId) &&
      isUUID(selectedContentId) &&
      selectedContentSize <= 15 * 1024 * 1024;

    if (shouldFetchContent) {
      const token = localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      fetch(`${API_BASE_URL}/cases/${effectiveCaseId}/evidence/${selectedContentId}/content`, {
        headers: authHeader,
        signal: controller.signal
      })
        .then(async (res) => {
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.detail || `Original binary unavailable on storage node (HTTP ${res.status})`);
          }
          return res.blob();
        })
        .then(async (blob) => {
          if (controller.signal.aborted) return;
          if (selectedIsImage) {
            activeObjectUrl = URL.createObjectURL(blob);
            setPreviewUrl(activeObjectUrl);
          }
          if (selectedIsText) {
            const txt = await blob.slice(0, 65536).text();
            if (!controller.signal.aborted) setRawTextPreview(txt);
          }
          const sliceBuf = await blob.slice(0, 1024).arrayBuffer();
          if (!controller.signal.aborted) setRawBytesPreview(new Uint8Array(sliceBuf));
        })
        .catch((err) => {
          if (err.name !== 'AbortError' && !controller.signal.aborted) {
            setContentError(err.message);
          }
        });
    }

    return () => {
      controller.abort();
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [selectedContentId, selectedContentSize, selectedIsImage, selectedIsText, effectiveCaseId, backendActive]);

  // Actual extracted text only - NEVER inject fake Port 8080 or fake payload strings
  const extData = fileExtractedData?.extracted_data || {};
  const extractedTextContent = fileExtractedData?.extracted_text || '';
  const extractedNumbers = extData.numbers || [];
  const extractedDates = extData.dates || [];
  const extractedTimes = extData.times || [];
  const extractedAmounts = extData.amounts || [];
  const extractedPeople = extData.people || [];
  const extractedIds = extData.ids || [];
  const extractedUpiIds = extData.upi_ids || [];
  const extractedBanking = extData.banking_details || [];
  const extractedStatus = extData.status_signals || [];
  const extractedThreats = extData.threats || [];
  const mediaClassification = extData.media_classification || null;

  const isEngineUnavailable = mediaClassification?.media_class === 'OCR_ENGINE_UNAVAILABLE';
  const isCrimeScene = mediaClassification?.media_class === 'CRIME_SCENE_MEDIA' || selectedFile?.anomalies?.some(a => a.type === 'CRIME_SCENE_MEDIA');

  // Authentic hex dump from real uploaded bytes only
  const getRealHexDump = (bytes, limit) => {
    if (!bytes || bytes.length === 0) return [];
    const lines = [];
    const maxLen = Math.min(bytes.length, limit);
    for (let offset = 0; offset < maxLen; offset += 16) {
      let hexPart = '';
      let asciiPart = '';
      for (let i = 0; i < 16; i++) {
        if (offset + i < maxLen) {
          const val = bytes[offset + i];
          hexPart += val.toString(16).toUpperCase().padStart(2, '0') + ' ';
          asciiPart += val >= 32 && val <= 126 ? String.fromCharCode(val) : '.';
        } else {
          hexPart += '   ';
          asciiPart += ' ';
        }
      }
      lines.push({
        offset: offset.toString(16).toUpperCase().padStart(8, '0'),
        hex: hexPart,
        ascii: asciiPart
      });
    }
    return lines;
  };

  const realHexLines = getRealHexDump(rawBytesPreview, hexOffsetLimit);
  const plainTextToDisplay = rawTextPreview || extractedTextContent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Evidence Examiner &amp; Viewer</h2>
          <p className="text-xs text-muted">Inspect uploaded files, genuine multi-engine OCR text, binary hex headers, and cryptographic signatures</p>
        </div>
        
        {/* Selector + Quick OCR Shortcut */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedFileId}
            onChange={(e) => setSelectedFileId(e.target.value)}
            className="bg-background border rounded-lg px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all max-w-xs"
          >
            {caseEvidence.map(f => (
              <option key={f.id} value={f.id}>{f.fileName}</option>
            ))}
          </select>

          {selectedFile && viewMode !== 'OCR' && (
            <button
              onClick={() => setViewMode('OCR')}
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-3.5 py-2 text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <Search size={13} />
              <span>View Extracted OCR Text</span>
            </button>
          )}
        </div>
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
                          await deleteEvidenceFile(effectiveCaseId, selectedFile.id);
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
            <div className="bg-border/20 border-b px-4 py-2 flex flex-wrap items-center justify-between gap-2">
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
                  {/* Genuine Image Preview */}
                  {isImageEvidence(selectedFile) ? (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      {previewUrl ? (
                        <div className="relative border rounded-xl overflow-hidden shadow-lg border-primary/30 bg-slate-950/60 p-2">
                          <img
                            src={previewUrl}
                            alt={selectedFile.fileName}
                            className="max-h-72 max-w-full object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-full max-w-md p-6 border border-dashed rounded-xl bg-card/30 text-center space-y-1.5">
                          <p className="text-xs font-bold text-foreground">{selectedFile.fileName}</p>
                          <p className="text-[10px] text-muted">
                            {contentError
                              ? `Binary image preview unavailable (${contentError}). Saved OCR text & hashes below remain accessible.`
                              : backendActive
                                ? 'Loading authentic image bytes from vault...'
                                : 'Log in to live backend to preview uploaded image binaries.'}
                          </p>
                        </div>
                      )}
                      <div className="text-center p-1 max-w-lg flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted">
                        <span>Container: <strong className="text-foreground">{selectedFile.fileName}</strong></span>
                        <button
                          onClick={() => setViewMode('OCR')}
                          className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                        >
                          Open Full OCR Telemetry &amp; Entities <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  ) : isTextEvidence(selectedFile) ? (
                    <div className="border rounded-xl p-4 bg-card/30 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between border-b pb-2 border-border/20">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <FileText size={13} className="text-primary" />
                          Authentic Plain Text / Log Content
                        </span>
                        <span className="text-[9px] font-mono text-muted">
                          {rawTextPreview ? 'Loaded directly from storage vault' : 'Parsed from saved extraction record'}
                        </span>
                      </div>
                      {plainTextToDisplay ? (
                        <pre className="text-[11px] font-mono text-foreground bg-background/60 p-3 rounded-lg border border-border/20 max-h-72 overflow-auto whitespace-pre-wrap break-words select-all leading-relaxed">
                          {plainTextToDisplay}
                        </pre>
                      ) : (
                        <p className="text-xs text-muted italic">
                          {contentError || 'Plain text bytes unavailable on storage node.'}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* Standard View Extracted Text Payload Section */}
                  <div className="space-y-4 animate-fade-in">

                    {/* Critical Violent Threat Alert Box */}
                    {((extractedThreats.length > 0) || selectedFile.anomalies?.some(a => a.type.includes('THREAT') || a.type.includes('CRIME') || a.type.includes('WEAPON'))) && (
                      <div className="border-2 border-danger/40 bg-danger/10 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-danger text-white font-black px-2 py-0.5 rounded uppercase flex items-center gap-1.5">
                            <AlertTriangle size={12} />
                            CRITICAL FORENSIC THREAT IDENTIFIED
                          </span>
                          <span className="text-[10px] font-bold text-danger">Criminal Intent &amp; Contraband Analyzer</span>
                        </div>
                        {extractedThreats.length > 0 ? (
                          <div className="space-y-1.5 mt-2">
                            {extractedThreats.map((threat, idx) => (
                              <div key={idx} className="p-2 bg-background/80 rounded border border-danger/20 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-danger text-[10px] uppercase">{threat.category} ({threat.tag})</span>
                                  <span className="text-[9px] bg-danger/20 text-danger font-mono font-bold px-1.5 py-0.5 rounded">{threat.severity}</span>
                                </div>
                                <p className="font-mono text-foreground text-[11px] select-all leading-relaxed">{threat.context}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          selectedFile.anomalies?.filter(a => a.type.includes('THREAT') || a.type.includes('CRIME') || a.type.includes('WEAPON')).map((anom, idx) => (
                            <div key={idx} className="p-2 bg-background/80 rounded border border-danger/20 text-xs">
                              <span className="font-bold text-danger text-[10px] uppercase block mb-1">{anom.type}</span>
                              <p className="font-mono text-foreground text-[11px]">{anom.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {selectedFile.exif ? (
                      <div className="border rounded-xl p-4 bg-card/30 space-y-3">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                          <FileText size={12} className="text-primary" />
                          Extracted Container / EXIF Metadata
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] leading-relaxed">
                          <div><span className="text-muted block">CAMERA / PRODUCER:</span> <strong className="text-foreground break-words">{selectedFile.exif.camera}</strong></div>
                          <div><span className="text-muted block">GPS COORDINATES:</span> <strong className="text-foreground break-words">{selectedFile.exif.gps}</strong></div>
                          <div><span className="text-muted block">CAPTURE / DOC TIMESTAMP:</span> <strong className="text-foreground break-words">{selectedFile.exif.timestamp}</strong></div>
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Extracted Text Box */}
                    <div className="border rounded-xl p-4 bg-card/25 space-y-3 font-mono text-[10.5px] leading-relaxed">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-border/20">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 font-sans">
                          <FileText size={12} className="text-primary" />
                          Extracted Text Payload (OCR)
                          {typeof fileExtractedData?.confidence_score === 'number' && !isEngineUnavailable && (
                            <span className="text-[9px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded ml-1">
                              {fileExtractedData.confidence_score.toFixed(1)}% Mean Conf
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 font-sans">
                          {extractedTextContent && !isEngineUnavailable && (
                            <button
                              onClick={() => navigator.clipboard.writeText(extractedTextContent)}
                              className="px-2 py-1 text-[9px] border rounded bg-background/50 hover:bg-background/80 text-muted font-bold"
                            >
                              Copy Text
                            </button>
                          )}
                          <button
                            onClick={() => setViewMode('OCR')}
                            className="px-2.5 py-1 text-[9px] border border-primary/30 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold"
                          >
                            Inspect in OCR Scanner
                          </button>
                        </div>
                      </div>

                      {loadingOcr ? (
                        <div className="p-6 flex items-center justify-center gap-2 text-xs text-muted font-sans">
                          <Loader2 size={14} className="animate-spin text-primary" />
                          <span>Loading saved OCR text from database...</span>
                        </div>
                      ) : isEngineUnavailable ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center space-y-2 font-sans">
                          <AlertCircle size={22} className="text-amber-500 mx-auto" />
                          <h5 className="text-xs font-bold text-amber-500">Previous OCR Engine Run Incomplete</h5>
                          <p className="text-xs text-muted max-w-md mx-auto">
                            {mediaClassification?.ocr_explanation || extractedTextContent}
                          </p>
                          <button
                            onClick={() => setViewMode('OCR')}
                            className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                          >
                            <RefreshCw size={12} />
                            Re-run OCR Scanner
                          </button>
                        </div>
                      ) : extractedTextContent ? (
                        <pre className="text-foreground bg-background/50 p-3 rounded-lg border border-border/10 select-all font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto">
                          {extractedTextContent}
                        </pre>
                      ) : isCrimeScene ? (
                        <div className="p-4 bg-background/40 border border-danger/30 rounded-lg text-center space-y-2 font-sans">
                          <AlertTriangle size={24} className="text-danger mx-auto" />
                          <h5 className="text-xs font-bold text-danger">Physical Crime Scene Media (Non-Document Evidence)</h5>
                          <p className="text-xs text-muted max-w-md mx-auto">
                            This photograph is flagged as physical crime scene evidence. Optical Character Recognition (OCR) is intended for text documents and receipts.
                          </p>
                        </div>
                      ) : !fileExtractedData ? (
                        <div className="p-4 bg-background/40 border border-border/20 rounded-lg text-center space-y-2 font-sans">
                          <p className="text-xs text-muted">
                            No OCR extraction record has been executed for this file yet.
                          </p>
                          <button
                            onClick={() => setViewMode('OCR')}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                          >
                            <Search size={12} />
                            Open OCR Scanner to Extract Text
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-background/40 border border-border/20 rounded-lg text-center space-y-2 font-sans">
                          <p className="text-xs text-muted">
                            OCR engines completed and detected no typographical text in this file.
                          </p>
                          <button
                            onClick={() => setViewMode('OCR')}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                          >
                            <Search size={12} />
                            Inspect OCR Engine Telemetry
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Isolated Entities Grid (Status, Amounts, People, Dates, Times, IDs, UPI, Banking, Numbers) */}
                    {(extractedStatus.length > 0 || extractedAmounts.length > 0 || extractedPeople.length > 0 || extractedDates.length > 0 || extractedTimes.length > 0 || extractedIds.length > 0 || extractedUpiIds.length > 0 || extractedBanking.length > 0 || extractedNumbers.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extractedStatus.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2 md:col-span-2">
                            <span className="text-[9px] font-bold text-success uppercase block tracking-wider flex items-center gap-1">
                              <CheckCircle2 size={11} />
                              Transaction Status Signals
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedStatus.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border border-success/30 bg-success/10 text-xs text-success font-bold">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

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

                        {(extractedDates.length > 0 || extractedTimes.length > 0) && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <Calendar size={11} className="text-primary" />
                              Extracted Dates &amp; Times
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedDates.map((dt, i) => (
                                <span key={`d-${i}`} className="px-2 py-0.5 rounded border border-primary/20 bg-primary/5 font-mono text-[9px] text-primary font-bold flex items-center gap-1">
                                  <Calendar size={8} />
                                  {dt}
                                </span>
                              ))}
                              {extractedTimes.map((tm, i) => (
                                <span key={`t-${i}`} className="px-2 py-0.5 rounded border bg-background/50 font-mono text-[9px] text-foreground font-bold flex items-center gap-1">
                                  <Clock size={8} />
                                  {tm}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extractedIds.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <Key size={11} className="text-primary" />
                              Transaction IDs &amp; UTRs
                            </span>
                            <div className="flex flex-col gap-1">
                              {extractedIds.map((idv, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border bg-background/50 font-mono text-[9px] text-foreground font-bold break-all">
                                  {idv}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extractedUpiIds.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <AtSign size={11} className="text-primary" />
                              UPI Handles
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedUpiIds.map((u, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border border-accent/20 bg-accent/5 font-mono text-[9px] text-accent font-bold">
                                  {u}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extractedBanking.length > 0 && (
                          <div className="p-3 border rounded-xl bg-background/30 space-y-2">
                            <span className="text-[9px] font-bold text-muted uppercase block tracking-wider flex items-center gap-1">
                              <Building2 size={11} className="text-primary" />
                              Banking &amp; Accounts
                            </span>
                            <div className="flex flex-col gap-1">
                              {extractedBanking.map((b, i) => (
                                <span key={i} className="px-2 py-0.5 rounded border bg-background/50 font-mono text-[9px] text-foreground">
                                  {b}
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

              {/* Mode 2: Hex view (authentic binary file header bytes) */}
              {viewMode === 'HEX' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Hexadecimal Payload Stream</h4>
                      <p className="text-[10px] text-muted">Leading raw bytes read directly from stored evidence binary</p>
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

                  {realHexLines.length > 0 ? (
                    <div className="font-mono text-[10px] leading-relaxed bg-card/60 p-4 border rounded-xl space-y-1 overflow-x-auto select-all">
                      {realHexLines.map((row) => (
                        <div key={row.offset} className="flex gap-4 hover:bg-primary/5 px-1 rounded">
                          <span className="text-primary font-bold select-none">{row.offset}</span>
                          <span className="text-muted tracking-widest whitespace-pre">{row.hex}</span>
                          <span className="text-foreground border-l pl-4 font-bold select-none whitespace-pre">{row.ascii}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted">
                      {contentError
                        ? `Live binary hex stream unavailable (${contentError}).`
                        : 'Log in to the live backend (files <= 15 MB) to inspect authentic raw file header bytes.'}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: Real Multi-Engine OCR Scanner */}
              {viewMode === 'OCR' && (
                <EvidenceOCRPanel 
                  selectedFile={selectedFile}
                  selectedCaseId={effectiveCaseId}
                  backendActive={backendActive}
                  onOcrComplete={(newRec) => setFileExtractedData(newRec)}
                />
              )}

            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-muted border border-dashed rounded-2xl space-y-3">
          <p className="text-xs">Select or ingest evidence to begin forensic verification.</p>
          {setCurrentTab && (
            <button
              onClick={() => setCurrentTab('upload')}
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5"
            >
              <span>Upload &amp; Scan New Evidence</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EvidenceViewer;
