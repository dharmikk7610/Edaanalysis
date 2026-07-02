import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, CheckCircle, Database, RefreshCw, Terminal, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import confetti from 'canvas-confetti';

interface CleaningDashboardProps {
  session_id: string;
  filename: string;
  rows: number;
  columns_count: number;
  onCleaningComplete: (data: {
    preview: any[];
    columns: string[];
    rows_after: number;
    cols_after: number;
    logs: string[];
  }) => void;
}

export const CleaningDashboard: React.FC<CleaningDashboardProps> = ({
  session_id,
  filename,
  rows,
  columns_count,
  onCleaningComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recs, setRecs] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Before vs After comparisons state
  const [qualityBefore, setQualityBefore] = useState<any | null>(null);
  const [qualityAfter, setQualityAfter] = useState<any | null>(null);
  
  const [metrics, setMetrics] = useState<{
    rowsBefore: number;
    rowsAfter: number;
    colsBefore: number;
    colsAfter: number;
  } | null>(null);

  // Cleaning options state
  const [options, setOptions] = useState({
    remove_duplicates: true,
    remove_duplicate_cols: true,
    handle_missing: 'auto', // auto, drop, mean, median, mode, none
    remove_null_rows: true,
    remove_empty_cols: true,
    clean_text: true,
    convert_types: true,
    remove_constant_cols: true,
    remove_unwanted_symbols: true,
    corr_threshold: 0.90
  });

  // Fetch recommendations and initial quality score on load
  const loadInitialData = async () => {
    setRecsLoading(true);
    try {
      const recsRes = await axios.get(`http://127.0.0.1:8000/api/recommendations?session_id=${session_id}`);
      setRecs(recsRes.data.cleaning);
      
      const qRes = await axios.get(`http://127.0.0.1:8000/api/quality?session_id=${session_id}`);
      setQualityBefore(qRes.data);
      setQualityAfter(qRes.data); // Initial placeholder
    } catch (err) {
      console.error("Failed to load cleaning recommendations", err);
    } finally {
      setRecsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [session_id]);

  const handleCheckboxChange = (name: keyof typeof options) => {
    setOptions(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions(prev => ({
      ...prev,
      handle_missing: e.target.value
    }));
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOptions(prev => ({
      ...prev,
      corr_threshold: parseFloat(e.target.value)
    }));
  };

  // Sync recommendations checked state with the cleaning options
  const toggleRecItem = (recId: string, index: number) => {
    const updated = [...recs];
    updated[index].checked = !updated[index].checked;
    setRecs(updated);

    // Auto-toggle corresponding preset if applicable
    if (recId === 'remove_duplicates') {
      setOptions(prev => ({ ...prev, remove_duplicates: updated[index].checked }));
    } else if (recId === 'remove_duplicate_cols') {
      setOptions(prev => ({ ...prev, remove_duplicate_cols: updated[index].checked }));
    } else if (recId === 'remove_constant_cols') {
      setOptions(prev => ({ ...prev, remove_constant_cols: updated[index].checked }));
    } else if (recId === 'clean_symbols') {
      setOptions(prev => ({ ...prev, remove_unwanted_symbols: updated[index].checked }));
    } else if (recId === 'convert_dates') {
      setOptions(prev => ({ ...prev, convert_types: updated[index].checked }));
    } else if (recId === 'normalize_numeric') {
      // Scale is handled in separate scale page, but we can set toggle
    }
  };

  const executeCleaning = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/clean', {
        session_id,
        ...options
      });
      
      setLogs(response.data.logs);
      setMetrics({
        rowsBefore: response.data.rows_before,
        rowsAfter: response.data.rows_after,
        colsBefore: response.data.cols_before,
        colsAfter: response.data.cols_after
      });

      // Recalculate Quality Score after cleaning finishes
      const postQRes = await axios.get(`http://127.0.0.1:8000/api/quality?session_id=${session_id}`);
      setQualityAfter(postQRes.data);
      
      // Fire confetti
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

      // Notify parent
      onCleaningComplete({
        preview: response.data.preview,
        columns: response.data.columns,
        rows_after: response.data.rows_after,
        cols_after: response.data.cols_after,
        logs: response.data.full_history
      });

      // Reload recommendations checklist
      const recsRes = await axios.get(`http://127.0.0.1:8000/api/recommendations?session_id=${session_id}`);
      setRecs(recsRes.data.cleaning);

    } catch (err) {
      alert("Failed to run data cleaning.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-500" />
            Data Sanitization Centre
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review AI recommendations, check original metrics against post-cleaning indices, and execute optimization presets.
          </p>
        </div>
      </div>

      {/* AI Recommendations checklist */}
      {recs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-indigo-50/10 to-transparent border-indigo-500/15 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
              AI Cleaning Recommendations Board
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-extrabold uppercase">
              Action Checklist
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recs.map((item, idx) => (
              <label 
                key={item.id}
                className={`p-3 rounded-xl border flex items-start gap-2.5 select-none transition-all cursor-pointer ${
                  item.checked 
                    ? 'bg-indigo-650/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                    : 'bg-slate-500/5 border-transparent text-slate-400'
                }`}
              >
                <input 
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleRecItem(item.id, idx)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.title}
                  </span>
                  <span className="block text-[10px] text-slate-450 mt-0.5 leading-normal">
                    {item.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100/5 pb-3">
              Configure Cleaning Presets
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'remove_duplicates', label: 'Drop Duplicate Rows', desc: 'Remove rows sharing identical feature values.' },
                { key: 'remove_duplicate_cols', label: 'Drop Duplicate Columns', desc: 'Drop identical feature vectors.' },
                { key: 'remove_null_rows', label: 'Drop Entirely Null Rows', desc: 'Remove records that contain only missing data.' },
                { key: 'remove_empty_cols', label: 'Drop Entirely Empty Columns', desc: 'Delete variables lacking any entries.' },
                { key: 'clean_text', label: 'Standardize Strings', desc: 'Trim edge spaces and resolve double gaps.' },
                { key: 'convert_types', label: 'Auto Data Type Casting', desc: 'Parse text timestamps and decimal strings.' },
                { key: 'remove_constant_cols', label: 'Drop Constant Columns', desc: 'Prune features containing only one value.' },
                { key: 'remove_unwanted_symbols', label: 'Clean Currency & % Symbols', desc: 'Strip $, %, commas to force numbers.' }
              ].map(item => (
                <label 
                  key={item.key} 
                  className="flex gap-3.5 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer select-none transition-all"
                >
                  <input
                    type="checkbox"
                    checked={options[item.key as keyof typeof options] as boolean}
                    onChange={() => handleCheckboxChange(item.key as keyof typeof options)}
                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      {item.label}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Imputation Strategy */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-850 dark:text-slate-300 mb-1.5">
                  Missing Values Imputation Strategy
                </label>
                <select
                  value={options.handle_missing}
                  onChange={handleSelectChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">Auto (Mean/Median based on skew)</option>
                  <option value="drop">Drop rows with missing cells</option>
                  <option value="mean">Impute using Mean (Numerical only)</option>
                  <option value="median">Impute using Median (Robust to outliers)</option>
                  <option value="mode">Impute using Mode (Most frequent value)</option>
                  <option value="none">Keep missing as NaN</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-850 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Collinear Threshold (r)</span>
                  <span className="text-blue-500 font-extrabold">{options.corr_threshold.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.50"
                  max="0.99"
                  step="0.01"
                  value={options.corr_threshold}
                  onChange={handleThresholdChange}
                  className="w-full mt-2 cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Identify redundant columns showing correlation strength higher than value.
                </span>
              </div>
            </div>

            {/* Action Trigger */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-end">
              <button
                onClick={executeCleaning}
                disabled={loading}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Executing Data Heuristics...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Apply Cleaning
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right side: Before vs After comparisons dashboard */}
        <div className="space-y-6">
          {/* Health Index Dashboard */}
          {qualityBefore && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-5 rounded-2xl space-y-4"
            >
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-4 h-4 text-emerald-500" />
                Data Quality Score Shift
              </h4>
              <div className="flex items-center justify-around py-3 bg-slate-500/5 rounded-xl border border-slate-200/5">
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase">Before</span>
                  <span className="text-2xl font-extrabold text-slate-400 line-through mt-0.5 block">{qualityBefore.score}</span>
                </div>
                <div className="text-slate-400">➡️</div>
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase">After</span>
                  <span className="text-2xl font-extrabold text-emerald-500 mt-0.5 block">{qualityAfter?.score || qualityBefore.score}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Before vs After comparison list */}
          {metrics && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-5 rounded-2xl space-y-4 border border-emerald-500/20"
            >
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                Before vs After Grid
              </h4>
              
              <div className="space-y-3.5">
                {/* Rows count */}
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">Row Count</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 line-through">{metrics.rowsBefore.toLocaleString()}</span>
                    <ArrowRight className="w-3 h-3 text-blue-500" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-450">{metrics.rowsAfter.toLocaleString()}</span>
                  </div>
                </div>

                {/* Columns count */}
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">Column Count</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 line-through">{metrics.colsBefore}</span>
                    <ArrowRight className="w-3 h-3 text-blue-500" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-450">{metrics.colsAfter}</span>
                  </div>
                </div>

                {/* Dimension drop ratio */}
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">Deduction Index</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-500 bg-rose-500/10">
                    -{(((metrics.rowsBefore - metrics.rowsAfter) / metrics.rowsBefore) * 100).toFixed(1)}% rows
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* System Console Output */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col h-[280px]">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" />
              Engine Log Console
            </h4>
            <div className="flex-grow overflow-y-auto p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[10px] leading-relaxed border border-slate-900">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <span className="text-slate-600 select-none">[{index + 1}]</span>
                    <span>{log}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-650 italic">
                  Run cleaning logic to populate Python logs here...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
