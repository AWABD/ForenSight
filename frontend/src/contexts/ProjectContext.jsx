import React, { createContext, useContext, useState, useEffect } from 'react';

import { API_BASE_URL } from '../config';

const ProjectContext = createContext();

// SHA-256 Mock generator fallback
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
    evidenceCount: 3,
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
    evidenceCount: 3,
    anomalyRate: '75%'
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
    { id: 't1_3', timestamp: '2026-07-28T08:14:10Z', type: 'DB_DELETE', source: 'db_ledger_dump.sqlite', description: 'DELETE statement executed: cleared 12 transaction rows from customer_ledgers table', severity: 'HIGH' }
  ],
  'c2': [
    { id: 't2_1', timestamp: '2026-07-30T10:00:00Z', type: 'SOURCE_GIT', source: 'source_repository_logs.csv', description: 'Branch merge: master pulled from user dev_compromised', severity: 'WARNING' },
    { id: 't2_2', timestamp: '2026-07-30T11:15:30Z', type: 'AUDIO_CREATE', source: 'ceo_audio_statement.mp3', description: 'Voice memo file generated. AI metrics flag synthetic rendering', severity: 'CRITICAL' }
  ]
};

const initialLogs = [
  { id: 'l1', timestamp: '2026-07-31T06:00:20Z', operator: 'Lead Investigator Dr. A. Sharma', action: 'Uploaded db_ledger_dump.sqlite', blockHash: '8b9d88...efa312' },
  { id: 'l2', timestamp: '2026-07-31T06:05:44Z', operator: 'ForenSight Core Engine', action: 'Computed baseline SHA-256 checks', blockHash: 'ff9d3a...bd2291' }
];

export const ProjectProvider = ({ children }) => {
  const [cases, setCases] = useState(initialCases);
  const [selectedCaseId, setSelectedCaseId] = useState('c1');
  const [evidence, setEvidence] = useState(initialEvidence);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [auditLogs, setAuditLogs] = useState(initialLogs);
  const [backendActive, setBackendActive] = useState(false);
  
  // Real-time synchronization loader
  const refreshData = async () => {
    const token = localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      // 1. Fetch Cases
      const casesRes = await fetch(`${API_BASE_URL}/cases/`, { headers: authHeader });
      if (!casesRes.ok) throw new Error("API Offline or unauthorized");
      
      const rawCases = await casesRes.json();
      setBackendActive(true);

      const parsedCases = rawCases.map(c => ({
        id: c.id,
        caseNumber: c.case_number,
        title: c.title,
        description: c.description,
        status: c.status,
        referenceNumber: c.reference_number,
        assignedTo: 'Lead Investigator (Active Session)',
        createdAt: c.created_at,
        evidenceCount: 0,
        anomalyRate: '0%'
      }));

      // 2. Fetch evidence, timeline, and audit logs for each case
      const newEvidence = {};
      const newTimeline = {};
      let allAuditLogs = [];

      for (const c of parsedCases) {
        // Fetch Evidence Files
        const evRes = await fetch(`${API_BASE_URL}/cases/${c.id}/evidence/`, { headers: authHeader });
        let evList = [];
        if (evRes.ok) {
          const rawEv = await evRes.json();
          evList = rawEv.map(e => ({
            id: e.id,
            fileName: e.file_name,
            fileSize: e.file_size_bytes,
            fileType: e.file_type,
            sha256: e.sha256_hash,
            sha3: e.sha3_hash,
            ingestedAt: e.ingested_at,
            exif: e.exif,
            anomalies: e.anomalies || []
          }));
          c.evidenceCount = evList.length;
          // Calculate mock/real anomaly rate based on warning counts
          const anomaliesCount = evList.filter(e => e.anomalies.length > 0).length;
          c.anomalyRate = evList.length > 0 ? `${Math.round((anomaliesCount / evList.length) * 100)}%` : '0%';
        }
        newEvidence[c.id] = evList;

        // Fetch Timeline Events
        const timeRes = await fetch(`${API_BASE_URL}/cases/${c.id}/timeline/`, { headers: authHeader });
        if (timeRes.ok) {
          const rawTime = await timeRes.json();
          newTimeline[c.id] = rawTime.map(t => ({
            id: t.id,
            timestamp: t.event_timestamp,
            type: t.event_type,
            source: t.timestamp_source,
            description: t.description,
            severity: t.severity
          }));
        }

        // Fetch Audit Logs
        const auditRes = await fetch(`${API_BASE_URL}/cases/${c.id}/audit/`, { headers: authHeader });
        if (auditRes.ok) {
          const rawAudit = await auditRes.json();
          const caseAudits = rawAudit.map(a => ({
            id: a.block_id,
            timestamp: a.record_timestamp,
            operator: 'Examiner Session ID',
            action: a.action_type,
            blockHash: a.active_block_hash
          }));
          allAuditLogs = [...allAuditLogs, ...caseAudits];
        }
      }

      setCases(parsedCases);
      setEvidence(newEvidence);
      setTimeline(newTimeline);
      if (allAuditLogs.length > 0) {
        setAuditLogs(allAuditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }

      // Automatically sync selectedCaseId if the active selection doesn't exist
      if (parsedCases.length > 0 && !parsedCases.find(pc => pc.id === selectedCaseId)) {
        setSelectedCaseId(parsedCases[0].id);
      }

    } catch (err) {
      console.warn("FastAPI service offline. Running in high-fidelity mock Sandbox mode.");
      setBackendActive(false);
    }
  };

  // Sync on context mount and periodic polling interval
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // Poll every 10s for real-time synchronization
    return () => clearInterval(interval);
  }, [selectedCaseId]);

  const activeCase = cases.find(c => c.id === selectedCaseId) || cases[0] || initialCases[0];
  const caseEvidence = evidence[selectedCaseId] || [];
  const caseTimeline = timeline[selectedCaseId] || [];

  const addCase = async (newCase) => {
    const token = localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    if (backendActive) {
      try {
        const response = await fetch(`${API_BASE_URL}/cases/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify({
            title: newCase.title,
            description: newCase.description,
            reference_number: newCase.referenceNumber || `REF-${Math.floor(10000 + Math.random() * 90000)}-IND`
          })
        });

        if (response.ok) {
          const c = await response.json();
          await refreshData();
          setSelectedCaseId(c.id);
          return c;
        }
      } catch (err) {
        console.error("Failed to post new case:", err);
      }
    }

    // Fallback to local state if backend is offline
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
    appendAuditLog(`Created Case ${formatted.caseNumber} - ${formatted.title}`);
    setSelectedCaseId(cId);
    return formatted;
  };

  const addEvidenceFile = async (caseId, file) => {
    const token = localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    if (backendActive) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/cases/${caseId}/evidence/upload`, {
          method: 'POST',
          headers: authHeader,
          body: formData
        });

        if (response.ok) {
          await refreshData();
          return;
        } else {
          const errData = await response.json();
          alert(`Ingest Blocked: ${errData.detail || 'Upload Failed'}`);
        }
      } catch (err) {
        console.error("Failed to upload evidence to server:", err);
      }
    }

    // Fallback to local mock state if backend is offline
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

    // Create timeline event automatically
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
      appendAuditLog,
      backendActive,
      refreshData
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
