import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ArrowRight, ShieldCheck, Sparkles, RefreshCw, Archive } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExportDashboardProps {
  session_id: string;
  filename: string;
  columns: string[];
}

export const ExportDashboard: React.FC<ExportDashboardProps> = ({
  session_id,
  filename,
  columns
}) => {
  const [targetCol, setTargetCol] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;

  const triggerDownload = async (url: string, defaultName: string, key: string) => {
    setDownloading(key);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert("Failed to export file. Make sure the backend is active.");
    } finally {
      setDownloading(null);
    }
  };

  const handleExportCsv = () => {
    triggerDownload(
      `http://127.0.0.1:8000/api/export/csv?session_id=${session_id}`,
      `${baseName}_cleaned.csv`,
      'csv'
    );
  };

  const handleExportExcel = () => {
    triggerDownload(
      `http://127.0.0.1:8000/api/export/excel?session_id=${session_id}`,
      `${baseName}_cleaned.xlsx`,
      'excel'
    );
  };

  const handleExportPdf = () => {
    const targetQuery = targetCol ? `&target_col=${targetCol}` : '';
    triggerDownload(
      `http://127.0.0.1:8000/api/export/pdf?session_id=${session_id}${targetQuery}`,
      `${baseName}_EDA_Report.pdf`,
      'pdf'
    );
  };

  const handleExportZip = () => {
    const targetQuery = targetCol ? `&target_col=${targetCol}` : '';
    triggerDownload(
      `http://127.0.0.1:8000/api/export/zip?session_id=${session_id}${targetQuery}`,
      `${baseName}_Analytics_Archive.zip`,
      'zip'
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-7 h-7 text-blue-500" />
            Export & Report Centre
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Export the final clean files, generate the analytical report, or download the entire analysis ZIP package.
          </p>
        </div>
      </div>

      {/* Hero: Download All ZIP Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-3xl bg-gradient-to-r from-blue-650/15 via-indigo-650/10 to-transparent border-blue-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/15 rounded-xl text-blue-500">
              <Archive className="w-5 h-5 animate-bounce" />
            </span>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              Download All Assets (.zip)
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-extrabold uppercase">
                Highly Recommended
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Download a single compressed folder package containing the cleaned CSV data sheets, clean Excel workbook, the Executive PDF EDA report, and four diagnostic charts (PNGs) generated from Python's Seaborn engine.
          </p>
          {/* Target Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-[10px]">Model Feature Target:</span>
            <select
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-blue-650 dark:text-blue-450 cursor-pointer text-[10px]"
            >
              <option value="">-- None --</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleExportZip}
          disabled={downloading !== null}
          className="w-full md:w-auto px-8 py-4.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex justify-center items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer disabled:opacity-40 select-none"
        >
          {downloading === 'zip' ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Archive className="w-4.5 h-4.5" />}
          Download ZIP Package
        </button>
      </motion.div>

      {/* Grid of Individual exports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cleaned CSV card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[285px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-450 flex items-center justify-center mb-5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Export Cleaned CSV</h3>
            <p className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed">
              Downloads the cleaned dataset in standard CSV formatting. Duplicates, constants, empty columns, and formatting symbols removed.
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={downloading !== null}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-850 text-white text-xs font-bold flex justify-center items-center gap-2 shadow transition-all cursor-pointer disabled:opacity-40"
          >
            {downloading === 'csv' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download CSV
          </button>
        </div>

        {/* Cleaned Excel card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[285px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Export Cleaned Excel</h3>
            <p className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed">
              Downloads the cleaned dataset inside an Excel worksheet (`.xlsx`). Imputed values, dates, and numbers structured as standard rows.
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={downloading !== null}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-850 text-white text-xs font-bold flex justify-center items-center gap-2 shadow transition-all cursor-pointer disabled:opacity-40"
          >
            {downloading === 'excel' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Excel (.xlsx)
          </button>
        </div>

        {/* PDF Report card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[285px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              Generate Report PDF
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-extrabold text-[9px] uppercase tracking-wide">
                Executive
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed">
              Compiles overview stats, schema metadata tables, data quality audits, linear correlation plots, and Recommendations into a styled PDF.
            </p>
          </div>
          
          <button
            onClick={handleExportPdf}
            disabled={downloading !== null}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-850 text-white text-xs font-bold flex justify-center items-center gap-2 shadow transition-all cursor-pointer disabled:opacity-40"
          >
            {downloading === 'pdf' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generate & Download PDF
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="glass-panel p-4.5 rounded-2xl flex items-center gap-3 border-slate-200/20 max-w-xl mx-auto mt-12 bg-slate-50/10">
        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/10 flex items-center justify-center text-slate-505 dark:text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Local Privacy Safe</span>
          <span className="block text-[10px] text-slate-400 mt-0.5 leading-relaxed">
            All files are parsed and kept in-memory. They are not stored on any remote cloud server or stored permanently. Disposed on session reset.
          </span>
        </div>
      </div>
    </div>
  );
};
