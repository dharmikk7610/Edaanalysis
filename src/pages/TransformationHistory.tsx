import React, { useState, useEffect } from 'react';
import { Activity, Clock, RefreshCw, CheckCircle, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface TransformationHistoryProps {
  session_id: string;
}

interface HistoryItem {
  time: string;
  event: string;
  details: string;
}

export const TransformationHistory: React.FC<TransformationHistoryProps> = ({ session_id }) => {
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/history?session_id=${session_id}`);
      setHistoryList(response.data);
    } catch (err) {
      console.error("Failed to load operations history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [session_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-550 font-semibold">Retrieving session timeline log...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-emerald-500 animate-pulse" />
            Operation History Log
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse the sequential timeline of data cleaning, scaling, and exploration events recorded in this session.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-500/10 text-slate-450 hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Log
        </button>
      </div>

      <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl relative">
        <div className="absolute left-[39px] top-12 bottom-12 w-0.5 bg-slate-200 dark:bg-slate-850" />

        <div className="space-y-8 relative">
          {historyList.map((item, idx) => {
            const isUpload = item.event === "Dataset Uploaded";
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="flex gap-6 items-start"
              >
                {/* Timeline Icon Node */}
                <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center flex-shrink-0 z-10 border ${
                  isUpload 
                    ? 'bg-blue-600 border-blue-600 text-white shadow shadow-blue-500/20' 
                    : 'bg-emerald-550 border-emerald-600 text-white shadow shadow-emerald-500/20'
                }`}>
                  {isUpload ? <Database className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </div>

                {/* Event Details Content Card */}
                <div className="flex-grow p-4.5 rounded-2xl glass-card border border-slate-200/5 space-y-1.5">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      {item.event}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 whitespace-nowrap bg-slate-500/5 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    {item.details}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
