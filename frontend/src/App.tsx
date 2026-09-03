import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/History';
import { AlertsPage } from './pages/Alerts';
import { SettingsPage } from './pages/Settings';
import { AIAssistantPage } from './pages/AIAssistant';

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <div className="app-layout" style={{ flexDirection: 'column' }}>
          <Header />
          <div className="app-layout" style={{ flex: 1, overflow: 'hidden' }}>
            <Sidebar />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ai" element={<AIAssistantPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </LanguageProvider>
    </BrowserRouter>
  );
}
