import React from 'react';
import { Database, Sparkles, BarChart3, ShieldCheck, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-hidden bg-bgLight dark:bg-bgDark transition-colors duration-300">
      {/* Decorative Gradient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-500/10 dark:bg-teal-600/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
            InsightAI
          </span>
        </div>
        <button
          onClick={onStart}
          className="px-5 py-2 rounded-xl text-sm font-semibold glass-card text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-all border border-blue-100/20"
        >
          Enter Platform
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 mb-8">
            <ShieldCheck className="w-3.5 h-3.5" />
            Local & Secure (In-Memory Processing)
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6 font-sans">
            AI-Powered Exploratory{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-500 bg-clip-text text-transparent">
              Data Analysis
            </span>
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            InsightAI is an enterprise-grade analytics sandbox. Upload your dataset, run auto-cleaning heuristics, detect outliers, view 18 professional chart layouts, and compile executive PDF summaries instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onStart}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
            >
              Analyze Your Data
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-24 text-left"
        >
          <div className="glass-panel p-6 rounded-2xl hover:border-blue-500/30 transition-all hover:scale-[1.01]">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Auto-Cleaning</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Drop duplicate records, identify null regions, convert string columns, strip currencies, and standardize text encodings automatically.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-teal-500/30 transition-all hover:scale-[1.01]">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">18 Visualization Styles</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Generate custom histograms, Boxplots, count distribution vectors, correlation matrix maps, and time series graphs instantly downloadable.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-indigo-500/30 transition-all hover:scale-[1.01]">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Executive Reports</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Compile analytical summaries, feature correlations, and business suggestions into downloadable clean PDFs.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-slate-100/10 dark:border-slate-800/10 text-xs text-slate-400 dark:text-slate-600 z-10">
        © 2026 InsightAI. Local in-memory execution. No server tracking.
      </footer>
    </div>
  );
};
