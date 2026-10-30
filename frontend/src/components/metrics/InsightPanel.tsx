import React from 'react';
import { Info } from 'lucide-react';

interface InsightPanelProps {
  summary: string;
  detail: string;
  cutoffLabel?: string;
  publicationTime?: string | null;
  isHistoricalReconstruction?: boolean;
}

export const InsightPanel: React.FC<InsightPanelProps> = ({
  summary,
  detail,
  cutoffLabel,
  publicationTime,
  isHistoricalReconstruction = true
}) => {
  return (
    <div className="bg-blue-50/60 border border-blue-200 border-l-4 border-l-blue-600 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded bg-blue-100 text-blue-700 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Procurement Impact Analysis
            </h3>
            {isHistoricalReconstruction && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 border border-blue-200">
                Decision-Time Reconstruction (Anti-Leakage)
              </span>
            )}
          </div>

          <p className="text-sm text-slate-800 font-medium leading-relaxed">
            {summary}
          </p>

          <p className="text-xs text-slate-600 mt-2 leading-relaxed border-t border-blue-200/60 pt-2">
            {detail}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {cutoffLabel && (
              <span>Cutoff Policy: <strong className="text-slate-700">{cutoffLabel}</strong></span>
            )}
            {publicationTime && (
              <span>Selected Publication: <strong className="text-slate-700 font-mono">{publicationTime}</strong></span>
            )}
            <span>Source: <strong className="text-slate-700">Elexon WINDFOR</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
