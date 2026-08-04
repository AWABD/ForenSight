import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Network, Search, AlertCircle, Share2, Info, ArrowRight, User, Globe, File, ShieldAlert } from 'lucide-react';

const RelationshipGraph = () => {
  const { activeCase } = useProject();
  const [selectedNodeId, setSelectedNodeId] = useState('n1');

  // Realistic mock nodes representing evidence entities
  const nodes = [
    { id: 'n1', label: 'Admin (System Root)', type: 'user', info: 'UID: 0, login trace on SSH root terminal', anomalies: 'Brute force connection bypassed' },
    { id: 'n2', label: '192.168.12.93', type: 'ip', info: 'Inbound SSH socket pool client, ISP New Delhi', anomalies: '142 failed login requests before penetration' },
    { id: 'n3', label: 'db_ledger_dump.sqlite', type: 'file', info: 'Contains corp balance transaction database', anomalies: '12 deleted ledger transactions' },
    { id: 'n4', label: 'dev_compromised@corp.com', type: 'user', info: 'Staging deployment auth token owner', anomalies: 'Credentials leaked key' },
    { id: 'n5', label: 'agent_metadata_exif.jpg', type: 'file', info: 'Stored photographic validation card', anomalies: 'Metadata GPS matches client network logs' }
  ];

  // Visual mapping parameters for nodes inside the mock canvas
  const connections = [
    { from: 'n2', to: 'n1', label: 'Unauthorized SSH handshakes', strength: 'CRITICAL' },
    { from: 'n1', to: 'n3', label: 'Executed SQL DELETE queries', strength: 'HIGH' },
    { from: 'n4', to: 'n1', label: 'Access tokens compromise root tty1', strength: 'WARNING' },
    { from: 'n2', to: 'n5', label: 'Image uploaded by target client IP', strength: 'INFO' }
  ];

  const activeNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];
  const activeNodeConnections = connections.filter(c => c.from === selectedNodeId || c.to === selectedNodeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">AI Entity Relationship Map</h2>
        <p className="text-xs text-muted">Correlated cross-references mapping users, client IP addresses, database schemas, and media files.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Node Graph Panel canvas */}
        <div className="lg:col-span-3 border rounded-2xl glassmorphism bg-grid-dots overflow-hidden relative min-h-[460px] flex flex-col justify-between p-6">
          
          {/* Overlay Spec */}
          <div className="absolute top-4 left-4 z-10 p-2 bg-background/80 border rounded-lg text-[9px] font-mono text-muted tracking-wider uppercase">
             Orchestrator: Graph correlation enabled
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block animate-ping" />
            <span className="text-[9px] uppercase font-bold text-danger">Threats Flagged</span>
          </div>

          {/* Interactive node elements mapped inside sandbox layout */}
          <div className="relative flex-1 flex flex-wrap items-center justify-around gap-6 pt-12">
            {nodes.map((node) => {
              const isActive = node.id === selectedNodeId;
              const hasCritical = node.anomalies.includes('Brute') || node.anomalies.includes('12') || node.anomalies.includes('142');

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-4 border rounded-xl glassmorphism text-left min-w-[200px] max-w-[240px] shadow relative hover:shadow-lg transition-transform duration-300 hover:scale-105 select-none ${
                    isActive ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/35'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${
                      node.type === 'user' ? 'bg-primary/20 text-primary' :
                      node.type === 'ip' ? 'bg-accent/20 text-accent' :
                      'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {node.type === 'user' ? <User size={14} /> :
                       node.type === 'ip' ? <Globe size={14} /> :
                       <File size={14} />}
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted block leading-none">{node.type}</span>
                      <span className="text-xs font-black text-foreground truncate max-w-[150px] inline-block">{node.label}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted truncate">{node.info}</p>

                  {/* Tampered Alerts blinker */}
                  {hasCritical && (
                    <div className="absolute -top-1.5 -right-1.5 bg-danger text-white p-1 rounded-full border shadow-sm">
                      <ShieldAlert size={10} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Visual representations of links summary */}
          <div className="border-t pt-4 mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-background/40 p-4 rounded-xl">
             {connections.map((c, idx) => (
               <div key={idx} className="text-[9px] font-mono leading-relaxed border-r last:border-none pr-3">
                  <div className="flex items-center gap-1 text-muted">
                    <span>From Node: {nodes.find(n => n.id === c.from)?.label.split(' ')[0]}</span>
                    <ArrowRight size={8} />
                    <span>To: {nodes.find(n => n.id === c.to)?.label.split(' ')[0]}</span>
                  </div>
                  <strong className="text-foreground block">{c.label}</strong>
                  <span className={`text-[8px] font-black uppercase ${
                    c.strength === 'CRITICAL' ? 'text-danger' :
                    c.strength === 'HIGH' ? 'text-warning' :
                    'text-primary'
                  }`}>{c.strength} connection</span>
               </div>
             ))}
          </div>

        </div>

        {/* Selected Node Inspector Sidebar */}
        <div className="space-y-4">
          
          {/* Card node properties */}
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-muted flex items-center gap-2">
              <Network size={14} className="text-primary" />
              Node Inspector
            </h3>

            <div className="p-3 bg-border/20 border rounded-lg">
              <span className="text-[9px] uppercase font-black tracking-wider text-primary block mb-0.5">{activeNode.type} ID</span>
              <h4 className="text-sm font-black text-foreground">{activeNode.label}</h4>
            </div>

            <div className="space-y-3 text-[10px]">
              <div>
                <span className="text-muted block font-semibold mb-0.5">METADATA SUMMARY</span>
                <p className="text-foreground leading-relaxed font-mono">{activeNode.info}</p>
              </div>

              <div>
                <span className="text-muted block font-semibold text-danger mb-0.5">FLAGGED DISCREPANCIES</span>
                <div className="p-2 border border-danger/20 bg-danger/5 rounded text-danger font-semibold leading-relaxed">
                  {activeNode.anomalies}
                </div>
              </div>
            </div>
          </div>

          {/* Node connections lists */}
          <div className="border p-5 rounded-2xl glassmorphism space-y-3">
             <h3 className="text-xs uppercase font-bold tracking-wider text-muted">
                Active Connections ({activeNodeConnections.length})
             </h3>
             <div className="space-y-2">
               {activeNodeConnections.map((c, idx) => {
                 const otherNodeId = c.from === selectedNodeId ? c.to : c.from;
                 const otherNode = nodes.find(n => n.id === otherNodeId);
                 return (
                   <div key={idx} className="p-2 border rounded-lg bg-card text-[9px] leading-relaxed">
                     <div className="flex justify-between items-center text-muted font-bold mb-1 border-b pb-1">
                       <span>Link: {otherNode?.label.split(' ')[0]}</span>
                       <span className={c.strength === 'CRITICAL' ? 'text-danger' : 'text-primary'}>{c.strength}</span>
                     </div>
                     <span className="text-foreground">{c.label}</span>
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
