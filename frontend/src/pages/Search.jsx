import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Search as SearchIcon, BrainCircuit, ShieldAlert, Sliders, Play, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const Search = () => {
  const { cases } = useProject();
  const [query, setQuery] = useState('');
  const [minScore, setMinScore] = useState(0.70);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMethod, setSearchMethod] = useState('VECTOR'); // VECTOR, KEYWORD

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query) return;

    setSearching(true);
    // Simulate local spaCy tokenization parsing vector representations
    setTimeout(() => {
      setSearching(false);
      setSearchResults([
        {
          fileName: 'auth_syslog.log',
          matchType: 'LOG_LINE',
          relevance: 0.942,
          snippet: 'PAM authentication: password bypass token applied for user root at 08:11:15',
          explanations: 'Sentence Transformers mapped high cosine similarity (0.94) with target input "bypass authentication".'
        },
        {
          fileName: 'employee_record_tampered.jpg',
          matchType: 'OCR_TEXT',
          relevance: 0.814,
          snippet: 'Security credentials level 4 clearance validation badge stamped.',
          explanations: 'OCR engine (EasyOCR) scanned graphic text, resulting in a vector similarity match.'
        },
        {
          fileName: 'source_repository_logs.csv',
          matchType: 'GIT_LOG',
          relevance: 0.725,
          snippet: 'Dev workspace: bypass token generated for ssh key auth validation.',
          explanations: 'Local BERT token alignments identify similar contextual intent.'
        }
      ].filter(r => r.relevance >= minScore));
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">AI Semantic Vector Search</h2>
        <p className="text-xs text-muted">Locates contextually relevant syslog events, OCR textual components, and databases, even without matching keywords.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Search Console panels */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Query Bar Form Card */}
          <div className="border p-5 rounded-2xl glassmorphism space-y-4 shadow">
            
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  placeholder="e.g. bypass authentication credentials or deleted registry hashes"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-background border rounded-lg px-10 py-3 text-xs text-foreground placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-semibold font-mono"
                />
                <SearchIcon size={16} className="absolute left-3.5 top-3.5 text-muted" />
              </div>

              <button
                type="submit"
                disabled={searching}
                className="bg-primary hover:bg-primary-dark text-white rounded-lg px-6 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Play size={12} />}
                <span>{searching ? 'Parsing Vectors...' : 'Search'}</span>
              </button>
            </form>

            {/* Quick configurations tabs */}
            <div className="flex items-center justify-between text-[10px] text-muted border-t pt-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="searchMethod"
                    checked={searchMethod === 'VECTOR'}
                    onChange={() => setSearchMethod('VECTOR')}
                    className="accent-primary"
                  />
                  <strong>Local Vector Engine (Transformers)</strong>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="searchMethod"
                    checked={searchMethod === 'KEYWORD'}
                    onChange={() => setSearchMethod('KEYWORD')}
                    className="accent-primary"
                  />
                  <span>Exact Keyword Indexer</span>
                </label>
              </div>

              <span className="font-mono">Processing: 100% On-Host GPU Pool</span>
            </div>

          </div>

          {/* Results list */}
          <div className="space-y-4">
            
            {searching ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 size={40} className="text-primary animate-spin" />
                <span className="text-xs font-bold text-primary animate-pulse">Running local Sentence-Transformers cosine distances...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((res, idx) => (
                <div key={idx} className="border p-5 rounded-xl glassmorphism space-y-3 hover:border-primary/40 transition-colors animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted pl-1">Matching File: <strong className="text-foreground">{res.fileName}</strong></span>
                      <span className="text-muted">•</span>
                      <span className="text-[9px] bg-primary/10 text-primary dark:text-forensic-glow px-2 py-0.5 rounded font-black uppercase">{res.matchType}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted">Cosine Score:</span>
                      <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded ${
                        res.relevance >= 0.85 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                      }`}>
                        {(res.relevance * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-mono bg-border/20 p-3 rounded border text-foreground leading-relaxed">
                    "{res.snippet}"
                  </p>

                  <div className="flex gap-2 items-start text-[10px] bg-primary/5 p-2.5 rounded-lg border border-primary/10">
                    <BrainCircuit size={14} className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted leading-relaxed font-semibold">{res.explanations}</p>
                  </div>
                </div>
              ))
            ) : query ? (
              <div className="border border-dashed p-10 rounded-2xl text-center text-muted text-xs">
                No matching indexes exceed vector filter thresholds. Try lowering similarity criteria.
              </div>
            ) : (
              <div className="border border-dashed p-14 rounded-2xl text-center text-muted text-xs">
                 Enter search criteria to start scanning.
              </div>
            )}

          </div>

        </div>

        {/* Filter Sliders Sidebar */}
        <div className="space-y-4">
          <div className="border p-5 rounded-2xl glassmorphism space-y-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-muted flex items-center gap-1.5">
              <Sliders size={14} className="text-primary" />
              Weight Configs
            </h3>

            <div className="space-y-4 text-[10px]">
              <div>
                <label className="text-muted font-bold block mb-1">MIN Similarity Coefficient Score (Cosine): {(minScore * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={minScore}
                  onChange={(e) => setMinScore(parseFloat(e.target.value))}
                  className="w-full accent-primary bg-border h-1 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <span className="text-muted block font-semibold mb-1">Pre-trained ML Model Loaded</span>
                <div className="p-2 border rounded bg-background/50 font-mono text-[9px] text-muted">
                  sentence-transformers/all-MiniLM-L6-v2 (Local weight file hashes verified)
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Search;
