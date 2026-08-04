import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProject } from '../contexts/ProjectContext';
import { 
  LayoutDashboard, 
  Briefcase, 
  FolderSync, 
  History, 
  Network, 
  Search, 
  BrainCircuit, 
  FileText, 
  TrendingUp, 
  UserCheck, 
  Sun, 
  Moon, 
  LogOut,
  FolderOpen,
  Fingerprint
} from 'lucide-react';

const Sidebar = ({ currentTab, setCurrentTab }) => {
  const { darkMode, toggleTheme } = useTheme();
  const { cases, selectedCaseId, setSelectedCaseId } = useProject();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', name: 'Case Management', icon: Briefcase },
    { id: 'upload', name: 'Evidence Upload', icon: FolderSync },
    { id: 'viewer', name: 'Evidence Viewer', icon: FolderOpen },
    { id: 'timeline', name: 'Temporal Timeline', icon: History },
    { id: 'graph', name: 'Relationship Graph', icon: Network },
    { id: 'search', name: 'Semantic Search', icon: Search },
    { id: 'ai', name: 'AI Explainability', icon: BrainCircuit },
    { id: 'report', name: 'Report Manager', icon: FileText },
    { id: 'admin', name: 'Admin Console', icon: UserCheck }
  ];

  return (
    <aside className="w-64 glassmorphism border-r h-screen fixed left-0 top-0 flex flex-col z-30 transition-transform duration-300">
      {/* Brand Header */}
      <div className="p-5 border-b flex items-center gap-3">
        <div className="bg-primary p-2 rounded-lg text-white animate-pulse">
          <Fingerprint size={24} />
        </div>
        <div>
          <h1 className="font-bold tracking-tight text-lg text-primary dark:text-forensic-glow">ForenSight</h1>
          <span className="text-[10px] text-muted tracking-wider uppercase font-semibold">AI Digital Forensics</span>
        </div>
      </div>

      {/* Active Cabinet Case Selector */}
      <div className="p-4 border-b">
        <label className="text-[10px] uppercase font-bold tracking-wider text-muted block mb-2">Active Case</label>
        <select 
          value={selectedCaseId} 
          onChange={(e) => setSelectedCaseId(e.target.value)}
          className="w-full text-xs bg-background border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.caseNumber} - {c.title.substring(0, 15)}...
            </option>
          ))}
        </select>
      </div>

      {/* Navigation Menus */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/20 dark:bg-primary dark:text-white dark:shadow-md dark:shadow-primary/10' 
                  : 'text-muted hover:bg-border/30 hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Themes & Logout */}
      <div className="p-4 border-t space-y-3">
        {/* Theme Switcher Toggle */}
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted hover:bg-border/30 hover:text-foreground transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            {darkMode ? <Sun size={14} className="text-warning" /> : <Moon size={14} className="text-primary" />}
            <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
          </div>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${darkMode ? 'bg-primary' : 'bg-muted/30'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-border/20 border border-border/30">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
            AS
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold truncate text-foreground">Dr. A. Sharma</h4>
            <span className="text-[9px] uppercase tracking-wider text-muted font-bold block">Lead Examiner</span>
          </div>
          <button 
            onClick={() => setCurrentTab('login')} 
            className="ml-auto p-1.5 text-muted hover:text-danger rounded-md hover:bg-danger/10 transition-colors"
            title="Log Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
