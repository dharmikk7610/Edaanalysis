import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import confetti from 'canvas-confetti';

interface UploadDatasetProps {
  onUploadSuccess: (data: {
    session_id: string;
    filename: string;
    rows: number;
    columns_count: number;
    columns: string[];
    column_types: Record<string, string>;
    preview: any[];
  }) => void;
}

export const UploadDataset: React.FC<UploadDatasetProps> = ({ onUploadSuccess }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [metaInfo, setMetaInfo] = useState<{ rows: number; cols: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['csv', 'txt', 'xml', 'xlsx', 'xls', 'json'];
    
    if (!ext || !validExtensions.includes(ext)) {
      setErrorMsg(`Unsupported file extension: .${ext}. Supported files: CSV, TXT, XML, Excel (.xlsx, .xls), JSON`);
      setStatus('error');
      return false;
    }
    
    // Max size 50MB
    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMsg("File size exceeds 50MB limit.");
      setStatus('error');
      return false;
    }
    
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        upload(selectedFile);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        upload(selectedFile);
      }
    }
  };

  const upload = async (targetFile: File) => {
    setStatus('uploading');
    setUploadProgress(10);
    setErrorMsg('');
    
    const formData = new FormData();
    formData.append('file', targetFile);
    
    try {
      // Simulate visual smooth progression while API responds
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 150);

      const response = await axios.post('http://127.0.0.1:8000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      setStatus('success');
      setMetaInfo({
        rows: response.data.rows,
        cols: response.data.columns_count
      });
      
      // Fire confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Pass result back after short delay for user satisfaction
      setTimeout(() => {
        onUploadSuccess(response.data);
      }, 1000);

    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.detail || "An unexpected error occurred during upload. Check if the Python backend is running.");
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
          Upload Dataset
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          InsightAI supports CSV, Tabular TXT, XML, JSON, and Excel documents up to 50MB.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-3xl p-8"
      >
        {status === 'idle' && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerSelect}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInput}
              accept=".csv,.txt,.xml,.xlsx,.xls,.json"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <p className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-1">
              Drag & Drop files here
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
              or click to browse local folders
            </p>
            <div className="flex gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/20">CSV</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/20">Excel</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/20">JSON</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/20">XML</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/20">TXT</span>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-2">
              Uploading & parsing '{file?.name}'
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Analyzing file format and loading data to sandbox memory...
            </p>
            <div className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-200/25">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 mt-2">{uploadProgress}% completed</span>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">
              Dataset Loaded Successfully!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Loaded '{file?.name}' in-memory. Ready for exploration and analysis.
            </p>
            {metaInfo && (
              <div className="flex gap-8 justify-center py-3.5 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/20 mb-8 w-full max-w-sm">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Rows</span>
                  <span className="font-extrabold text-lg text-slate-800 dark:text-slate-200">{metaInfo.rows.toLocaleString()}</span>
                </div>
                <div className="border-r border-slate-200 dark:border-slate-800" />
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Columns</span>
                  <span className="font-extrabold text-lg text-slate-800 dark:text-slate-200">{metaInfo.cols}</span>
                </div>
              </div>
            )}
            <button className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20">
              Initializing Preview...
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">
              Upload Failed
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-rose-950/20 px-4 py-3 rounded-xl border border-red-200/20 mb-6 max-w-md leading-relaxed">
              {errorMsg}
            </p>
            <button
              onClick={() => {
                setFile(null);
                setStatus('idle');
                setErrorMsg('');
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 text-white font-semibold text-sm transition-all"
            >
              Try Another File
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
