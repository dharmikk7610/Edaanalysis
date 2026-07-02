import React, { useState, useEffect } from 'react';
import { 
  LandingPage 
} from './pages/LandingPage';
import { 
  UploadDataset 
} from './pages/UploadDataset';
import { 
  DataPreview 
} from './pages/DataPreview';
import { 
  CleaningDashboard 
} from './pages/CleaningDashboard';
import { 
  OutliersDashboard 
} from './pages/OutliersDashboard';
import { 
  FeatureEngineering 
} from './pages/FeatureEngineering';
import { 
  EdaDashboard 
} from './pages/EdaDashboard';
import { 
  Visualizations 
} from './pages/Visualizations';
import { 
  InsightsDashboard 
} from './pages/InsightsDashboard';
import { 
  ExportDashboard 
} from './pages/ExportDashboard';

// Import new page views
import { 
  ExecutiveDashboard 
} from './pages/ExecutiveDashboard';
import { 
  ChatAiPanel 
} from './pages/ChatAiPanel';
import { 
  MissingValueDashboard 
} from './pages/MissingValueDashboard';
import { 
  ColumnProfileExplorer 
} from './pages/ColumnProfileExplorer';
import { 
  TransformationHistory 
} from './pages/TransformationHistory';

import { 
  Sparkles, Eye, Settings, ShieldAlert, Cpu, BarChart3, 
  AreaChart, Brain, Download, Sun, Moon, Database, LogOut, RotateCcw,
  LayoutDashboard, MessageSquare, EyeOff, Info, Activity
} from 'lucide-react';
import axios from 'axios';

type ActivePage = 
  | 'landing' 
  | 'upload' 
  | 'executive'
  | 'chat'
  | 'preview' 
  | 'profile'
  | 'clean' 
  | 'missing'
  | 'outliers' 
  | 'features' 
  | 'eda' 
  | 'visuals' 
  | 'insights' 
  | 'history'
  | 'export';

interface DatasetState {
  sessionId: string | null;
  filename: string | null;
  rowsCount: number;
  colsCount: number;
  columns: string[];
  columnTypes: Record<string, string>;
  previewData: any[];
  cleaningLogs: string[];
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activePage, setActivePage] = useState<ActivePage>('landing');
  const [dataset, setDataset] = useState<DatasetState>({
    sessionId: null,
    filename: null,
    rowsCount: 0,
    colsCount: 0,
    columns: [],
    columnTypes: {},
    previewData: [],
    cleaningLogs: []
  });

  // Parameterized navigation state for Visuals Playground
  const [visualsParams, setVisualsParams] = useState<any>(null);

  // Load and apply theme class
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleUploadSuccess = (data: any) => {
    setDataset({
      sessionId: data.session_id,
      filename: data.filename,
      rowsCount: data.rows,
      colsCount: data.columns_count,
      columns: data.columns,
      columnTypes: data.column_types,
      previewData: data.preview,
      cleaningLogs: ["File uploaded and loaded in-memory."]
    });
    // Redirect to the Executive Dashboard first!
    setActivePage('executive');
  };

  const handleCleaningComplete = (data: any) => {
    setDataset(prev => ({
      ...prev,
      previewData: data.preview,
      columns: data.columns,
      rowsCount: data.rows_after,
      colsCount: data.cols_after,
      cleaningLogs: data.logs
    }));
  };

  const handleOutliersRemoved = (newRowsCount: number, preview: any[]) => {
    setDataset(prev => ({
      ...prev,
      rowsCount: newRowsCount,
      previewData: preview
    }));
  };

  const handleEngineeringComplete = (preview: any[], cols: string[], logs: string[]) => {
    setDataset(prev => ({
      ...prev,
      previewData: preview,
      columns: cols,
      cleaningLogs: [...prev.cleaningLogs, ...logs]
    }));
  };

  const handleReset = async () => {
    if (!dataset.sessionId) return;
    if (!window.confirm("Are you sure you want to revert all cleaning and feature scaling changes?")) return;
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/reset', {
        session_id: dataset.sessionId
      });
      setDataset({
        sessionId: dataset.sessionId,
        filename: dataset.filename,
        rowsCount: response.data.rows,
        colsCount: response.data.columns.length,
        columns: response.data.columns,
        columnTypes: response.data.column_types,
        previewData: response.data.preview,
        cleaningLogs: response.data.logs
      });
      alert("Dataset reverted to original upload state!");
      setActivePage('executive');
    } catch (err) {
      alert("Failed to reset dataset.");
    }
  };

  const handleUnloadDataset = () => {
    if (window.confirm("Close current dataset? In-memory data will be cleared.")) {
      setDataset({
        sessionId: null,
        filename: null,
        rowsCount: 0,
        colsCount: 0,
        columns: [],
        columnTypes: {},
        previewData: [],
        cleaningLogs: []
      });
      setActivePage('landing');
    }
  };

  // Safe navigation handler supporting parameter transfers
  const handleNavigate = (page: ActivePage, params?: any) => {
    if (page === 'visuals' && params) {
      setVisualsParams(params);
    }
    setActivePage(page);
  };

  // Helper lists of numeric columns for child views
  const numericColumns = dataset.columns.filter(
    col => dataset.columnTypes[col] === 'Numeric'
  );

  // Sidebar item list helper
  const sidebarItems = [
    { id: 'executive', label: 'Executive Cockpit', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'chat', label: 'AI Scientist Panel', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'preview', label: 'Data Preview', icon: <Eye className="w-4 h-4" /> },
    { id: 'profile', label: 'Column Profiles', icon: <Info className="w-4 h-4" /> },
    { id: 'clean', label: 'Auto Cleaning', icon: <Settings className="w-4 h-4" /> },
    { id: 'missing', label: 'Missing Values', icon: <EyeOff className="w-4 h-4" /> },
    { id: 'outliers', label: 'Outliers Detection', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'features', label: 'Features scale/encode', icon: <Cpu className="w-4 h-4" /> },
    { id: 'eda', label: 'EDA Statistics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'visuals', label: 'Charts Playground', icon: <AreaChart className="w-4 h-4" /> },
    { id: 'insights', label: 'AI Business Insights', icon: <Brain className="w-4 h-4" /> },
    { id: 'history', label: 'Operations History', icon: <Activity className="w-4 h-4" /> },
    { id: 'export', label: 'Export Report', icon: <Download className="w-4 h-4" /> },
  ];

  // Render main layout based on active tab
  if (activePage === 'landing') {
    return <LandingPage onStart={() => setActivePage(dataset.sessionId ? 'executive' : 'upload')} />;
  }

  return (
    <div className="min-h-screen flex bg-bgLight dark:bg-bgDark transition-colors duration-300 relative text-slate-800 dark:text-slate-100">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/5 dark:bg-blue-600/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-500/5 dark:bg-teal-600/3 blur-[120px] pointer-events-none" />

      {/* Interactive Left Sidebar */}
      <aside className="w-64 lg:w-72 flex-shrink-0 bg-white/40 dark:bg-bgDark/45 backdrop-blur-xl border-r border-slate-150/15 dark:border-slate-850/20 flex flex-col justify-between p-4 z-10 sticky top-0 h-screen select-none">
        <div className="space-y-6 flex-grow flex flex-col min-h-0">
          {/* Sidebar Logo */}
          <div className="flex items-center gap-2 px-2 py-1 cursor-pointer flex-shrink-0" onClick={() => setActivePage('landing')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center shadow shadow-blue-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              InsightAI
            </span>
          </div>

          {/* Active Dataset Panel */}
          {dataset.sessionId && (
            <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/5 space-y-2 flex-shrink-0">
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-blue-500 font-bold max-w-[85%]">
                  <Database className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate" title={dataset.filename || ''}>{dataset.filename}</span>
                </div>
                <button 
                  onClick={handleUnloadDataset}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-200 rounded cursor-pointer"
                  title="Close dataset"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-4 text-[10px] text-slate-400 font-medium">
                <span>{dataset.rowsCount.toLocaleString()} rows</span>
                <span>{dataset.colsCount} cols</span>
              </div>
              
              <button
                onClick={handleReset}
                className="w-full mt-2.5 py-1 px-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-500 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/5 dark:border-slate-800 rounded flex items-center justify-center gap-1 hover:bg-blue-500/10 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Revert Changes
              </button>
            </div>
          )}

          {/* Navigation Links (Scrollable to prevent cutting off new options) */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-1.5 min-h-0">
            <button
              onClick={() => handleNavigate('upload')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                activePage === 'upload'
                  ? 'bg-blue-650/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <Database className="w-4 h-4" />
              Upload Area
            </button>

            {sidebarItems.map(item => {
              const isDisabled = !dataset.sessionId;
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  disabled={isDisabled}
                  onClick={() => handleNavigate(item.id as any)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-650/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-extrabold'
                      : isDisabled
                      ? 'opacity-25 cursor-not-allowed text-slate-500'
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-100/10 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/5 text-slate-500 dark:text-slate-400 flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-450" />}
              {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Toggle</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-8 overflow-y-auto max-w-7xl mx-auto z-10">
        {activePage === 'upload' && (
          <UploadDataset onUploadSuccess={handleUploadSuccess} />
        )}
        
        {activePage === 'executive' && dataset.sessionId && (
          <ExecutiveDashboard
            session_id={dataset.sessionId}
            filename={dataset.filename || ''}
            rows={dataset.rowsCount}
            cols={dataset.colsCount}
            columns={dataset.columns}
            columnTypes={dataset.columnTypes}
            onNavigate={handleNavigate}
          />
        )}

        {activePage === 'chat' && dataset.sessionId && (
          <ChatAiPanel
            session_id={dataset.sessionId}
            columns={dataset.columns}
          />
        )}

        {activePage === 'preview' && dataset.sessionId && (
          <DataPreview
            filename={dataset.filename || ''}
            rowsCount={dataset.rowsCount}
            colsCount={dataset.colsCount}
            columns={dataset.columns}
            columnTypes={dataset.columnTypes}
            previewData={dataset.previewData}
          />
        )}

        {activePage === 'profile' && dataset.sessionId && (
          <ColumnProfileExplorer session_id={dataset.sessionId} />
        )}

        {activePage === 'clean' && dataset.sessionId && (
          <CleaningDashboard
            session_id={dataset.sessionId}
            filename={dataset.filename || ''}
            rows={dataset.rowsCount}
            columns_count={dataset.colsCount}
            onCleaningComplete={handleCleaningComplete}
          />
        )}

        {activePage === 'missing' && dataset.sessionId && (
          <MissingValueDashboard session_id={dataset.sessionId} />
        )}

        {activePage === 'outliers' && dataset.sessionId && (
          <OutliersDashboard
            session_id={dataset.sessionId}
            numericColumns={numericColumns}
            onOutliersRemoved={handleOutliersRemoved}
          />
        )}

        {activePage === 'features' && dataset.sessionId && (
          <FeatureEngineering
            session_id={dataset.sessionId}
            columns={dataset.columns}
            numericColumns={numericColumns}
            columnTypes={dataset.columnTypes}
            onEngineeringComplete={handleEngineeringComplete}
          />
        )}

        {activePage === 'eda' && dataset.sessionId && (
          <EdaDashboard session_id={dataset.sessionId} />
        )}

        {activePage === 'visuals' && dataset.sessionId && (
          <Visualizations
            session_id={dataset.sessionId}
            columns={dataset.columns}
            numericColumns={numericColumns}
            // Pass visualsParams down and clear them
            {...(visualsParams ? { defaultParams: visualsParams } : {})}
            onParamsHandled={() => setVisualsParams(null)}
          />
        )}

        {activePage === 'insights' && dataset.sessionId && (
          <InsightsDashboard
            session_id={dataset.sessionId}
            columns={dataset.columns}
          />
        )}

        {activePage === 'history' && dataset.sessionId && (
          <TransformationHistory session_id={dataset.sessionId} />
        )}

        {activePage === 'export' && dataset.sessionId && (
          <ExportDashboard
            session_id={dataset.sessionId}
            filename={dataset.filename || ''}
            columns={dataset.columns}
          />
        )}
      </main>
    </div>
  );
}
