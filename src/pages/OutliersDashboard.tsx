import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Eye, RefreshCw, BarChart2, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface OutliersDashboardProps {
  session_id: string;
  numericColumns: string[];
  onOutliersRemoved: (newRowsCount: number, preview: any[]) => void;
}

export const OutliersDashboard: React.FC<OutliersDashboardProps> = ({
  session_id,
  numericColumns,
  onOutliersRemoved
}) => {
  const [method, setMethod] = useState<'iqr' | 'zscore'>('iqr');
  const [threshold, setThreshold] = useState(1.5);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [plotUrl, setPlotUrl] = useState<string>('');
  
  // Results state
  const [report, setReport] = useState<{
    total_outlier_rows: number;
    outlier_percentage: number;
    summary: Array<{
      column: string;
      outlier_count: number;
      outlier_percentage: number;
      min_value: number;
      max_value: number;
    }>;
  } | null>(null);

  useEffect(() => {
    setThreshold(method === 'iqr' ? 1.5 : 3.0);
  }, [method]);

  const runDetection = async () => {
    if (numericColumns.length === 0) return;
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/outliers', {
        session_id,
        method,
        threshold,
        columns: selectedCols.length > 0 ? selectedCols : null,
        action: 'detect'
      });
      setReport(response.data);

      const plotRes = await axios.get('http://127.0.0.1:8000/api/plot', {
        params: {
          session_id,
          plot_type: 'boxplot_outliers'
        }
      });
      setPlotUrl(plotRes.data.image);

    } catch (err) {
      console.error("Failed to detect outliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDetection();
  }, [method, session_id]);

  const handleColToggle = (col: string) => {
    setSelectedCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const removeOutliers = async () => {
    if (!window.confirm("Are you sure you want to drop these outlier records? This is a destructive operation.")) return;
    setRemoving(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/outliers', {
        session_id,
        method,
        threshold,
        columns: selectedCols.length > 0 ? selectedCols : null,
        action: 'remove'
      });
      
      onOutliersRemoved(response.data.new_rows_count, response.data.preview);
      await runDetection();
      alert(`Successfully removed ${response.data.rows_removed} outlier records!`);
      
    } catch (err) {
      alert("Failed to remove outliers.");
    } finally {
      setRemoving(false);
    }
  };

  if (numericColumns.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 italic">
        No numerical columns found in this dataset for outlier analysis.
      </div>
    );
  }

  // Find most affected column
  const getMostAffectedCol = () => {
    if (!report || report.summary.length === 0) return null;
    const sorted = [...report.summary].sort((a, b) => b.outlier_count - a.outlier_count);
    return sorted[0];
  };
  const mostAffected = getMostAffectedCol();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            Outlier Analysis Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Detect statistical anomalies, visualize comparative boxplots, and review suggested removal strategies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 flex flex-col justify-between h-fit">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Sensitivity Settings
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Algorithm Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('iqr')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    method === 'iqr'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  IQR Multiplier
                </button>
                <button
                  onClick={() => setMethod('zscore')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    method === 'zscore'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  Z-Score Bound
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase mb-2">
                <span>Threshold Factor</span>
                <span className="text-blue-500 font-extrabold">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={method === 'iqr' ? "1.0" : "2.0"}
                max={method === 'iqr' ? "3.5" : "5.0"}
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-blue-600"
              />
              <span className="text-[10px] text-slate-400 block mt-1 leading-normal">
                {method === 'iqr' 
                  ? 'Standard IQR IQR*1.5 covers typical tail outliers, 3.0 covers extreme bounds.' 
                  : 'Standard deviations limit (3.0 covers 99.73% of normal distribution).'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Analyze Target Variables
              </label>
              <div className="max-h-[160px] overflow-y-auto border border-slate-200/50 dark:border-slate-850/80 rounded-xl p-2 bg-white/20 dark:bg-slate-950/20 space-y-1">
                {numericColumns.map(col => {
                  const isChecked = selectedCols.includes(col);
                  return (
                    <label 
                      key={col} 
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-medium cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleColToggle(col)}
                        className="rounded text-blue-600 w-3.5 h-3.5"
                      />
                      <span className={isChecked ? "text-blue-500 font-bold" : "text-slate-700 dark:text-slate-350"}>{col}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-2">
            <button
              onClick={runDetection}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 text-white font-bold text-xs flex justify-center items-center gap-2 transition-all cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Re-Scan Variables
            </button>
            
            {report && report.total_outlier_rows > 0 && (
              <button
                onClick={removeOutliers}
                disabled={removing}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-750 text-white font-bold text-xs flex justify-center items-center gap-2 shadow-lg shadow-rose-500/10 transition-all cursor-pointer"
              >
                {removing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Drop Outliers List
              </button>
            )}
          </div>
        </div>

        {/* Results Pane */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Anomalous Records
                  </span>
                  <span className="text-3xl font-extrabold text-rose-500 dark:text-rose-450 mt-1 block">
                    {report.total_outlier_rows.toLocaleString()}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-extrabold">
                  !
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Affected Row Ratio
                  </span>
                  <span className="text-3xl font-extrabold text-rose-500 dark:text-rose-450 mt-1 block">
                    {report.outlier_percentage}%
                  </span>
                </div>
                <div className="w-11 h-11 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-extrabold">
                  %
                </div>
              </div>
            </div>
          )}

          {/* Strategy & Advice Box */}
          {report && report.total_outlier_rows > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 rounded-xl border border-amber-500/10 bg-amber-550/5 space-y-3"
            >
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase">
                <Lightbulb className="w-4.5 h-4.5" />
                Anomalies Treatment Strategy
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-normal">
                {mostAffected ? (
                  <>
                    The feature showing the highest density of outlier data is <strong>'{mostAffected.column}'</strong> containing <strong>{mostAffected.outlier_count.toLocaleString()} outliers</strong> ({mostAffected.outlier_percentage}% of its values). 
                  </>
                ) : ""} We recommend <strong>dropping outlier rows</strong> if anomalies represent measurement errors or noise. If anomalies represent true extreme behaviors, consider keeping them or performing a Winsorization scaling step (capping values at boundary limits).
              </p>
            </motion.div>
          )}

          {/* Boxplot comparison */}
          {plotUrl && (
            <div className="glass-panel p-5 rounded-2xl">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-rose-500" />
                Standardized Comparison Boxplot
              </h4>
              <div className="flex justify-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                <img src={plotUrl} alt="Outlier Boxplot comparison" className="max-h-[250px] object-contain rounded" />
              </div>
            </div>
          )}

          {/* Table */}
          {report && report.summary.length > 0 ? (
            <div className="glass-panel rounded-2xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-850 bg-slate-500/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Column Name</th>
                      <th className="px-5 py-3.5">Anomalies Detected</th>
                      <th className="px-5 py-3.5">Col Outlier Ratio</th>
                      <th className="px-5 py-3.5">Acceptable Boundaries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50 text-sm">
                    {report.summary.map(item => (
                      <tr key={item.column} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5">
                        <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">
                          {item.column}
                        </td>
                        <td className="px-5 py-3 text-rose-500 dark:text-rose-450 font-bold">
                          {item.outlier_count.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-350 font-semibold">
                          {item.outlier_percentage}%
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                          [{item.min_value.toLocaleString(undefined, { maximumFractionDigits: 1 })} to {item.max_value.toLocaleString(undefined, { maximumFractionDigits: 1 })}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : report && (
            <div className="glass-panel p-8 rounded-2xl text-center text-emerald-500 flex items-center justify-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
              All numeric variables are clean and within standard statistical boundaries!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
