import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, CheckSquare, AlertTriangle, TrendingUp, Cpu, HelpCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface InsightsDashboardProps {
  session_id: string;
  columns: string[];
}

export const InsightsDashboard: React.FC<InsightsDashboardProps> = ({ session_id, columns }) => {
  const [targetCol, setTargetCol] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/insights', {
        params: {
          session_id,
          target_col: targetCol || null
        }
      });
      setInsights(response.data);
    } catch (err) {
      console.error("Failed to generate insights", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [session_id]);

  // A very lightweight helper to parse markdown formatting (bold, bullet points) into clean HTML
  const formatText = (text: string) => {
    if (!text) return '';
    return text.split('\n').map((line, i) => {
      let content = line.trim();
      if (!content) return <div key={i} className="h-2" />;
      
      // Check bullet point
      const isBullet = content.startsWith('- ') || content.startsWith('* ');
      if (isBullet) {
        content = content.substring(2);
      }

      // Check warnings / checkmarks
      const isWarning = content.includes('⚠️');
      const isCheck = content.includes('✅');
      const isInfo = content.includes('ℹ️');

      // Replace bold markdown **text** -> <strong>text</strong>
      const parts = content.split('**');
      const formattedParts = parts.map((part, idx) => {
        if (idx % 2 === 1) return <strong key={idx} className="font-extrabold text-slate-900 dark:text-white">{part}</strong>;
        return part;
      });

      if (isBullet) {
        return (
          <div key={i} className="flex gap-2 text-sm text-slate-650 dark:text-slate-400 mb-2 ml-2 leading-relaxed">
            <span className="text-blue-500 font-bold select-none">•</span>
            <span>{formattedParts}</span>
          </div>
        );
      }

      if (isWarning || isCheck || isInfo) {
        return (
          <div key={i} className="p-3.5 rounded-xl border border-slate-200/10 bg-slate-50/50 dark:bg-slate-950/20 text-sm leading-relaxed mb-3.5 flex gap-2.5">
            <span>{isWarning ? '⚠️' : isCheck ? '✅' : 'ℹ️'}</span>
            <div className="flex-grow">
              {formattedParts}
            </div>
          </div>
        );
      }

      return (
        <p key={i} className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed mb-2.5">
          {formattedParts}
        </p>
      );
    });
  };

  // Helper to render markdown table (specifically for feature importance)
  const renderTable = (tableText: string) => {
    if (!tableText) return null;
    const lines = tableText.split('\n');
    const tableLines = lines.filter(line => line.includes('|'));
    
    if (tableLines.length < 2) return formatText(tableText);

    // Filter headers and values, skip separators
    const rows = tableLines
      .filter(line => !line.includes(':---'))
      .map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));

    if (rows.length === 0) return null;

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return (
      <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded-xl my-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-850 font-bold text-slate-500">
              {headers.map((h, i) => <th key={i} className="px-4 py-2.5">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50 text-slate-700 dark:text-slate-350">
            {dataRows.map((r, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5">
                {r.map((cell, cIdx) => {
                  // highlight column name
                  const isBold = cell.startsWith('**') && cell.endsWith('**');
                  const cleanCell = isBold ? cell.replace(/\*\*/g, '') : cell;
                  return (
                    <td key={cIdx} className={`px-4 py-2 ${cIdx === 1 ? 'font-bold' : ''}`}>
                      {cleanCell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-500" />
            AI Statistical Insights
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Read high-fidelity analytical findings, recommendations, and feature importance rankings.
          </p>
        </div>

        {/* Target Selector */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <span>Target Column (ML):</span>
          <select
            value={targetCol}
            onChange={(e) => setTargetCol(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            <option value="">-- None (Unsupervised) --</option>
            {columns.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="ml-2.5 p-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:scale-105 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
          <span className="text-slate-500 font-semibold">Training Random Forest model and compiling insights...</span>
        </div>
      ) : insights ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Executive Summary (Double column card) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl bg-gradient-to-br from-blue-50/10 via-indigo-50/5 to-transparent border-blue-500/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
                  Executive Narrative Summary
                </h3>
              </div>
              <div className="text-base text-slate-700 dark:text-slate-350 leading-relaxed font-normal">
                {formatText(insights.sections.executive_summary)}
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100/10 pt-4 flex justify-between items-center text-xs text-slate-400">
              <span>InsightAI Engine v1.0</span>
              <span>Fully local execution</span>
            </div>
          </div>

          {/* Dataset Profile */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  Dataset Core Profile
                </h3>
              </div>
              <div className="space-y-1.5">
                {formatText(insights.sections.dataset_summary)}
              </div>
            </div>
          </div>

          {/* Data Quality Report */}
          <div className="glass-panel p-6 rounded-2xl border-rose-500/10 bg-gradient-to-b from-rose-500/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                Data Quality Audit
              </h3>
            </div>
            <div className="space-y-1">
              {formatText(insights.sections.data_quality_report)}
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                Mathematical Trends
              </h3>
            </div>
            <div>
              {formatText(insights.sections.trend_analysis)}
            </div>
          </div>

          {/* Correlations */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                Linear Core Dependencies
              </h3>
            </div>
            <div>
              {formatText(insights.sections.top_correlations)}
            </div>
          </div>

          {/* Feature Importance (ML based) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                Variable Explanatory Power Ranking
              </h3>
            </div>
            <div>
              {renderTable(insights.sections.feature_importance)}
            </div>
          </div>

          {/* Recommendations Checklist */}
          <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border-emerald-500/10 bg-gradient-to-b from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                Actionable Recommendations
              </h3>
            </div>
            <div className="space-y-1">
              {formatText(insights.sections.recommendations)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 italic">
          Run insights engine to compile report.
        </div>
      )}
    </div>
  );
};
