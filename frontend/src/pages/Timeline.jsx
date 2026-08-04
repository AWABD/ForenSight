import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { History, ShieldAlert, AlertTriangle, Info, Clock, Filter, Sparkles, CheckCircle2 } from 'lucide-react';

const Timeline = () => {
  const { caseTimeline } = useProject();
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  const filteredTimeline = caseTimeline.filter(event => {
    const matchesSeverity = filterSeverity === 'ALL' || event.severity === filterSeverity;
    const matchesType = filterType === 'ALL' || event.type === filterType;
    return matchesSeverity && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Temporal Narrative Timeline</h2>
          <p className="text-xs text-muted">Chronological reconstruction of analyzed events compiled from EXIF, log headers, and file system states.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Filter Type */}
          <div className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 bg-background text-xs font-semibold text-foreground">
            <Filter size={12} className="text-muted" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent focus:outline-none border-none py-0.5"
            >
              <option value="ALL">All Types</option>
              <option value="SYS_LOGIN">System Login</option>
              <option value="FILE_CREATE">File Creation</option>
              <option value="DB_DELETE">Database Deletion</option>
              <option value="METADATA_SPOOF">Metadata Alteration</option>
              <option value="AUDIO_CREATE">Synthetic Generation</option>
            </select>
          </div>

          {/* Filter Severity */}
          <div className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 bg-background text-xs font-semibold text-foreground">
            <Filter size={12} className="text-muted" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-transparent focus:outline-none border-none py-0.5"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">Information Only</option>
              <option value="WARNING">Warning States</option>
              <option value="HIGH">High Risks</option>
              <option value="CRITICAL">Critical Anomaly</option>
            </select>
          </div>

        </div>
      </div>

      {filteredTimeline.length > 0 ? (
        <div className="relative border rounded-2xl glassmorphism p-6 overflow-hidden">
          
          {/* Vertical central connector line */}
          <div className="absolute left-[2.35rem] top-10 bottom-10 w-0.5 bg-border dark:bg-slate-800" />

          {/* Events loops */}
          <div className="space-y-6 relative">
            {filteredTimeline.map((event) => {
              const dateObj = new Date(event.timestamp);
              const isCritical = event.severity === 'CRITICAL' || event.severity === 'HIGH';
              const isInfo = event.severity === 'INFO';

              return (
                <div key={event.id} className="flex gap-6 items-start relative group">
                  {/* Left bullet marker node based on severity */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-transform duration-300 group-hover:scale-110 shadow-sm ${
                    event.severity === 'CRITICAL' ? 'bg-danger/25 text-danger ring-4 ring-danger/10' :
                    event.severity === 'HIGH' ? 'bg-warning/25 text-warning ring-4 ring-warning/10' :
                    event.severity === 'WARNING' ? 'bg-accent/25 text-accent ring-4 ring-accent/10' :
                    'bg-primary/25 text-primary ring-4 ring-primary/10'
                  }`}>
                    {event.severity === 'CRITICAL' ? <ShieldAlert size={14} /> :
                     event.severity === 'HIGH' ? <AlertTriangle size={14} /> :
                     event.severity === 'WARNING' ? <Clock size={14} /> :
                     <Info size={14} />}
                  </div>

                  {/* Body Content Card Container */}
                  <div className="flex-1 border p-4 rounded-xl bg-card hover:bg-border/10 transition-colors shadow-sm relative">
                    
                    {/* Timestamp Headers */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b pb-2 mb-2 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-muted font-bold block">{event.timestamp.replace('T', ' ').replace('Z', ' UTC')}</span>
                        <span className="text-muted block">•</span>
                        <span className="text-muted font-semibold">Source File: <strong className="text-foreground">{event.source}</strong></span>
                      </div>
                      
                      <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded uppercase ${
                        event.severity === 'CRITICAL' ? 'bg-danger/10 text-danger' :
                        event.severity === 'HIGH' ? 'bg-warning/10 text-warning' :
                        event.severity === 'WARNING' ? 'bg-accent/10 text-accent' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {event.severity}
                      </span>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-foreground font-semibold leading-relaxed">
                      {event.description}
                    </p>

                    {/* Verification hash block linkage */}
                    <div className="mt-3 flex items-center gap-1.5 text-[8.5px] font-mono text-muted border-t pt-2">
                       <span>EVENT TYPE ID:</span> <span className="text-primary font-bold">{event.type}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-dashed p-10 rounded-2xl text-center text-muted">
          No chronology logs match active filter configurations.
        </div>
      )}
    </div>
  );
};

export default Timeline;
