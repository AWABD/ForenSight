import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

// SHA-256 Mock generator
const generateHash = (fileName) => {
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    hash = (hash << 5) - hash + fileName.charCodeAt(i);
    hash |= 0; 
  }
  const hex = Math.abs(hash).toString(16).padEnd(8, '0');
  return `f8c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa${hex}`;
};

const initialCases = [
  {
    id: 'c1',
    caseNumber: 'FS-2026-091',
    title: 'Financial Embezzlement & Wire Fraud',
    description: 'Corporate financial forensic audit regarding unapproved transactions from the staging deployment portal.',
    status: 'ACTIVE',
    referenceNumber: 'REF-83893-IND',
    assignedTo: 'Lead Investigator Dr. A. Sharma',
    createdAt: '2026-07-28T09:30:00Z',
    evidenceCount: 5,
    anomalyRate: '32%'
  },
  {
    id: 'c2',
    caseNumber: 'FS-2026-104',
    title: 'Deepfake Tampering & IP Theft',
    description: 'Investigation of manipulated verification records, compromised source systems, and EXIF spoofing vectors.',
    status: 'ACTIVE',
    referenceNumber: 'REF-92384-US',
    assignedTo: 'Examiner Protyush B.',
    createdAt: '2026-07-30T14:15:00Z',
    evidenceCount: 4,
    anomalyRate: '75%'
  },
  {
    id: 'c3',
    caseNumber: 'FS-2026-052',
    title: 'Host Intrusion & Keylogger Deployment',
    description: 'System log inspection of registry changes, memory artifacts, and suspicious outbound connections from critical hosts.',
    status: 'UNDER_REVIEW',
    referenceNumber: 'REF-73891-DE',
    assignedTo: 'Analyst Sarah Connor',
    createdAt: '2026-07-15T08:00:00Z',
    evidenceCount: 6,
    anomalyRate: '12%'
  }
];

const initialEvidence = {
  'c1': [
    {
      id: 'e1_1',
      fileName: 'db_ledger_dump.sqlite',
      fileSize: 42100000,
      fileType: 'Database',
      sha256: generateHash('db_ledger_dump.sqlite'),
      sha3: generateHash('db_ledger_dump.sqlite_sha3'),
      ingestedAt: '2026-07-28T10:11:02Z',
      anomalies: [
        { type: 'DELETED_RECORDS', severity: 'HIGH', message: '12 database rows deleted on 2026-07-28 08:14:10 UTC' }
      ]
    },
    {
      id: 'e1_2',
      fileName: 'auth_syslog.log',
      fileSize: 1240000,
      fileType: 'System Log',
      sha256: generateHash('auth_syslog.log'),
      sha3: generateHash('auth_syslog.log_sha3'),
      ingestedAt: '2026-07-28T10:12:45Z',
      anomalies: [
        { type: 'FAILED_LOGINS', severity: 'CRITICAL', message: 'Brute-force signature: 142 failed log-in requests from IP 192.168.12.93 in 2 minutes' }
      ]
    },
    {
      id: 'e1_3',
      fileName: 'agent_metadata_exif.jpg',
      fileSize: 345000,
      fileType: 'Image Scan',
      sha256: generateHash('agent_metadata_exif.jpg'),
      sha3: generateHash('agent_metadata_exif.jpg_sha3'),
      ingestedAt: '2026-07-28T10:15:30Z',
      exif: {
        camera: 'iPhone 13',
        gps: '28.6139, 77.2090 (New Delhi)',
        timestamp: '2026-07-28T08:12:00Z'
      },
      anomalies: []
    }
  ],
  'c2': [
    {
      id: 'e2_1',
      fileName: 'employee_record_tampered.jpg',
      fileSize: 852000,
      fileType: 'Image Scan',
      sha256: generateHash('employee_record_tampered.jpg'),
      sha3: generateHash('employee_record_tampered.jpg_sha3'),
      ingestedAt: '2026-07-30T15:20:00Z',
      exif: {
        camera: 'Unknown / Modified EXIF',
        gps: '34.0522, -118.2437 (Los Angeles)',
        timestamp: '2020-01-01T00:00:00Z (Anomalous)'
      },
      anomalies: [
        { type: 'METADATA_TAMPERING', severity: 'HIGH', message: 'EXIF timestamps set 6 years retroactively. File creation date discrepancy.' },
        { type: 'IMAGE_FORGERY', severity: 'CRITICAL', message: 'Double-quantization matrix deviation maps identify clone-stamp modification in bounding box [140, 220, 290, 310]' }
      ]
    },
    {
      id: 'e2_2',
      fileName: 'source_repository_logs.csv',
      fileSize: 4500000,
      fileType: 'Audit Log',
      sha256: generateHash('source_repository_logs.csv'),
      sha3: generateHash('source_repository_logs.csv_sha3'),
      ingestedAt: '2026-07-30T15:22:12Z',
      anomalies: [
        { type: 'UNAUTHORIZED_ACCESS', severity: 'WARNING', message: 'Token bypass credentials used on repo path `/security/kms`' }
      ]
    },
    {
      id: 'e2_3',
      fileName: 'ceo_audio_statement.mp3',
      fileSize: 12400000,
      fileType: 'Audio Recording',
      sha256: generateHash('ceo_audio_statement.mp3'),
      sha3: generateHash('ceo_audio_statement.mp3_sha3'),
      ingestedAt: '2026-07-30T15:30:00Z',
      anomalies: [
        { type: 'DEEPFAKE_AUDIO', severity: 'CRITICAL', message: 'Spectral analysis tags: 98% synthetic voice match with GAN audio generator signature. High similarity index in phase shifts.' }
      ]
    }
  ]
};

const initialTimeline = {
  'c1': [
    { id: 't1_1', timestamp: '2026-07-28T08:10:00Z', type: 'SYS_LOGIN', source: 'auth_syslog.log', description: 'User root logged in from unexpected IP 192.168.12.93', severity: 'CRITICAL' },
    { id: 't1_2', timestamp: '2026-07-28T08:12:00Z', type: 'FILE_CREATE', source: 'agent_metadata_exif.jpg', description: 'Snapshot image generated and saved to critical document directories', severity: 'INFO' },
    { id: 't1_3', timestamp: '2026-07-28T08:14:10Z', type: 'DB_DELETE', source: 'db_ledger_dump.sqlite', description: 'DELETE statement executed: cleared 12 transaction rows from customer_ledgers table', severity: 'HIGH' },
    { id: 't1_4', timestamp: '2026-07-28T08:20:00Z', type: 'SYS_LOGOUT', source: 'auth_syslog.log', description: 'User root logged out. Session duration: 10 mins', severity: 'INFO' }
  ],
  'c2': [
    { id: 't2_1', timestamp: '2026-07-30T10:00:00Z', type: 'SOURCE_GIT', source: 'source_repository_logs.csv', description: 'Branch merge: master pulled from user dev_compromised', severity: 'WARNING' },
    { id: 't2_2', timestamp: '2026-07-30T11:15:30Z', type: 'AUDIO_CREATE', source: 'ceo_audio_statement.mp3', description: 'Voice memo file generated. AI metrics flag synthetic rendering', severity: 'CRITICAL' },
    { id: 't2_3', timestamp: '2026-07-30T12:00:02Z', type: 'METADATA_SPOOF', source: 'employee_record_tampered.jpg', description: 'Image EXIF modifications: Timestamp manual set retroactively to 2020', severity: 'HIGH' }
  ]
};

const initialLogs = [
  { id: 'l1', timestamp: '2026-07-31T06:00:20Z', operator: 'Lead Investigator Dr. A. Sharma', action: 'Uploaded db_ledger_dump.sqlite', blockHash: '8b9d88...efa312' },
  { id: 'l2', timestamp: '2026-07-31T06:05:44Z', operator: 'ForenSight Core Engine', action: 'Computed baseline SHA-256 checks', blockHash: 'ff9d3a...bd2291' },
  { id: 'l3', timestamp: '2026-07-31T06:10:00Z', operator: 'AI Pipeline: EasyOCR', action: 'Scanned employee_record_tampered.jpg, extracted text: "Clearance Lvl 4"', blockHash: '439a38...0be8e1' }
];

export const ProjectProvider = ({ children }) => {
  const [cases, setCases] = useState(initialCases);
  const [selectedCaseId, setSelectedCaseId] = useState('c1');
  const [evidence, setEvidence] = useState(initialEvidence);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [auditLogs, setAuditLogs] = useState(initialLogs);
  
  const activeCase = cases.find(c => c.id === selectedCaseId) || cases[0];
  const caseEvidence = evidence[selectedCaseId] || [];
  const caseTimeline = timeline[selectedCaseId] || [];

  const addCase = (newCase) => {
    const cId = `c_${Date.now()}`;
    const formatted = {
      id: cId,
      caseNumber: `FS-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: newCase.title,
      description: newCase.description,
      status: 'ACTIVE',
      referenceNumber: newCase.referenceNumber || `REF-${Math.floor(10000 + Math.random() * 90000)}-IND`,
      assignedTo: newCase.assignedTo || 'Lead Investigator Dr. A. Sharma',
      createdAt: new Date().toISOString(),
      evidenceCount: 0,
      anomalyRate: '0%'
    };

    setCases([...cases, formatted]);
    setEvidence({ ...evidence, [cId]: [] });
    setTimeline({ ...timeline, [cId]: [] });

    // Append to Chain of Custody Audit
    appendAuditLog(`Created Case ${formatted.caseNumber} - ${formatted.title}`);
    return formatted;
  };

  const addEvidenceFile = (caseId, file) => {
    const fileId = `e_${Date.now()}`;
    const newFile = {
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'Unknown raw forensic bytes',
      sha256: generateHash(file.name),
      sha3: generateHash(file.name + '_sha3'),
      ingestedAt: new Date().toISOString(),
      anomalies: file.name.includes('tamper') || file.name.includes('compromised') || file.name.includes('deepfake') ? [
        { type: 'SUSPICIOUS_HEADER', severity: 'HIGH', message: 'Anomalous byte offsets detected in header stream.' }
      ] : []
    };

    const updated = {
      ...evidence,
      [caseId]: [...(evidence[caseId] || []), newFile]
    };
    setEvidence(updated);

    // Update case file count
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return { ...c, evidenceCount: c.evidenceCount + 1 };
      }
      return c;
    }));

    // Create a timeline event automatically for the ingestion
    const newEvent = {
      id: `t_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'FILE_INGEST',
      source: file.name,
      description: `Ingested ${file.name} to vault storage. System baseline hashed successfully.`,
      severity: 'INFO'
    };

    setTimeline({
      ...timeline,
      [caseId]: [...(timeline[caseId] || []), newEvent]
    });

    appendAuditLog(`Ingested file ${file.name} into case vault. SHA256: ${newFile.sha256.substring(0, 12)}...`);
  };

  const appendAuditLog = (action) => {
    const prevLog = auditLogs[auditLogs.length - 1];
    const prevHash = prevLog ? prevLog.blockHash : '0000000000000000000000000000000000000000';
    
    // Simulate Chain of Custody block-link hash calculation:
    // H(block) = SHA256(action + prevHash)
    const activeHash = generateHash(action + prevHash).substring(0, 20);

    const logEntry = {
      id: `l_${Date.now()}`,
      timestamp: new Date().toISOString(),
      operator: 'Lead Investigator Dr. A. Sharma',
      action,
      blockHash: `${activeHash}...${generateHash(action).substring(0, 6)}`
    };

    setAuditLogs(prev => [...prev, logEntry]);
  };

  return (
    <ProjectContext.Provider value={{
      cases,
      selectedCaseId,
      setSelectedCaseId,
      activeCase,
      caseEvidence,
      caseTimeline,
      auditLogs,
      addCase,
      addEvidenceFile,
      appendAuditLog
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
