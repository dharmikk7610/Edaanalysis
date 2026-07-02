import React, { useState, useMemo } from 'react';
import { Search, Eye, Filter, ArrowLeft, ArrowRight, Hash, Calendar, Type } from 'lucide-react';
import { motion } from 'framer-motion';

interface DataPreviewProps {
  filename: string;
  rowsCount: number;
  colsCount: number;
  columns: string[];
  columnTypes: Record<string, string>;
  previewData: any[];
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  filename,
  rowsCount,
  colsCount,
  columns,
  columnTypes,
  previewData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'Numeric' | 'Text' | 'DateTime'>('all');

  // Type Icons Helper
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Numeric':
        return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case 'DateTime':
        return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Type className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  // Filter columns based on data type dropdown selector
  const filteredColumns = useMemo(() => {
    if (selectedTypeFilter === 'all') return columns;
    return columns.filter(col => columnTypes[col] === selectedTypeFilter);
  }, [columns, columnTypes, selectedTypeFilter]);

  // Filter rows based on search text
  const filteredRows = useMemo(() => {
    if (!searchTerm) return previewData;
    const term = searchTerm.toLowerCase();
    return previewData.filter(row => {
      return Object.values(row).some(val => 
        val !== null && String(val).toLowerCase().includes(term)
      );
    });
  }, [previewData, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Title Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-7 h-7 text-blue-500" />
            Data Preview
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Displaying a sample of the first 100 rows loaded in memory.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/20 text-xs">
            <span className="text-slate-400 block">Active File</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{filename}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/20 text-xs">
            <span className="text-slate-400 block">Total Records</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{rowsCount.toLocaleString()} rows × {colsCount} cols</span>
          </div>
        </div>
      </div>

      {/* Grid Controls (Search and filters) */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-800"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto justify-end">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Columns:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => {
                setSelectedTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none outline-none font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Numeric">Numeric</option>
              <option value="Text">Text/Categoric</option>
              <option value="DateTime">DateTime</option>
            </select>
          </div>

          {/* Rows Per Page */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent border-none outline-none font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* The Data Grid Table */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 sticky top-0 backdrop-blur-md">
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-16">
                  Index
                </th>
                {filteredColumns.map(col => (
                  <th key={col} className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[150px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{col}</span>
                      <span className="flex items-center gap-1 text-[10px] lowercase text-slate-400">
                        {getTypeIcon(columnTypes[col])}
                        {columnTypes[col] || 'text'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, rIdx) => {
                  const absoluteIdx = (currentPage - 1) * pageSize + rIdx;
                  return (
                    <tr 
                      key={rIdx} 
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      <td className="px-5 py-3 text-xs font-bold text-slate-400 bg-slate-50/20 dark:bg-slate-900/5">
                        #{absoluteIdx + 1}
                      </td>
                      {filteredColumns.map(col => {
                        const val = row[col];
                        const isNull = val === null || val === undefined;
                        return (
                          <td 
                            key={col} 
                            className={`px-5 py-3 text-sm font-medium ${
                              isNull 
                                ? 'text-rose-400/70 italic bg-rose-50/5 dark:bg-rose-900/5' 
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isNull ? 'NaN' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td 
                    colSpan={filteredColumns.length + 1} 
                    className="text-center py-12 text-slate-400 italic"
                  >
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Grid Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
          <span className="text-xs font-semibold text-slate-400">
            Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} filtered rows
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange('next')}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
