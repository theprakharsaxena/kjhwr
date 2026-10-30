import React from 'react';
import { Download, RefreshCw, Calendar, Clock } from 'lucide-react';
import { CutoffPolicyInfo } from '../../types';

interface HeaderProps {
  title: string;
  subtitle: string;
  selectedDate?: string;
  cutoffPolicy?: CutoffPolicyInfo;
  onRefresh?: () => void;
  exportUrl?: string;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  selectedDate,
  cutoffPolicy,
  onRefresh,
  exportUrl,
  isRefreshing = false
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {selectedDate && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Delivery: <strong>{selectedDate}</strong></span>
          </div>
        )}

        {cutoffPolicy && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700" title={cutoffPolicy.description}>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Cutoff: <strong>{cutoffPolicy.label}</strong></span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}

          {exportUrl && (
            <a
              href={exportUrl}
              download
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
