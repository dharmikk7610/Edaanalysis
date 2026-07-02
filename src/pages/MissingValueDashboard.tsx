import React, { useState, useEffect } from 'react';
import { EyeOff, CheckCircle, RefreshCw, BarChart3, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface MissingValueDashboardProps {
  session_id: string;
}

export const MissingValueDashboard: React.FC<MissingValueDashboardProps> = ({ session_id }) => {
  const [loading, setLoading] = useState(true);
  const [edaData, setEdaData] = useState<any | null>(null);
  const [heatmapUrl, setHeatmapUrl] = useState('');
  
  const loadMissingData = async () => {
    setLoading(true);
    try {
      const edaRes = await axios.get(`http://127.0.0.1:8000/api/eda?session_id=${session_id}`);
      setEdaData(edaRes.data);
      
      const plotRes = await axios.get('http://127.0.0.1:8000/api/plot', {
        params: {
          session_id,
          plot_type: 'missing_value_heatmap'
        }
      });
      setHeatmapUrl(plotRes.data.image);
    } catch (err) {
      console.error("Failed to load missing values", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissingData();
  }, [session_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 font-semibold">Auditing missing data values...</span>
      </div>
    );
  }

  if (!edaData) return null;

  const { overview, columns } = edaData;
  const missingCols = columns.filter((c: any) => c.missing_count > 0);

  // Imputation advice helper
  const getImputationStrategy = (col: any) => {
    if (col.type === 'Numeric') {
      const skew = col.stats?.skewness || 0;
      return {
        strategy: Math.abs(skew) > 1.0 ? "Median Imputation" : "Mean Imputation",
        reason: Math.abs(skew) > 1.0 
          ? "Highly skewed column. Median is robust to outlier distortions." 
          : "Symmetrical distribution. Mean preserves mathematical sum properties."
      };
    } else {
      return {
        strategy: "Mode Imputation (Most Frequent)",
        reason: "Categorical variable. Fills nulls with the dominant class."
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <EyeOff className="w-7 h-7 text-amber-500" />
            Missing Value Analyzer
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track null cell counts, analyze missingness correlation plots, and review imputation suggestions.
          </p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Missing Cells
            </span>
            <span className="text-3xl font-extrabold text-amber-500 dark:text-amber-400 mt-1 block">
              {overview.missing_cells.toLocaleString()}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            Ø
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Global Null Percentage
            </span>
            <span className="text-3xl font-extrabold text-amber-500 dark:text-amber-400 mt-1 block">
              {overview.missing_percentage}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            %
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Affected Columns
            </span>
            <span className="text-3xl font-extrabold text-amber-500 dark:text-amber-400 mt-1 block">
              {missingCols.length} <span className="text-sm font-semibold text-slate-450">/ {columns.length}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            #
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missingness Heatmap */}
        {heatmapUrl && (
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Missingness Correlation Map
            </h3>
            <div className="flex justify-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
              <img src={heatmapUrl} alt="Missing values heatmap" className="max-h-[300px] object-contain rounded" />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              💡 <strong>Missingness correlation values</strong> measure whether null cells in one column occur together with nulls in another column (r = 1 represents total concurrency).
            </p>
          </div>
        )}

        {/* Missing Values Bar Distributions (Rendered as custom Tailwind bars) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100/5 pb-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Missingness Column Distributions
            </h3>
            
            {missingCols.length > 0 ? (
              <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                {missingCols.map((col: any) => (
                  <div key={col.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-350">{col.name}</span>
                      <span className="text-slate-450 font-bold">{col.missing_count.toLocaleString()} nulls ({col.missing_percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-200/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${col.missing_percentage}%` }}
                        className="h-full bg-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-emerald-500 font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                This dataset contains zero missing values. High quality standard!
              </div>
            )}
          </div>
          <button
            onClick={loadMissingData}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-850 text-white font-bold text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Analytics
          </button>
        </div>

        {/* Detailed Column Suggestions Table */}
        {missingCols.length > 0 && (
          <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden shadow">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">
                Variables Imputation Strategies
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Column Name</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Missing Count</th>
                    <th className="px-5 py-3.5">Recommended Filling Strategy</th>
                    <th className="px-5 py-3.5">Technical Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50 text-sm">
                  {missingCols.map((col: any) => {
                    const advice = getImputationStrategy(col);
                    return (
                      <tr key={col.name} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5">
                        <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{col.name}</td>
                        <td className="px-5 py-3 text-xs text-slate-400 font-semibold">{col.type}</td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-350">{col.missing_count.toLocaleString()}</td>
                        <td className="px-5 py-3 font-bold text-blue-600 dark:text-blue-450">{advice.strategy}</td>
                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-normal">{advice.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
