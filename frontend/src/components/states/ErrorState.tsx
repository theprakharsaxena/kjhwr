import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  title = 'An error occurred'
}) => {
  return (
    <div className="panel-card p-8 flex flex-col items-center justify-center text-center space-y-3 border-rose-200 bg-rose-50/40 min-h-[240px]">
      <AlertCircle className="w-8 h-8 text-rose-500" />
      <div className="space-y-1 max-w-md">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="text-xs text-rose-700 font-mono bg-white p-2 rounded border border-rose-200 break-words">
          {error}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
