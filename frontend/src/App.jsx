import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import EvidenceUpload from './pages/EvidenceUpload';
import EvidenceViewer from './pages/EvidenceViewer';
import Timeline from './pages/Timeline';
import RelationshipGraph from './pages/RelationshipGraph';
import Search from './pages/Search';
import AISummary from './pages/AISummary';
import ReportViewer from './pages/ReportViewer';
import Admin from './pages/Admin';
import { AlertCircle } from 'lucide-react';

const AppContent = () => {
  const { darkMode } = useTheme();
  const [currentTab, setCurrentTab] = useState('login'); // Always start in login portal
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const timerRef = useRef(null);

  // 1. Force Logout on Browser Refresh (F5 / Page Reload)
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentTab('login');
  }, []);

  // 2. 5-Minute Inactivity Auto-Logout Handler
  const resetInactivityTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Only set inactivity timer if user is currently logged into the app
    if (currentTab !== 'login' && currentTab !== 'register') {
      const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
      timerRef.current = setTimeout(() => {
        // Auto-logout user after 5 minutes of inactivity
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setSessionExpiredNotice(true);
        setCurrentTab('login');
      }, INACTIVITY_LIMIT_MS);
    }
  };

  useEffect(() => {
    // User interaction activity events
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    
    // Register activity listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Start timer on tab change
    resetInactivityTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [currentTab]);

  // If login or register, bypass sidebar layout wrapper
  if (currentTab === 'login') {
    return (
      <div className="relative">
        {sessionExpiredNotice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-danger/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/20 animate-shake">
            <AlertCircle size={20} />
            <span className="text-xs font-extrabold tracking-wide">
              SESSION EXPIRED: Automatically logged out due to 5 minutes of inactivity. Please log in again.
            </span>
            <button 
              onClick={() => setSessionExpiredNotice(false)} 
              className="ml-4 font-black hover:opacity-80 text-xs bg-black/20 px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>
        )}
        <Login 
          onLoginSuccess={() => {
            setSessionExpiredNotice(false);
            setCurrentTab('dashboard');
          }} 
          onGoToRegister={() => setCurrentTab('register')} 
        />
      </div>
    );
  }

  if (currentTab === 'register') {
    return (
      <Register 
        onGoToLogin={() => setCurrentTab('login')} 
      />
    );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-forensic-navy text-foreground' : 'bg-slate-50 text-foreground'}`}>
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Sandbox Viewport */}
      <main className="flex-1 min-h-screen ml-64 p-8 overflow-x-hidden relative">
        {/* Glow Effects in Forensic Dark Mode */}
        {darkMode && (
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
        )}
        
        <div className="relative z-10 max-w-7xl mx-auto animate-fade-in">
          {currentTab === 'dashboard' && <Dashboard setCurrentTab={setCurrentTab} />}
          {currentTab === 'cases' && <Cases />}
          {currentTab === 'upload' && <EvidenceUpload />}
          {currentTab === 'viewer' && <EvidenceViewer />}
          {currentTab === 'timeline' && <Timeline />}
          {currentTab === 'graph' && <RelationshipGraph />}
          {currentTab === 'search' && <Search />}
          {currentTab === 'ai' && <AISummary />}
          {currentTab === 'report' && <ReportViewer />}
          {currentTab === 'admin' && <Admin />}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;
