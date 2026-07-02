import React, { useState, useEffect } from 'react';
import { AreaChart, Download, Play, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface VisualizationsProps {
  session_id: string;
  columns: string[];
  numericColumns: string[];
  defaultParams?: any;
  onParamsHandled?: () => void;
}

// Full 18 chart types requested
const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', desc: 'Category frequency or group aggregates.' },
  { id: 'line', label: 'Line Chart', desc: 'Chronological trends or linear progression.' },
  { id: 'histogram', label: 'Histogram', desc: 'Numerical frequency bins.' },
  { id: 'pie', label: 'Pie Chart', desc: 'Proportional slice layout.' },
  { id: 'scatter', label: 'Scatter Plot', desc: 'Bivariate correlations & clusters.' },
  { id: 'box', label: 'Box Plot', desc: 'Quartile distribution details.' },
  { id: 'violin', label: 'Violin Plot', desc: 'Symmetrical density + box values.' },
  { id: 'density', label: 'Density Plot (KDE)', desc: 'Smooth probability density curves.' },
  { id: 'area', label: 'Area Chart', desc: 'Volume visual under trend lines.' },
  { id: 'heatmap', label: 'Heatmap Matrix', desc: 'Value grids mapped by color.' },
  { id: 'count', label: 'Count Plot', desc: 'Basic frequency counts of elements.' },
  { id: 'pair', label: 'Pair Plot Matrix', desc: 'Pairwise numerical distribution grids.' },
  { id: 'correlation_heatmap', label: 'Correlation Heatmap', desc: 'Pearson linear coefficient grid (-1 to 1).' },
  { id: 'distribution_plot', label: 'Distribution Plot', desc: 'Histogram + KDE overlay.' },
  { id: 'missing_value_heatmap', label: 'Missing Value Heatmap', desc: 'Null correlation maps across columns.' },
  { id: 'boxplot_outliers', label: 'Boxplot for Outliers', desc: 'Standardized Z-Score comparative boxes.' },
  { id: 'categorical_analysis', label: 'Categorical Analysis', desc: 'Top category frequency rankings.' },
  { id: 'time_series', label: 'Time Series Graph', desc: 'Date-based continuous line tracking.' }
];

export const Visualizations: React.FC<VisualizationsProps> = ({
  session_id,
  columns,
  numericColumns,
  defaultParams,
  onParamsHandled
}) => {
  const [chartType, setChartType] = useState('scatter');
  const [xVal, setXVal] = useState('');
  const [yVal, setYVal] = useState('');
  const [hueVal, setHueVal] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [chartImage, setChartImage] = useState<string>('');

  // Handle incoming default parameters from recommendations
  useEffect(() => {
    if (defaultParams) {
      if (defaultParams.plotType) setChartType(defaultParams.plotType);
      if (defaultParams.x !== undefined) setXVal(defaultParams.x || '');
      if (defaultParams.y !== undefined) setYVal(defaultParams.y || '');
      if (defaultParams.hue !== undefined) setHueVal(defaultParams.hue || '');
      
      if (onParamsHandled) {
        onParamsHandled();
      }
    }
  }, [defaultParams, onParamsHandled]);

  // Set default values when columns load
  useEffect(() => {
    if (columns.length > 0) {
      setXVal(numericColumns[0] || columns[0]);
      setYVal(numericColumns[1] || columns[1] || '');
      setHueVal('');
    }
  }, [columns, numericColumns]);

  const loadChart = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/plot', {
        params: {
          session_id,
          plot_type: chartType,
          x: xVal || null,
          y: yVal || null,
          hue: hueVal || null
        }
      });
      setChartImage(response.data.image);
    } catch (err) {
      console.error("Failed to generate plot", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChart();
  }, [chartType, session_id]);

  const handleDownload = () => {
    if (!chartImage) return;
    const link = document.createElement('a');
    link.href = chartImage;
    link.download = `InsightAI_${chartType}_Chart.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <AreaChart className="w-7 h-7 text-blue-500" />
            Visualizations Playground
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pick from 18 professional plots, configure mapping parameters, and download high-quality PNGs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Parameter Panel */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl space-y-5 flex flex-col justify-between h-[520px]">
          <div className="space-y-4 flex-grow overflow-y-auto pr-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Chart Settings
            </h3>

            {/* Select Chart Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none"
              >
                {CHART_TYPES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Select X Axis */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                X-Axis Column (Primary)
              </label>
              <select
                value={xVal}
                onChange={(e) => setXVal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none"
              >
                {columns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Select Y Axis */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Y-Axis Column (Optional)</span>
                {yVal && <button onClick={() => setYVal('')} className="text-rose-500 lowercase text-[9px] font-bold">Clear</button>}
              </label>
              <select
                value={yVal}
                onChange={(e) => setYVal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none"
              >
                <option value="">-- None (Auto-Count/Bins) --</option>
                {columns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Select Hue */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Hue/Category Grouping</span>
                {hueVal && <button onClick={() => setHueVal('')} className="text-rose-500 lowercase text-[9px] font-bold">Clear</button>}
              </label>
              <select
                value={hueVal}
                onChange={(e) => setHueVal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none"
              >
                <option value="">-- None --</option>
                {columns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Chart Type Description */}
            <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/10">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">About this chart</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {CHART_TYPES.find(c => c.id === chartType)?.desc}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-850">
            <button
              onClick={loadChart}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 text-white font-bold text-xs flex justify-center items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Render Chart
            </button>
            {chartImage && (
              <button
                onClick={handleDownload}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex justify-center items-center gap-2 shadow-md shadow-blue-500/15"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            )}
          </div>
        </div>

        {/* Right Output Area */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl flex flex-col justify-center items-center relative min-h-[400px] h-[520px] bg-slate-50/20 dark:bg-slate-950/15">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
              <span className="text-sm font-semibold text-slate-500">Generating graph canvas...</span>
            </div>
          ) : chartImage ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full flex flex-col justify-between"
            >
              <div className="flex-grow flex items-center justify-center p-2">
                <img 
                  src={chartImage} 
                  alt="Generated exploratory chart" 
                  className="max-h-[400px] max-w-full object-contain rounded-xl shadow-md border border-slate-200/50 dark:border-slate-850/80 bg-white" 
                />
              </div>
              <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5 mt-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Matplotlib & Seaborn Vector Engine. Rendered in 120 DPI resolution.
              </div>
            </motion.div>
          ) : (
            <div className="text-slate-400 italic">
              Configure parameters and click Render Chart.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
