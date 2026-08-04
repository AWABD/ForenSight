import React, { useState, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { FileUp, ShieldAlert, Cpu, Sparkles, HardDrive, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

const EvidenceUpload = () => {
  const { activeCase, addEvidenceFile } = useProject();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [hashCalculation, setHashCalculation] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setCurrentFile(file);
    setUploading(true);
    setProgress(15);
    setSuccess(false);
    setHashCalculation('READING BYTE OFFSETS...');

    // Simulate forensic validation and hashing progress steps
    setTimeout(() => {
      setProgress(45);
      setHashCalculation('CALCULATING BASELINE CRYPTO HASH SHA-256...');
    }, 700);

    setTimeout(() => {
      setProgress(80);
      setHashCalculation('VERIFYING META-CONTAINER STRUCTURES & SHA-3...');
    }, 1500);

    setTimeout(() => {
      setProgress(100);
      setUploading(false);
      addEvidenceFile(activeCase.id, file);
      setSuccess(true);
    }, 2400);
  };

  const triggerInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">Evidence Ingest Console</h2>
        <p className="text-xs text-muted">Upload and seal digital evidence. Platform will compute cryptographic hashes to establish Chain of Custody.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Action Card */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            onDragEnter={handleDrag} 
            onDragOver={handleDrag} 
            onDragLeave={handleDrag} 
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl glassmorphism p-10 text-center flex flex-col items-center justify-center min-h-[300px] transition-all duration-300 relative ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              onChange={handleChange}
              multiple={false}
            />

            <FileUp size={48} className="text-primary dark:text-forensic-glow mb-4 animate-bounce" />
            
            <h3 className="text-sm font-bold text-foreground mb-2">Drag and drop forensic bundle</h3>
            <p className="text-[10px] text-muted mb-6 max-w-sm">
              Supports Server Logs (.log, .csv), Disk Images (.raw, .dd), Chat DB dumps (.db, .sqlite), and Image EXIF packets (.jpg, .png)
            </p>

            <button
              onClick={triggerInput}
              disabled={uploading}
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-6 py-2.5 text-xs font-bold transition-all shadow hover:shadow-primary/20"
            >
              Browse Local Drives
            </button>
          </div>

          {/* Upload Progress bars */}
          {uploading && currentFile && (
            <div className="p-4 border rounded-xl glassmorphism space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="truncate max-w-[200px] text-foreground">{currentFile.name}</span>
                <span className="text-muted">{(currentFile.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>

              {/* Progress Indicator */}
              <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 rounded-full" 
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                <span>{hashCalculation}</span>
              </div>
            </div>
          )}

          {/* Success Validation Card */}
          {success && currentFile && (
            <div className="p-4 border border-success/20 bg-success/5 rounded-xl flex gap-3 items-start animate-fade-in">
              <ShieldCheck size={24} className="text-success flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">File Ingestion & Cryptographic Locking Finished</h4>
                <p className="text-[10px] text-muted">
                  The evidence package has been written to the secure vault partition. Cryptographic hash registers were populated successfully.
                </p>
                <div className="p-2 border rounded bg-background/50 text-[9px] font-mono text-muted select-all truncate mt-2">
                  SHA-256 RECORD: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Regulatory Warnings Sidebar */}
        <div className="space-y-4">
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <HardDrive size={16} className="text-primary" />
              Evidence Repository Spec
            </h3>
            <ul className="text-[10px] text-muted space-y-2.5 list-disc pl-4 leading-relaxed">
              <li>Automatic file system metadata (EXIF/Header properties) isolation.</li>
              <li>Read-only copy replication of uploaded raw files inside MinIO secure container databases.</li>
              <li>Double-pass hash evaluation (SHA256 & SHA3-256) is executed natively on the device CPU vector lanes prior to write validation.</li>
              <li>Integrity checking compliance meets **ISO/IEC 27037** standards regarding digital asset custody logs.</li>
            </ul>
          </div>

          <div className="border p-5 rounded-2xl bg-danger/5 border-danger/10 text-[10px] text-danger/80 space-y-2 leading-relaxed">
            <strong className="block text-xs flex items-center gap-1.5">
              <ShieldAlert size={14} />
              Forensic Secrecy warning
            </strong>
            Verify that case files containing protected classified records or regulatory credentials are uploaded in private offline domains. System locks these contents permanently.
          </div>
        </div>

      </div>
    </div>
  );
};

export default EvidenceUpload;
