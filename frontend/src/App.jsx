import React, { useState } from 'react';
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

const AppContent = () => {
  const { darkMode } = useTheme();
  const [currentTab, setCurrentTab] = useState('login'); // Start in login portal

  // If login or register, bypass sidebar layout wrapper
  if (currentTab === 'login') {
    return (
      <Login 
        onLoginSuccess={() => setCurrentTab('dashboard')} 
        onGoToRegister={() => setCurrentTab('register')} 
      />
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
