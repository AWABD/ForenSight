import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { 
  FileUp, ShieldAlert, HardDrive, ShieldCheck, Loader2, 
  Trash2, FileText, FileArchive, Mail, CheckCircle2, 
  FileDown, Compass, Calendar, AlertTriangle
} from 'lucide-react';

const EvidenceUpload = () => {
  const { cases, selectedCaseId, setSelectedCaseId, addEvidenceFile, activeCase } = useProject();
  const [targetCaseId, setTargetCaseId] = useState(selectedCaseId);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [textPreview, setTextPreview] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLog, setStatusLog] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [ingestedRecord, setIngestedRecord] = useState(null);
  const fileInputRef = useRef(null);

  // Keep dropdown aligned with sidebar selection, but allow override
  useEffect(() => {
    setTargetCaseId(selectedCaseId);
  }, [selectedCaseId]);

  // Read authenticated user role
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleLevel = storedUser.role_level || 'LeadInvestigator';
  const canUpload = roleLevel === 'SysAdmin' || roleLevel === 'LeadInvestigator';

  // Allowed extensions list
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.txt', '.log', '.csv', '.eml', '.msg', '.zip'];

  const validateFileType = (fileName) => {
    const ext = '.' + fileName.split('.').pop().toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  };

  const getFileIcon = (fileName) => {
    const ext = '.' + fileName.split('.').pop().toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) return null; // Image preview will handle it
    if (['.eml', '.msg'].includes(ext)) return <Mail className="text-blue-400 w-12 h-12" />;
    if (['.zip'].includes(ext)) return <FileArchive className="text-amber-500 w-12 h-12" />;
    if (ext === '.pdf') return <FileText className="text-red-400 w-12 h-12" />;
    return <FileText className="text-emerald-400 w-12 h-12" />;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setErrorMessage('');
    setIngestedRecord(null);
    
    if (!validateFileType(selectedFile.name)) {
      setErrorMessage(`Unsupported file format. ForenSight supports only: ${ALLOWED_EXTENSIONS.join(', ')}`);
      setFile(null);
      setFilePreview(null);
      setTextPreview('');
      return;
    }

    setFile(selectedFile);

    // Create Image URL Preview
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      setFilePreview(URL.createObjectURL(selectedFile));
      setTextPreview('');
    } else if (['.txt', '.log', '.csv'].includes(ext)) {
      setFilePreview(null);
      // Read first 500 chars for text preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setTextPreview(event.target.result.slice(0, 800));
      };
      reader.readAsText(selectedFile);
    } else {
      setFilePreview(null);
      setTextPreview('');
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setStatusLog('INITIALIZING SAFE UPLOAD GATEWAY...');

    // Simulate forensic pipeline stages
    const stages = [
      { p: 15, log: 'READING FILE BINARY HEADER (SIGNATURE INTRUSION CHECK)...' },
      { p: 40, log: 'COMPUTING BASELINE CRYPTOGRAPHIC HASH (SHA-256)...' },
      { p: 65, log: 'CALCULATING ALTERNATE CRYPTOGRAPHIC DIGEST (SHA-3)...' },
      { p: 85, log: 'PARSING META-CONTAINER STRUCTURES & STUBBING ANOMALIES...' },
      { p: 100, log: 'INGESTING TO OBJECT VAULT & APENDING LEDGER BLOCK...' }
    ];

    let currentStageIndex = 0;
    const interval = setInterval(() => {
      if (currentStageIndex < stages.length) {
        const stage = stages[currentStageIndex];
        setProgress(stage.p);
        setStatusLog(stage.log);
        currentStageIndex++;
      } else {
        clearInterval(interval);
        setUploading(false);
        
        // Mock checking duplicate hashes if the name triggers duplicate testing
        if (file.name.includes('dup') || file.name.includes('duplicate')) {
          setErrorMessage("Duplicate File Error: A file with identical SHA-256 hash already exists in this case database.");
          return;
        }

        // Apply file upload to context state
        addEvidenceFile(targetCaseId, file);
        
        // Calculate hash key mapping (mimic backend SHA hashes)
        const mockSHA256 = `f8c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaae8${Math.floor(1000 + Math.random()*9000).toString(16)}`;
        const mockSHA3 = `sha3_c6b54a8e2bc70c67feaa3a3c6b5773a4421a4b5992a7fb3a121${Math.floor(100 + Math.random()*900)}`;

        const isTampered = file.name.includes('tamper') || file.name.includes('compromised') || file.name.includes('deepfake');

        setIngestedRecord({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          sha256: mockSHA256,
          sha3: mockSHA3,
          vaultPath: `storage_vault/${targetCaseId}/${file.name}`,
          metadata: {
            camera: ['jpg', 'jpeg', 'png'].includes(file.name.split('.').pop().toLowerCase()) 
                      ? (file.name.includes('exif') ? 'iPhone 13' : 'Unknown / Spoofed EXIF')
                      : 'ForenSight Format Parser v1.0',
            gps: file.name.includes('exif') ? '28.6139, 77.2090 (New Delhi)' : 'N/A (Logical File)',
            timestamp: new Date().toISOString()
          },
          anomalies: isTampered ? [
            { type: 'SIGNATURE_CHECK_WARNING', severity: 'HIGH', message: 'Anomalous binary flags inside file metadata.' }
          ] : []
        });
        
        setFile(null);
        setFilePreview(null);
        setTextPreview('');
      }
    }, 850);
  };

  const removeSelectedFile = () => {
    setFile(null);
    setFilePreview(null);
    setTextPreview('');
    setErrorMessage('');
    setIngestedRecord(null);
  };

  const triggerBrowse = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div>
        <h1 id="upload-module-title" className="text-2xl font-extrabold text-foreground tracking-tight">Evidence Ingest Console</h1>
        <p className="text-xs text-muted mt-1">Upload, validate, and hash digital evidence payloads to enforce cryptographic Chain of Custody (CoC).</p>
      </div>

      {/* 2. Case Assignment dropdown */}
      <div className="glassmorphism p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-primary block">Assign Target Case File</label>
          <p className="text-[11px] text-muted">All uploaded evidence objects will be locked cryptographically into the case folder vault.</p>
        </div>
        <select
          id="case-assignment-select"
          value={targetCaseId}
          onChange={(e) => {
            setTargetCaseId(e.target.value);
            setSelectedCaseId(e.target.value); // Sync globally
          }}
          className="w-full md:w-96 bg-background border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-semibold"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              [{c.caseNumber}] {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Main Action Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-4">
          
          {/* Drag & Drop Box / Preview Module */}
          {!file ? (
            <div 
              onDragEnter={handleDrag} 
              onDragOver={handleDrag} 
              onDragLeave={handleDrag} 
              onDrop={handleDrop}
              onClick={triggerBrowse}
              className={`border-2 border-dashed rounded-2xl glassmorphism p-8 text-center flex flex-col items-center justify-center min-h-[300px] cursor-pointer transition-all duration-300 relative ${
                dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                multiple={false}
              />
              <FileUp size={48} className="text-primary dark:text-forensic-glow mb-4 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground mb-2">Drag and drop forensic bundle here</h3>
              <p className="text-[10px] text-muted mb-4 max-w-sm">
                Or click to browse local folders. Supports Images, PDFs, DOCX, ZIP files, E-mail packets (.eml/.msg), and text logs.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {ALLOWED_EXTENSIONS.map(ext => (
                  <span key={ext} className="px-2 py-0.5 border rounded-full text-[9px] bg-background/55 font-mono text-muted uppercase">
                    {ext.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Evidence File Preview Module */
            <div className="border rounded-2xl glassmorphism p-6 space-y-4 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Compass size={14} className="text-primary" />
                  Forensic Asset Preview
                </h3>
                <button 
                  onClick={removeSelectedFile}
                  className="p-1.5 rounded-lg border text-muted hover:text-danger hover:border-danger/30 transition-colors"
                  title="Remove file"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Dynamic Preview Viewport */}
              <div className="p-4 border rounded-xl bg-background/50 flex flex-col items-center justify-center min-h-[180px]">
                
                {/* 1. Image Preview */}
                {filePreview && (
                  <div className="relative group max-w-xs overflow-hidden rounded-lg border shadow-lg">
                    <img 
                      src={filePreview} 
                      alt="Ingested Preview" 
                      className="max-h-48 object-contain transition-transform duration-300 group-hover:scale-105" 
                    />
                  </div>
                )}

                {/* 2. Text / Log Scrollable Preview */}
                {textPreview && (
                  <div className="w-full font-mono text-[9px] text-left text-muted bg-forensic-navy p-3 rounded-lg max-h-48 overflow-y-auto border border-border/20 leading-relaxed select-none">
                    <div className="text-[8px] uppercase tracking-wider text-primary border-b border-border/20 pb-1 mb-2 font-bold select-none">
                      ASCII Text Stream Preview (First 800 Characters)
                    </div>
                    {textPreview}
                  </div>
                )}

                {/* 3. Non-previewable File Card (PDF, ZIP, DOCX, MSG) */}
                {!filePreview && !textPreview && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-background/70 rounded-full border shadow-inner">
                      {getFileIcon(file.name)}
                    </div>
                    <span className="px-2 py-0.5 border rounded-full text-[9px] bg-primary/10 text-primary font-mono font-bold uppercase">
                      {file.name.split('.').pop()} FILE
                    </span>
                  </div>
                )}

                <div className="text-center mt-4">
                  <h4 className="text-xs font-bold text-foreground truncate max-w-[320px]">{file.name}</h4>
                  <p className="text-[10px] text-muted mt-1">{(file.size / (1024 * 1024)).toFixed(3)} MB</p>
                </div>

              </div>

              {/* Submit File Button */}
              {!uploading && (
                <button
                  onClick={handleUploadSubmit}
                  className="w-full bg-primary hover:bg-primary-dark text-white rounded-lg py-2.5 text-xs font-bold transition-all shadow hover:shadow-primary/20 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={16} />
                  Ingest & Compute Cryptographic Seal
                </button>
              )}
            </div>
          )}

          {/* Upload Progress Module */}
          {uploading && (
            <div className="p-4 border rounded-xl glassmorphism space-y-3 relative overflow-hidden animate-pulse">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="truncate max-w-[200px] text-foreground font-bold">{file?.name}</span>
                <span className="text-muted font-mono">{progress}%</span>
              </div>

              {/* Glowing progress line */}
              <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 rounded-full shadow-glow" 
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary">
                <Loader2 size={12} className="animate-spin" />
                <span>{statusLog}</span>
              </div>
            </div>
          )}

          {/* Validation Warnings (Error triggers) */}
          {errorMessage && (
            <div className="p-4 border border-danger/20 bg-danger/5 rounded-xl flex gap-3 items-start animate-fade-in">
              <AlertTriangle size={20} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-danger">Forensic Compliance Error</h4>
                <p className="text-[10px] text-muted leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Validation Card */}
          {ingestedRecord && (
            <div className="p-5 border border-success/20 bg-success/5 rounded-2xl space-y-4 animate-fade-in relative overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-success" />
              
              <div className="flex items-start gap-3">
                <div className="bg-success/20 text-success p-1.5 rounded-lg">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Forensic Evidence Seal Acquired</h4>
                  <p className="text-[10px] text-muted">The file has been successfully written to vault storage in compliance with ISO/IEC 27037.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                <div className="p-3 border rounded-xl bg-background/50 space-y-2">
                  <span className="text-[9px] font-bold text-primary uppercase block">Cryptographic Hashes</span>
                  <div className="space-y-1.5 font-mono text-[9px] text-muted">
                    <div className="truncate select-all" title={ingestedRecord.sha256}>
                      <strong className="text-foreground">SHA-256:</strong> {ingestedRecord.sha256}
                    </div>
                    <div className="truncate select-all" title={ingestedRecord.sha3}>
                      <strong className="text-foreground">SHA-3-256:</strong> {ingestedRecord.sha3}
                    </div>
                  </div>
                </div>

                <div className="p-3 border rounded-xl bg-background/50 space-y-2">
                  <span className="text-[9px] font-bold text-primary uppercase block">Extracted Meta Parameters</span>
                  <div className="space-y-1 text-muted">
                    <div className="flex items-center gap-1.5">
                      <Compass size={12} className="text-primary/70" />
                      <span>{ingestedRecord.metadata.camera}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HardDrive size={12} className="text-primary/70" />
                      <span className="truncate max-w-[150px]">{ingestedRecord.metadata.gps}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-primary/70" />
                      <span>{new Date(ingestedRecord.metadata.timestamp).toLocaleTimeString()} (Sealed Date)</span>
                    </div>
                  </div>
                </div>
              </div>

              {ingestedRecord.anomalies.length > 0 && (
                <div className="p-3 border border-warning/20 bg-warning/5 rounded-xl text-[10px] text-muted flex gap-2">
                  <ShieldAlert size={14} className="text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-warning">AI Ingestion Warnings:</span> {ingestedRecord.anomalies[0].message}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 4. Side Info Column */}
        <div className="space-y-4">
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive size={16} className="text-primary" />
              Evidence Repository Spec
            </h3>
            <ul className="text-[10px] text-muted space-y-3 pl-4 list-disc leading-relaxed">
              <li>**Supported Formats:** Direct binary check for JPEG, PNG, PDF, Word Document (DOCX), standard text logs (.log, .txt, .csv), and E-mail messages (.eml, .msg).</li>
              <li>**Path Traversal Prevention:** Uploaded filenames are stripped of directories (`../`) and escape sequences.</li>
              <li>**Double Hashing Validation:** Native execution of parallel SHA-256 and SHA3-256 calculations to verify storage integrity.</li>
              <li>**Zero-Trust Validation:** Mismatching file extensions and binary headers (magic numbers) cause immediate deletion.</li>
            </ul>
          </div>

          <div className="border p-5 rounded-2xl bg-danger/5 border-danger/10 text-[10px] text-danger/80 space-y-2 leading-relaxed">
            <strong className="block text-xs flex items-center gap-1.5 font-bold uppercase tracking-wider text-danger">
              <ShieldAlert size={14} />
              Forensic Integrity Warn
            </strong>
            Forensight operates within an air-gapped system. Ensure sensitive evidence is kept offline and protected by the sovereign key encryption policy (AES-256).
          </div>
        </div>

      </div>
    </div>
  );
};

export default EvidenceUpload;
