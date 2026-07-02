import React, { useState, useEffect } from 'react';
import { Eye, HelpCircle, BarChart2, Info, Hash, Calendar, Type } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface ColumnProfileExplorerProps {
  session_id: string;
}

export const ColumnProfileExplorer: React.FC<ColumnProfileExplorerProps> = ({ session_id }) => {
  const [loading, setLoading] = useState(true);
  const [edaData, setEdaData] = useState<any | null>(null);
  const [selectedCol, setSelectedCol] = useState<string>('');
  const [plotUrl, setPlotUrl] = useState<string>('');
  const [plotLoading, setPlotLoading] = useState(false);

  useEffect(() => {
    const fetchEda = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/eda?session_id=${session_id}`);
        setEdaData(response.data);
        if (response.data.columns && response.data.columns.length > 0) {
          setSelectedCol(response.data.columns[0].name);
        }
      } catch (err) {
        console.error("Failed to fetch EDA for profile explorer", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEda();
  }, [session_id]);

  // Load column distribution plot when selected column changes
  useEffect(() => {
    if (!selectedCol) return;
    const fetchColPlot = async () => {
      setPlotLoading(true);
      try {
        const colMeta = edaData?.columns.find((c: any) => c.name === selectedCol);
        // Categorical cols use categorical_analysis chart, numerical use distribution_plot
        const plotType = colMeta?.type === 'Numeric' ? 'distribution_plot' : 'categorical_analysis';
        
        const response = await axios.get('http://127.0.0.1:8000/api/plot', {
          params: {
            session_id,
            plot_type: plotType,
            x: selectedCol
          }
        });
        setPlotUrl(response.data.image);
      } catch (err) {
        console.error("Failed to load column plot", err);
        setPlotUrl('');
      } finally {
        setPlotLoading(false);
      }
    };
    fetchColPlot();
  }, [selectedCol, session_id, edaData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 font-semibold">Generating column profiles...</span>
      </div>
    );
  }

  if (!edaData) return null;

  const { columns } = edaData;
  const colMeta = columns.find((c: any) => c.name === selectedCol) || columns[0];

  const getColIcon = (type: string) => {
    switch (type) {
      case 'Numeric': return <Hash className="w-4 h-4 text-blue-500" />;
      case 'DateTime': return <Calendar className="w-4 h-4 text-emerald-500" />;
      default: return <Type className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="w-7 h-7 text-indigo-500" />
            Column Profile Explorer
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Examine datatype details, missingness rates, averages, and distributions on a per-variable basis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column list */}
        <div className="glass-panel p-4.5 rounded-2xl md:col-span-1 flex flex-col h-[520px]">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">
            Variables List
          </h3>
          <div className="flex-grow overflow-y-auto space-y-1.5 pr-1">
            {columns.map((c: any) => {
              const isActive = selectedCol === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedCol(c.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                    isActive
                      ? 'bg-blue-650/10 border-blue-500/25 text-blue-600 dark:text-blue-400 font-extrabold'
                      : 'border-transparent text-slate-400 hover:bg-slate-500/5 hover:text-slate-650'
                  }`}
                >
                  <span className="truncate max-w-[85%]">{c.name}</span>
                  {getColIcon(c.type)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right profile detail view */}
        <div className="md:col-span-3 space-y-6">
          {colMeta && (
            <motion.div
              key={colMeta.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Metadata Cards */}
              <div className="lg:col-span-1 space-y-4">
                <div className="glass-panel p-5 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Column Label</span>
                  <span className="font-extrabold text-lg text-slate-800 dark:text-slate-200 mt-1 block truncate" title={colMeta.name}>
                    {colMeta.name}
                  </span>
                </div>

                <div className="glass-panel p-5 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classification & Type</span>
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-350 mt-1.5 flex items-center gap-1.5">
                    {getColIcon(colMeta.type)}
                    {colMeta.type} <span className="text-xs text-slate-400 font-mono">({colMeta.dtype})</span>
                  </span>
                </div>

                <div className="glass-panel p-5 rounded-2xl grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Nulls %</span>
                    <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300 mt-1 block">
                      {colMeta.missing_percentage}%
                    </span>
                    <span className="text-[9px] text-slate-450">({colMeta.missing_count} cells)</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Unique Values</span>
                    <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300 mt-1 block">
                      {colMeta.unique_values.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics details */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider border-b border-slate-100/5 pb-2 mb-4">
                    Statistical Metrics
                  </h3>
                  
                  {colMeta.type === 'Numeric' && colMeta.stats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Mean (Average)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{colMeta.stats.mean.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Median (Q2)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{colMeta.stats.median.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Mode</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {colMeta.stats.mode !== null && colMeta.stats.mode !== undefined ? colMeta.stats.mode.toLocaleString(undefined, { maximumFractionDigits: 3 }) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Std Deviation (σ)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">{colMeta.stats.std_dev.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Variance (σ²)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">{colMeta.stats.variance.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Quartile Bounds</span>
                        <span className="font-medium text-xs text-slate-600 dark:text-slate-400 font-mono block">Q1: {colMeta.stats.q1.toLocaleString()}</span>
                        <span className="font-medium text-xs text-slate-600 dark:text-slate-400 font-mono block">Q3: {colMeta.stats.q3.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Min value</span>
                        <span className="font-bold text-slate-700 dark:text-slate-350">{colMeta.stats.min.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-450 block font-semibold">Max value</span>
                        <span className="font-bold text-slate-700 dark:text-slate-350">{colMeta.stats.max.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-xs text-slate-450 block font-semibold">Skewness</span>
                          <span className={`font-bold ${Math.abs(colMeta.stats.skewness) > 1.0 ? 'text-amber-500' : ''}`}>{colMeta.stats.skewness.toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-450 block font-semibold">Kurtosis</span>
                          <span className="font-bold">{colMeta.stats.kurtosis.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-xs text-slate-450 block font-semibold">Dominant Class (Mode)</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">'{colMeta.stats?.mode || 'N/A'}'</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-450 block font-semibold">Mode Frequency</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {colMeta.stats?.mode_frequency?.toLocaleString() || 0} times ({colMeta.stats?.mode_percentage || 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-200/5 bg-slate-500/5 text-xs text-slate-400 leading-relaxed max-w-lg">
                        💡 Categorical properties do not hold continuous metrics (mean, std dev, skewness). Instead, their frequency vectors and class counts represent the variables' profile.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Distribution Preview Plot */}
              <div className="lg:col-span-3 glass-panel p-5 rounded-2xl">
                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-indigo-500" />
                  Variable Distribution Preview
                </h4>
                <div className="flex justify-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 h-[300px] items-center">
                  {plotLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Generating frequency chart...</span>
                    </div>
                  ) : plotUrl ? (
                    <img src={plotUrl} alt={`${selectedCol} distribution`} className="max-h-full object-contain rounded" />
                  ) : (
                    <span className="text-slate-400 italic">No distribution chart generated.</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
