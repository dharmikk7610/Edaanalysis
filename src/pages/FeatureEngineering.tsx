import React, { useState } from 'react';
import { Cpu, CheckCircle, RefreshCw, Layers, ArrowRight, Table } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface FeatureEngineeringProps {
  session_id: string;
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, string>;
  onEngineeringComplete: (preview: any[], columns: string[], logs: string[]) => void;
}

export const FeatureEngineering: React.FC<FeatureEngineeringProps> = ({
  session_id,
  columns,
  numericColumns,
  columnTypes,
  onEngineeringComplete
}) => {
  const [scalingMethod, setScalingMethod] = useState<'normalize' | 'standardize'>('standardize');
  const [selectedScaleCols, setSelectedScaleCols] = useState<string[]>([]);
  const [scaleLoading, setScaleLoading] = useState(false);

  const [encodingMethod, setEncodingMethod] = useState<'onehot' | 'label'>('onehot');
  const [selectedEncodeCols, setSelectedEncodeCols] = useState<string[]>([]);
  const [encodeLoading, setEncodeLoading] = useState(false);

  const [logs, setLogs] = useState<string[]>([]);

  // Categorical Columns helper
  const categoricalCols = columns.filter(col => columnTypes[col] !== 'Numeric');

  const handleScaleColToggle = (col: string) => {
    setSelectedScaleCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleEncodeColToggle = (col: string) => {
    setSelectedEncodeCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleApplyScaling = async () => {
    if (selectedScaleCols.length === 0) {
      alert("Please select at least one column for scaling.");
      return;
    }
    setScaleLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/scale', {
        session_id,
        method: scalingMethod,
        columns: selectedScaleCols
      });
      
      setLogs(prev => [...prev, ...response.data.logs]);
      onEngineeringComplete(response.data.preview, response.data.columns, response.data.logs);
      setSelectedScaleCols([]);
      alert("Feature scaling successfully applied!");
      
    } catch (err) {
      alert("Failed to scale features.");
    } finally {
      setScaleLoading(false);
    }
  };

  const handleApplyEncoding = async () => {
    if (selectedEncodeCols.length === 0) {
      alert("Please select at least one column for encoding.");
      return;
    }
    setEncodeLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/encode', {
        session_id,
        method: encodingMethod,
        columns: selectedEncodeCols
      });
      
      setLogs(prev => [...prev, ...response.data.logs]);
      onEngineeringComplete(response.data.preview, response.data.columns, response.data.logs);
      setSelectedEncodeCols([]);
      alert("Feature encoding successfully applied!");
      
    } catch (err) {
      alert("Failed to encode features.");
    } finally {
      setEncodeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-blue-500" />
            Feature Engineering
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Normalize numeric columns or encode categorical fields to prep data for machine learning.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scaling Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[450px]">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100/5 pb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              Numerical Feature Scaling
            </h3>
            
            {/* Scaling Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Scaling Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScalingMethod('standardize')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    scalingMethod === 'standardize'
                      ? 'bg-blue-650 border-blue-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  Standardize (Z-Score)
                </button>
                <button
                  onClick={() => setScalingMethod('normalize')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    scalingMethod === 'normalize'
                      ? 'bg-blue-650 border-blue-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  Normalize (MinMax)
                </button>
              </div>
            </div>

            {/* Select Columns */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Columns to Scale ({selectedScaleCols.length} selected)
              </label>
              {numericColumns.length > 0 ? (
                <div className="max-h-[160px] overflow-y-auto border border-slate-200/50 dark:border-slate-850/80 rounded-xl p-2 bg-white/10 dark:bg-slate-950/15 space-y-1">
                  {numericColumns.map(col => {
                    const isChecked = selectedScaleCols.includes(col);
                    return (
                      <label 
                        key={col} 
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleScaleColToggle(col)}
                          className="rounded text-blue-600 w-3.5 h-3.5"
                        />
                        <span className={isChecked ? "text-blue-500 font-bold" : "text-slate-700 dark:text-slate-350"}>
                          {col}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-4 text-center">
                  No numerical columns found.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleApplyScaling}
            disabled={scaleLoading || selectedScaleCols.length === 0}
            className="w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-sm flex justify-center items-center gap-2 shadow-lg shadow-blue-500/10 hover:scale-[1.01] transition-all cursor-pointer"
          >
            {scaleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Apply Numerical Scaling
          </button>
        </div>

        {/* Encoding Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[450px]">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100/5 pb-2 flex items-center gap-2">
              <Table className="w-5 h-5 text-teal-500" />
              Categorical Feature Encoding
            </h3>
            
            {/* Encoding Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Encoding Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEncodingMethod('onehot')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    encodingMethod === 'onehot'
                      ? 'bg-blue-650 border-blue-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  One-Hot Encoding (Dummies)
                </button>
                <button
                  onClick={() => setEncodingMethod('label')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    encodingMethod === 'label'
                      ? 'bg-blue-650 border-blue-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  Label Encoding (Integers)
                </button>
              </div>
            </div>

            {/* Select Columns */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Columns to Encode ({selectedEncodeCols.length} selected)
              </label>
              {categoricalCols.length > 0 ? (
                <div className="max-h-[160px] overflow-y-auto border border-slate-200/50 dark:border-slate-850/80 rounded-xl p-2 bg-white/10 dark:bg-slate-950/15 space-y-1">
                  {categoricalCols.map(col => {
                    const isChecked = selectedEncodeCols.includes(col);
                    return (
                      <label 
                        key={col} 
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleEncodeColToggle(col)}
                          className="rounded text-blue-600 w-3.5 h-3.5"
                        />
                        <span className={isChecked ? "text-blue-500 font-bold" : "text-slate-700 dark:text-slate-350"}>
                          {col} <span className="text-[10px] text-slate-400">({columnTypes[col]})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-4 text-center">
                  No categorical/text columns left to encode.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleApplyEncoding}
            disabled={encodeLoading || selectedEncodeCols.length === 0}
            className="w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-650 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-40 text-white font-bold text-sm flex justify-center items-center gap-2 shadow-lg shadow-teal-500/10 hover:scale-[1.01] transition-all cursor-pointer"
          >
            {encodeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
            Apply Categorical Encoding
          </button>
        </div>
      </div>

      {/* Log Section */}
      {logs.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl">
          <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-2">
            Engineering Action Log
          </h4>
          <div className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 space-y-1 border border-slate-900">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-600 select-none">&gt;&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
