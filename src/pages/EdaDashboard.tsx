import React, { useState, useEffect } from 'react';
import { BarChart3, HelpCircle, Table, Hash, CheckSquare, Layers, Percent, X, Info, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface EdaDashboardProps {
  session_id: string;
}

interface CorrelationCell {
  x: string;
  y: string;
  val: number;
}

export const EdaDashboard: React.FC<EdaDashboardProps> = ({ session_id }) => {
  const [loading, setLoading] = useState(true);
  const [edaData, setEdaData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'correlations' | 'covariance'>('stats');
  const [selectedCell, setSelectedCell] = useState<CorrelationCell | null>(null);

  useEffect(() => {
    const fetchEda = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/eda?session_id=${session_id}`);
        setEdaData(response.data);
      } catch (err) {
        console.error("Failed to fetch EDA data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEda();
  }, [session_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshIcon className="w-10 h-10 text-blue-600 animate-spin" />
        <span className="text-slate-500 font-semibold">Running statistical analysis algorithms...</span>
      </div>
    );
  }

  if (!edaData) return null;

  const { overview, columns, correlation_matrix, covariance_matrix, numeric_columns } = edaData;

  const getCorrBgColor = (val: number) => {
    const absVal = Math.abs(val);
    if (val > 0.4) return `rgba(59, 130, 246, ${absVal})`;
    if (val < -0.4) return `rgba(239, 68, 68, ${absVal})`;
    return 'rgba(241, 245, 249, 0.4)';
  };

  const getCorrTextColor = (val: number) => {
    return Math.abs(val) > 0.5 ? 'text-white font-bold' : 'text-slate-755 dark:text-slate-350';
  };

  // Correlation Analyzer Helper
  const analyzeCorrelation = (cell: CorrelationCell) => {
    const absVal = Math.abs(cell.val);
    const isSelf = cell.x === cell.y;
    
    let strength = '';
    let direction = '';
    let explanation = '';
    let recommendation = '';
    
    if (isSelf) {
      strength = 'Identity';
      direction = 'Positive (Perfect)';
      explanation = `Evaluating column '${cell.x}' against itself. Yields a perfect correlation of 1.00.`;
      recommendation = 'No action required.';
    } else {
      if (absVal >= 0.75) {
        strength = 'Strong';
      } else if (absVal >= 0.4) {
        strength = 'Moderate';
      } else if (absVal >= 0.1) {
        strength = 'Weak';
      } else {
        strength = 'Negligible (None)';
      }

      if (cell.val > 0.05) {
        direction = 'Positive Linear';
        explanation = `As '${cell.x}' increases, '${cell.y}' tends to increase linearly.`;
      } else if (cell.val < -0.05) {
        direction = 'Negative Linear';
        explanation = `As '${cell.x}' increases, '${cell.y}' tends to decrease linearly.`;
      } else {
        direction = 'None';
        explanation = `There is no linear dependency between '${cell.x}' and '${cell.y}'.`;
      }

      if (absVal >= 0.85) {
        recommendation = 'Collinearity warning: These features are highly redundant. Consider dropping one to prevent model overfitting.';
      } else if (absVal >= 0.5) {
        recommendation = 'Noticeable relationship. Keep both in dataset but monitor their importances in machine learning trees.';
      } else {
        recommendation = 'Statistically independent. These columns provide separate, orthogonal signals suitable for neural nets.';
      }
    }

    return { strength, direction, explanation, recommendation };
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-500" />
            Automatic EDA statistics
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse descriptive statistics, shape metrics, unique counts, and variable correlation tables.
          </p>
        </div>
      </div>

      {/* Dataset Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Table className="text-blue-500" />, label: 'Shape Layout', val: `${overview.rows.toLocaleString()} × ${overview.columns}` },
          { icon: <CheckSquare className="text-emerald-500" />, label: 'Duplicate Rows', val: `${overview.duplicate_rows} (${overview.duplicate_percentage}%)` },
          { icon: <Percent className="text-amber-500" />, label: 'Missing Cells', val: `${overview.missing_cells.toLocaleString()} (${overview.missing_percentage}%)` },
          { icon: <Layers className="text-indigo-500" />, label: 'Memory Usage', val: overview.memory_usage }
        ].map((card, i) => (
          <div key={i} className="glass-panel p-4.5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/10 flex items-center justify-center">
              {card.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{card.label}</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-sm mt-0.5">{card.val}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Subtabs */}
      <div className="border-b border-slate-200 dark:border-slate-850 flex gap-4">
        {[
          { key: 'stats', label: 'Descriptive Statistics' },
          { key: 'correlations', label: 'Correlation Matrix' },
          { key: 'covariance', label: 'Covariance Matrix' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              setSelectedCell(null);
            }}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-650 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'stats' && (
        <div className="glass-panel rounded-2xl overflow-hidden shadow border border-slate-200/50 dark:border-slate-850/50">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-md z-10">
                  <th className="px-5 py-4">Variable</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Nulls %</th>
                  <th className="px-5 py-4">Uniques</th>
                  <th className="px-5 py-4">Mean</th>
                  <th className="px-5 py-4">Median</th>
                  <th className="px-5 py-4">Std Dev</th>
                  <th className="px-5 py-4">Min / Max</th>
                  <th className="px-5 py-4">Skewness</th>
                  <th className="px-5 py-4">Kurtosis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 text-sm">
                {columns.map((col: any) => {
                  const isNum = col.type === 'Numeric';
                  return (
                    <tr key={col.name} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5">
                      <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{col.name}</td>
                      <td className="px-5 py-3 text-xs text-slate-400 font-semibold">{col.type}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{col.missing_percentage}%</td>
                      <td className="px-5 py-3 text-slate-650 dark:text-slate-350">{col.unique_values.toLocaleString()}</td>
                      {isNum ? (
                        <>
                          <td className="px-5 py-3 font-medium">{col.stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-3">{col.stats.median.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-3 font-mono text-xs">{col.stats.std_dev.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-3 font-mono text-[10px] text-slate-400">[{col.stats.min.toLocaleString(undefined, { maximumFractionDigits: 1 })} / {col.stats.max.toLocaleString(undefined, { maximumFractionDigits: 1 })}]</td>
                          <td className={`px-5 py-3 ${Math.abs(col.stats.skewness) > 1.0 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                            {col.stats.skewness.toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-slate-455">{col.stats.kurtosis.toFixed(2)}</td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-5 py-3 text-xs text-slate-400 italic">
                          Non-numeric variables (Mode: '{col.stats?.mode || 'N/A'}' representing {col.stats?.mode_percentage || 0}%)
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'correlations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heatmap Grid */}
          <div className="glass-panel p-6 rounded-2xl overflow-x-auto lg:col-span-2">
            {numeric_columns.length > 1 ? (
              <div className="min-w-[500px] space-y-4">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
                  Pearson Correlation R Heatmap (Click cells to analyze)
                </h4>
                <div className="grid border border-slate-200 dark:border-slate-800" style={{ gridTemplateColumns: `repeat(${numeric_columns.length + 1}, minmax(90px, 1fr))` }}>
                  <div className="bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-250 dark:border-slate-800 p-2 text-xs font-bold text-slate-400 uppercase">Variable</div>
                  {numeric_columns.map((c: string) => (
                    <div key={c} className="bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-250 dark:border-slate-800 p-2 text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate" title={c}>{c}</div>
                  ))}
                  
                  {numeric_columns.map((colY: string) => (
                    <React.Fragment key={colY}>
                      <div className="bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-250 dark:border-slate-800 p-2 text-[10px] font-bold text-slate-850 dark:text-slate-200 truncate" title={colY}>{colY}</div>
                      
                      {numeric_columns.map((colX: string) => {
                        const match = correlation_matrix.find((m: any) => m.x === colX && m.y === colY);
                        const val = match ? match.value : 0;
                        const isSelected = selectedCell && selectedCell.x === colX && selectedCell.y === colY;
                        return (
                          <div
                            key={colX}
                            onClick={() => setSelectedCell({ x: colX, y: colY, val })}
                            className={`border-b border-r border-slate-200 dark:border-slate-850 p-2 text-xs font-mono text-center flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-[1.05] ${
                              isSelected ? 'ring-2 ring-blue-500 z-10 scale-[1.05] shadow-lg' : ''
                            }`}
                            style={{ backgroundColor: getCorrBgColor(val) }}
                          >
                            <span className={getCorrTextColor(val)}>
                              {val.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 italic">
                Correlations require at least 2 numerical columns.
              </div>
            )}
          </div>

          {/* Interactive Cell Detail Popover */}
          <div className="lg:col-span-1">
            {selectedCell ? (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel p-5 rounded-2xl space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100/5 pb-2">
                  <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Info className="w-4 h-4 text-blue-500" />
                    Correlation Details
                  </h3>
                  <button onClick={() => setSelectedCell(null)} className="p-1 rounded hover:bg-slate-500/5 text-slate-450 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-500/5 p-3 rounded-xl border border-slate-200/5">
                    <div>
                      <span className="text-[10px] text-slate-450 block uppercase">Pearson Factor</span>
                      <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{selectedCell.val.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-455 block uppercase">Strength</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{analyzeCorrelation(selectedCell).strength}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-450 uppercase block font-semibold">Direction</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{analyzeCorrelation(selectedCell).direction}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-450 uppercase block font-semibold">Mathematical Explanation</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                      {analyzeCorrelation(selectedCell).explanation}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100/10 flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex-shrink-0 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-450 uppercase block font-semibold">Actionable Recommendation</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed mt-0.5 font-normal">
                        {analyzeCorrelation(selectedCell).recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl text-center text-slate-400 italic text-xs h-full flex items-center justify-center">
                Click any cell in the correlation matrix grid to view mathematical descriptions.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'covariance' && (
        <div className="glass-panel p-6 rounded-2xl overflow-x-auto">
          {numeric_columns.length > 1 ? (
            <div className="min-w-[600px] space-y-4">
              <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-2">
                Covariance Matrix Summary
              </h4>
              <div className="grid border border-slate-200 dark:border-slate-850" style={{ gridTemplateColumns: `repeat(${numeric_columns.length + 1}, minmax(110px, 1fr))` }}>
                <div className="bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-250 dark:border-slate-800 p-2.5 text-xs font-bold text-slate-400 uppercase">Variable</div>
                {numeric_columns.map((c: string) => (
                  <div key={c} className="bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-250 dark:border-slate-800 p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={c}>{c}</div>
                ))}
                
                {numeric_columns.map((colY: string) => (
                  <React.Fragment key={colY}>
                    <div className="bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-250 dark:border-slate-800 p-2.5 text-xs font-bold text-slate-850 dark:text-slate-200 truncate" title={colY}>{colY}</div>
                    
                    {numeric_columns.map((colX: string) => {
                      const match = covariance_matrix.find((m: any) => m.x === colX && m.y === colY);
                      const val = match ? match.value : 0;
                      return (
                        <div
                          key={colX}
                          className="border-b border-r border-slate-200 dark:border-slate-850 p-2.5 text-xs font-mono text-center text-slate-700 dark:text-slate-350"
                        >
                          {val.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 italic">
              Covariance requires at least 2 numerical columns.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RefreshIcon = ({ className }: { className: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
