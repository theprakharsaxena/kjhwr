import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/OverviewPage';
import { ForecastTimelinePage } from './pages/ForecastTimelinePage';
import { AccuracyPage } from './pages/AccuracyPage';
import { ForecastHistoryPage } from './pages/ForecastHistoryPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const location = useLocation();

  const getPageHeaderProps = () => {
    switch (location.pathname) {
      case '/overview':
      case '/':
        return {
          title: 'Procurement Overview',
          subtitle: 'Day-ahead wind forecast position and daily variance for wholesale procurement',
          exportUrl: api.getExportCsvUrl('2026-01-01', '2026-01-01')
        };
      case '/timeline':
        return {
          title: 'Forecast Timeline',
          subtitle: 'Half-hourly generation profile: forecast vs actual generation',
          exportUrl: api.getExportCsvUrl('2026-01-01', '2026-01-31')
        };
      case '/accuracy':
        return {
          title: 'Forecast Accuracy',
          subtitle: 'Quantitative evaluation of forecast errors across January 2026',
          exportUrl: api.getExportCsvUrl('2026-01-01', '2026-01-31')
        };
      case '/history':
        return {
          title: 'Publication History',
          subtitle: 'Forecast vintage progression and decision cutoff inspection',
          exportUrl: api.getExportCsvUrl('2026-01-01', '2026-01-31')
        };
      case '/quality':
        return {
          title: 'Data Quality & Notes',
          subtitle: 'Elexon BMRS dataset coverage, normalization, and analytical methodology',
          exportUrl: api.getExportCsvUrl('2026-01-01', '2026-01-31')
        };
      default:
        return {
          title: 'WindScope',
          subtitle: 'Day-Ahead Wind Forecast Intelligence'
        };
    }
  };

  const headerProps = getPageHeaderProps();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-60 min-w-0 flex flex-col">
        <Header
          title={headerProps.title}
          subtitle={headerProps.subtitle}
          exportUrl={headerProps.exportUrl}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/timeline" element={<ForecastTimelinePage />} />
            <Route path="/accuracy" element={<AccuracyPage />} />
            <Route path="/history" element={<ForecastHistoryPage />} />
            <Route path="/quality" element={<DataQualityPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
