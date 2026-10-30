import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  subMessage = 'Querying and calculating Elexon metrics'
}) => {
  return (
    <div className="panel-card p-12 flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-800">{message}</h4>
        <p className="text-xs text-slate-500">{subMessage}</p>
      </div>
    </div>
  );
};
