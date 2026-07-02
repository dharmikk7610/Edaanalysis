import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Award, Star, ListChecks, ArrowRight, BarChart3, 
  Layers, CheckCircle, Database, HelpCircle, Activity, LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface ExecutiveDashboardProps {
  session_id: string;
  filename: string;
  rows: number;
  cols: number;
  columns: string[];
  columnTypes: Record<string, string>;
  onNavigate: (page: any, params?: any) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  session_id,
  filename,
  rows,
  cols,
  columns,
  columnTypes,
  onNavigate
}) => {
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<any | null>(null);
  const [recsData, setRecsData] = useState<any | null>(null);
  const [summaryText, setSummaryText] = useState('');
  
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Load Quality Score
        const qRes = await axios.get(`http://127.0.0.1:8000/api/quality?session_id=${session_id}`);
        setQualityData(qRes.data);
        
        // Load Recommendations
        const rRes = await axios.get(`http://127.0.0.1:8000/api/recommendations?session_id=${session_id}`);
        setRecsData(rRes.data);
        
        // Load Executive Summary
        const iRes = await axios.get(`http://127.0.0.1:8000/api/insights?session_id=${session_id}`);
        setSummaryText(iRes.data.sections.executive_summary);
        
      } catch (err) {
        console.error("Failed to load executive dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [session_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 font-semibold">Compiling executive profile analytics...</span>
      </div>
    );
  }

  // Count datatypes
  const numCount = columns.filter(c => columnTypes[c] === 'Numeric').length;
  const dateCount = columns.filter(c => columnTypes[c] === 'DateTime').length;
  const catCount = columns.length - numCount - dateCount;

  // Star Rating Helper
  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-5 h-5 ${i < count ? 'fill-amber-400 text-amber-400 animate-pulse' : 'text-slate-350 dark:text-slate-700'}`} 
      />
    ));
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 75) return 'text-blue-500 stroke-blue-500';
    if (score >= 50) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-blue-500" />
            Executive Cockpit
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Enterprise overview of dataset '{filename}' summarizing quality factors and core insights.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data Quality Score */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-between h-[360px] text-center">
          <div className="w-full flex justify-between items-center border-b border-slate-100/5 pb-2">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Dataset Quality Index
            </h3>
          </div>
          
          <div className="relative my-4 flex items-center justify-center">
            {/* SVG circular progress indicator */}
            <svg className="w-40 h-40 transform -rotate-90">
              <circle 
                cx="80" 
                cy="80" 
                r="64" 
                className="stroke-slate-100 dark:stroke-slate-800" 
                strokeWidth="12" 
                fill="transparent" 
              />
              <motion.circle 
                cx="80" 
                cy="80" 
                r="64" 
                className={getScoreColorClass(qualityData?.score)}
                strokeWidth="12" 
                strokeDasharray={402}
                initial={{ strokeDashoffset: 402 }}
                animate={{ strokeDashoffset: 402 - (402 * (qualityData?.score || 0)) / 100 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                strokeLinecap="round"
                fill="transparent" 
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {qualityData?.score}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">out of 100</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="block font-bold text-lg text-slate-800 dark:text-slate-200">
              {qualityData?.label} Health
            </span>
            <div className="flex gap-1 justify-center mt-1">
              {renderStars(qualityData?.stars || 0)}
            </div>
          </div>
        </div>

        {/* Center: Executive Summary narrative card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[360px] bg-gradient-to-br from-blue-50/10 via-indigo-50/5 to-transparent border-blue-500/10">
          <div>
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Management Narrative
            </h3>
            <p className="text-base text-slate-700 dark:text-slate-350 leading-relaxed font-normal">
              {summaryText || "No executive summary available."}
            </p>
          </div>
          
          <div className="flex gap-4 border-t border-slate-100/10 pt-4 text-xs font-semibold text-slate-400">
            <div>
              <span className="text-slate-400 block uppercase text-[9px] tracking-wide">File Loaded</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{filename}</span>
            </div>
            <div className="border-r border-slate-200 dark:border-slate-800" />
            <div>
              <span className="text-slate-400 block uppercase text-[9px] tracking-wide">Numerical Attributes</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{numCount} columns</span>
            </div>
            <div className="border-r border-slate-200 dark:border-slate-800" />
            <div>
              <span className="text-slate-400 block uppercase text-[9px] tracking-wide">Categorical Attributes</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{catCount} columns</span>
            </div>
          </div>
        </div>

        {/* Action Suggestions checklist list */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100/5 pb-2">
            <ListChecks className="w-4 h-4 text-indigo-500" />
            Health Optimizations
          </h3>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {qualityData?.suggestions.map((sug: any, idx: number) => (
              <div 
                key={idx} 
                className="p-3 rounded-xl border border-slate-200/5 bg-slate-500/5 hover:border-slate-500/15 transition-all space-y-1 select-none"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs">🔔</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {sug.text}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal pl-5">
                  {sug.impact}
                </p>
              </div>
            ))}
          </div>
          <button 
            onClick={() => onNavigate('clean')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-850 text-white font-bold text-xs flex justify-center items-center gap-1 transition-all"
          >
            Apply Heuristics
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recommended Graphs */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100/5 pb-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Smart Graph Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recsData?.graphs.map((graph: any, idx: number) => (
              <div 
                key={idx}
                className="p-4 rounded-xl border border-slate-200/5 bg-slate-500/5 flex flex-col justify-between space-y-3 hover:border-blue-500/20 transition-all group"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      {graph.type.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[8px] font-extrabold uppercase">
                      Recommended
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-2">
                    {graph.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {graph.reason}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('visuals', { plotType: graph.type, x: graph.x, y: graph.y, hue: graph.hue })}
                  className="py-1.5 px-3 rounded-lg bg-blue-650/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold flex justify-center items-center gap-1 transition-all"
                >
                  Generate plot
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
