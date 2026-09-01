import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Network, ArrowRight, User, Globe, File, ShieldAlert, Video, Music, Image as ImageIcon, Folder } from 'lucide-react';

const RelationshipGraph = () => {
  const { activeCase, cases, caseEvidence } = useProject();
  const [selectedCaseId, setSelectedCaseId] = useState(activeCase.id || 'c1');
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Active target case
  const currentCase = cases.find(c => c.id === selectedCaseId || c.caseNumber === selectedCaseId) || activeCase;

  // Case-specific Relationship Graph dictionary
  const predefinedGraphs = {
    // Case 1: Financial Embezzlement
    'FS-2026-091': {
      nodes: [
        { id: 'n1_1', label: 'Admin Root (tty1)', type: 'user', info: 'UID: 0, SSH Terminal session active', anomalies: 'Brute force connection bypassed' },
        { id: 'n1_2', label: '192.168.12.93', type: 'ip', info: 'Inbound socket connection, ISP New Delhi', anomalies: '142 failed login requests' },
        { id: 'n1_3', label: 'db_ledger_dump.sqlite', type: 'file', info: 'Corporate ledger database file', anomalies: '12 deleted ledger transactions' },
        { id: 'n1_4', label: 'agent_metadata_exif.jpg', type: 'photo', info: 'Photo validation badge', anomalies: 'VPN Exit node EXIF match' }
      ],
      connections: [
        { from: 'n1_2', to: 'n1_1', label: 'Unauthorized SSH Handshakes', strength: 'CRITICAL' },
        { from: 'n1_1', to: 'n1_3', label: 'SQL DELETE Query Execution', strength: 'HIGH' },
        { from: 'n1_2', to: 'n1_4', label: 'Photo Ingestion Socket', strength: 'INFO' }
      ]
    },
    // Case 2: Deepfake Tampering
    'FS-2026-104': {
      nodes: [
        { id: 'n2_1', label: 'employee_record_tampered.jpg', type: 'photo', info: 'High-res scanned photo ID card', anomalies: 'EXIF timestamp backdated 6 years' },
        { id: 'n2_2', label: 'ceo_audio_statement.mp3', type: 'audio', info: '12.4 MB voice recording file', anomalies: '98% GAN synthetic voice match' },
        { id: 'n2_3', label: 'executive_briefing_leak.mp4', type: 'video', info: '84.5 MB MP4 video stream', anomalies: 'Face swap on frames [120-450]' },
        { id: 'n2_4', label: 'dev_compromised@corp.com', type: 'user', info: 'OAuth2 bearer credential owner', anomalies: 'Staging token leak' }
      ],
      connections: [
        { from: 'n2_4', to: 'n2_1', label: 'Uploaded Tampered EXIF Photo', strength: 'HIGH' },
        { from: 'n2_2', to: 'n2_3', label: 'Audio/Video Track Multiplexing', strength: 'CRITICAL' },
        { from: 'n2_4', to: 'n2_3', label: 'Published Deepfake Feed', strength: 'CRITICAL' }
      ]
    },
    // Case 3: Surveillance Camera Leak
    'FS-2026-112': {
      nodes: [
        { id: 'n3_1', label: 'vault_cctv_feed_tampered.mp4', type: 'video', info: '125 MB CCTV camera stream', anomalies: 'Looping video frame artifact at 02:14:10 UTC' },
        { id: 'n3_2', label: 'security_badge_scan.png', type: 'photo', info: 'Badge access scanner image', anomalies: 'Clone-stamp forged barcode' },
        { id: 'n3_3', label: 'wiretap_mic_recording.wav', type: 'audio', info: '18.2 MB room audio recording', anomalies: 'Acoustic frequency phase anomaly' },
        { id: 'n3_4', label: '10.200.4.12 (Surveillance Bus)', type: 'ip', info: 'Internal CCTV network switch', anomalies: 'RTSP stream interception' }
      ],
      connections: [
        { from: 'n3_4', to: 'n3_1', label: 'Intercepted Video Stream Feed', strength: 'CRITICAL' },
        { from: 'n3_2', to: 'n3_4', label: 'Badge Scan Gate Trigger', strength: 'HIGH' },
        { from: 'n3_3', to: 'n3_1', label: 'Audio-Visual Acoustic Sync', strength: 'WARNING' }
      ]
    },
    // Case 4: Classified Intercept
    'FS-2026-128': {
      nodes: [
        { id: 'n4_1', label: 'diplomatic_wire_intercept.mp3', type: 'audio', info: '9.4 MB encrypted wire recording', anomalies: 'Deepfake pitch shift detected' },
        { id: 'n4_2', label: 'satellite_imagery_spoofed.jpg', type: 'photo', info: '4.5 MB satellite JPEG capture', anomalies: 'Geo-coordinate EXIF manipulation' },
        { id: 'n4_3', label: 'Operator (SysAdmin Root)', type: 'user', info: 'Clearance Level 4 Master', anomalies: 'Active investigative oversight' }
      ],
      connections: [
        { from: 'n4_2', to: 'n4_1', label: 'Cross-reference Geo Audio Correlator', strength: 'HIGH' },
        { from: 'n4_3', to: 'n4_2', label: 'Cryptographic CoC Inspection', strength: 'INFO' }
      ]
    },
    // Case 5: Sovereign Ransomware
    'FS-2026-140': {
      nodes: [
        { id: 'n5_1', label: 'ransom_note_video_demand.mp4', type: 'video', info: '62 MB video extortion message', anomalies: 'AI avatar avatar voiceover rendering' },
        { id: 'n5_2', label: 'privilege_escalation_audit.log', type: 'file', info: '2.1 MB kernel syslog file', anomalies: 'Exploited CVE-2026-3810 overflow' },
        { id: 'n5_3', label: 'Kernel Mutex Handle', type: 'user', info: 'Kernel Space Ring 0 Process', anomalies: 'Ransomware memory hook' }
      ],
      connections: [
        { from: 'n5_2', to: 'n5_3', label: 'Buffer Overflow Kernel Exploit', strength: 'CRITICAL' },
        { from: 'n5_3', to: 'n5_1', label: 'Generated Extortion Video Payload', strength: 'HIGH' }
      ]
    }
  };

  // Build or fetch dynamic case graph
  const currentCaseNumber = currentCase.caseNumber || 'FS-2026-091';
  let activeGraph = predefinedGraphs[currentCaseNumber];

  if (!activeGraph) {
    // Dynamically build relationship graph from caseEvidence for custom/new cases
    const dynamicNodes = [
      { id: 'dn_case', label: currentCase.title || 'Forensic Case', type: 'user', info: `Case No: ${currentCase.caseNumber}`, anomalies: 'Active Investigation' }
    ];
    const dynamicConnections = [];

    caseEvidence.forEach((file, idx) => {
      const nid = `dn_file_${idx}`;
      const ext = file.fileName.split('.').pop().toLowerCase();
      let ftype = 'file';
      if (['jpg', 'png', 'jpeg', 'webp'].includes(ext)) ftype = 'photo';
      else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) ftype = 'video';
      else if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) ftype = 'audio';

      const firstAnom = file.anomalies && file.anomalies.length > 0 
        ? file.anomalies[0].message || file.anomalies[0].type 
        : 'SHA-256 Hashed Evidence File';

      dynamicNodes.push({
        id: nid,
        label: file.fileName,
        type: ftype,
        info: `${file.fileType} (${(file.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
        anomalies: firstAnom
      });

      dynamicConnections.push({
        from: 'dn_case',
        to: nid,
        label: `Linked Evidence File #${idx + 1}`,
        strength: file.anomalies && file.anomalies.length > 0 ? 'CRITICAL' : 'INFO'
      });
    });

    activeGraph = { nodes: dynamicNodes, connections: dynamicConnections };
  }

  const nodes = activeGraph.nodes;
  const connections = activeGraph.connections;

  // Auto-select first node if selection cleared or out of bounds
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [selectedCaseId, currentCaseNumber]);

  const activeNode = nodes.find(n => n.id === selectedNodeId) || nodes[0] || {};
  const activeNodeConnections = connections.filter(c => c.from === selectedNodeId || c.to === selectedNodeId);

  // Helper icon renderer
  const getNodeIcon = (type) => {
    switch (type) {
      case 'user': return <User size={14} />;
      case 'ip': return <Globe size={14} />;
      case 'photo': return <ImageIcon size={14} />;
      case 'video': return <Video size={14} />;
      case 'audio': return <Music size={14} />;
      default: return <File size={14} />;
    }
  };

  const getNodeColor = (type) => {
    switch (type) {
      case 'user': return 'bg-primary/20 text-primary';
      case 'ip': return 'bg-amber-500/20 text-amber-500';
      case 'photo': return 'bg-sky-500/20 text-sky-500';
      case 'video': return 'bg-purple-500/20 text-purple-500';
      case 'audio': return 'bg-emerald-500/20 text-emerald-500';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Navigation Header with Case Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-xl glassmorphism">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Network className="text-primary" size={22} />
            AI Entity Relationship Map
          </h2>
          <p className="text-xs text-muted mt-1">
            Separated forensic correlation graph mapping users, IPs, photos, videos, and audios per case.
          </p>
        </div>

        {/* Case Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <Folder size={16} className="text-primary" />
          <span className="text-xs font-bold text-muted uppercase">Select Case:</span>
          <select 
            value={selectedCaseId} 
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="bg-card text-foreground border rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Node Graph Canvas Panel */}
        <div className="lg:col-span-3 border rounded-2xl glassmorphism bg-grid-dots overflow-hidden relative min-h-[460px] flex flex-col justify-between p-6">
          
          {/* Overlay Spec */}
          <div className="absolute top-4 left-4 z-10 p-2 bg-background/80 border rounded-lg text-[9px] font-mono text-muted tracking-wider uppercase flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             Active Workspace: <strong className="text-foreground">{currentCase.caseNumber}</strong>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2 items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block animate-ping" />
            <span className="text-[9px] uppercase font-bold text-danger">Nodes Mapped ({nodes.length})</span>
          </div>

          {/* Interactive node elements mapped inside canvas */}
          <div className="relative flex-1 flex flex-wrap items-center justify-around gap-6 pt-14 pb-6">
            {nodes.map((node) => {
              const isActive = node.id === selectedNodeId;
              const hasCritical = (node.anomalies || '').toLowerCase().includes('brute') || 
                                  (node.anomalies || '').toLowerCase().includes('gan') || 
                                  (node.anomalies || '').toLowerCase().includes('face') || 
                                  (node.anomalies || '').toLowerCase().includes('cve') ||
                                  (node.anomalies || '').toLowerCase().includes('exif');

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-4 border rounded-xl glassmorphism text-left min-w-[200px] max-w-[250px] shadow relative hover:shadow-lg transition-all duration-300 hover:scale-105 select-none ${
                    isActive ? 'ring-2 ring-primary border-transparent bg-primary/10' : 'hover:border-primary/35'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${getNodeColor(node.type)}`}>
                      {getNodeIcon(node.type)}
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-muted block leading-none">{node.type}</span>
                      <span className="text-xs font-black text-foreground truncate max-w-[150px] inline-block">{node.label}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted truncate font-mono">{node.info}</p>

                  {/* Tampered Alerts blinker */}
                  {hasCritical && (
                    <div className="absolute -top-1.5 -right-1.5 bg-danger text-white p-1 rounded-full border shadow-sm">
                      <ShieldAlert size={12} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Visual representations of links summary */}
          <div className="border-t pt-4 mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-background/40 p-4 rounded-xl">
             {connections.map((c, idx) => {
               const fromNode = nodes.find(n => n.id === c.from);
               const toNode = nodes.find(n => n.id === c.to);
               return (
                 <div key={idx} className="text-[9px] font-mono leading-relaxed border-r last:border-none pr-3">
                    <div className="flex items-center gap-1 text-muted">
                      <span className="truncate max-w-[80px]">{fromNode ? fromNode.label.split(' ')[0] : c.from}</span>
                      <ArrowRight size={8} className="shrink-0" />
                      <span className="truncate max-w-[80px]">{toNode ? toNode.label.split(' ')[0] : c.to}</span>
                    </div>
                    <strong className="text-foreground block truncate">{c.label}</strong>
                    <span className={`text-[8px] font-black uppercase ${
                      c.strength === 'CRITICAL' ? 'text-danger' :
                      c.strength === 'HIGH' ? 'text-warning' :
                      'text-primary'
                    }`}>{c.strength} connection</span>
                 </div>
               );
             })}
          </div>

        </div>

        {/* Selected Node Inspector Sidebar */}
        <div className="space-y-4">
          
          {/* Card node properties */}
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-muted flex items-center gap-2 border-b pb-2">
              <Network size={14} className="text-primary" />
              Node Property Inspector
            </h3>

            {activeNode && activeNode.id ? (
              <>
                <div className="p-3 bg-card border rounded-lg flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${getNodeColor(activeNode.type)}`}>
                    {getNodeIcon(activeNode.type)}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-wider text-primary block">{activeNode.type} ID</span>
                    <h4 className="text-sm font-black text-foreground truncate max-w-[170px]">{activeNode.label}</h4>
                  </div>
                </div>

                <div className="space-y-3 text-[10px]">
                  <div>
                    <span className="text-muted block font-bold mb-0.5">TECHNICAL DETAILS</span>
                    <p className="text-foreground leading-relaxed font-mono bg-border/20 p-2 rounded">{activeNode.info}</p>
                  </div>

                  <div>
                    <span className="text-muted block font-bold text-danger mb-0.5">FLAGGED DISCREPANCIES</span>
                    <div className="p-2.5 border border-danger/30 bg-danger/10 rounded-lg text-danger font-bold leading-relaxed flex items-start gap-2">
                      <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                      <span>{activeNode.anomalies}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted">Select a node from the map to inspect properties.</p>
            )}
          </div>

          {/* Node connections lists */}
          <div className="border p-5 rounded-2xl glassmorphism space-y-3">
             <h3 className="text-xs uppercase font-bold tracking-wider text-muted border-b pb-2">
                Active Connections ({activeNodeConnections.length})
             </h3>
             <div className="space-y-2 max-h-[180px] overflow-y-auto">
               {activeNodeConnections.map((c, idx) => {
                 const otherNodeId = c.from === activeNode.id ? c.to : c.from;
                 const otherNode = nodes.find(n => n.id === otherNodeId);
                 return (
                   <div key={idx} className="p-2 border rounded-lg bg-card text-[9px] leading-relaxed">
                     <div className="flex justify-between items-center text-muted font-bold mb-1 border-b pb-1">
                       <span>Linked: {otherNode?.label.split(' ')[0] || otherNodeId}</span>
                       <span className={c.strength === 'CRITICAL' ? 'text-danger font-extrabold' : 'text-primary'}>{c.strength}</span>
                     </div>
                     <span className="text-foreground font-medium">{c.label}</span>
                   </div>
                 );
               })}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default RelationshipGraph;
