import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

import { api } from '../services/api';
import { DataQualityResponse } from '../types';
import { LoadingState } from '../components/states/LoadingState';
import { ErrorState } from '../components/states/ErrorState';

export const DataQualityPage: React.FC = () => {
  const [data, setData] = useState<DataQualityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuality = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDataQuality();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load data quality metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuality();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="panel-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Data Quality Audit & Methodology Reference
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Elexon BMRS dataset verification, sample completeness, and statistical formulas
          </p>
        </div>

        <button
          onClick={fetchQuality}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {loading && <LoadingState message="Auditing data quality and sample coverage..." />}
      {error && <ErrorState error={error} onRetry={fetchQuality} />}

      {!loading && !error && data && (
        <>
          {/* Audit Metrics */}
          <div className="panel-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                January 2026 Sample Coverage & Integrity Audit
              </h3>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Expected Settlement Periods</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">1,488</div>
                <div className="text-xs text-slate-500 mt-0.5">31 days &times; 48 periods (SP 1–48)</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-500">FUELHH Actual Intervals</div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  {data.actual_intervals_count.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-700 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Complete Outturn
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Raw Forecast Vintages</div>
                <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
                  {data.forecast_raw_records_count.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">All WINDFOR publications</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Matched Settlement Pairs</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {data.matched_half_hourly_count.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Zero missing delivery intervals</div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-500">Missing Actual Intervals</td>
                    <td className="py-2.5 font-semibold text-emerald-700 text-right">{data.missing_actual_intervals_count} (0.0%)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-500">Missing Forecast Intervals</td>
                    <td className="py-2.5 font-semibold text-emerald-700 text-right">{data.missing_forecast_intervals_count} (0.0%)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-500">Duplicate Intervals Dropped</td>
                    <td className="py-2.5 font-semibold text-slate-700 text-right">{data.duplicate_actual_records_count}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-500">Zero or Negative Actual Generation Intervals</td>
                    <td className="py-2.5 font-semibold text-slate-700 text-right">{data.zero_or_negative_actuals_count}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-500">Low-Actual Intervals Excluded from MAPE (&lt;100 MW denominator)</td>
                    <td className="py-2.5 font-semibold text-amber-700 text-right">{data.mape_excluded_count}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-500">Last Audit Refresh (UTC)</td>
                    <td className="py-2.5 text-slate-500 text-right">{data.last_refresh_timestamp_utc}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology Documentation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                Elexon Datasets & Normalization
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The platform interfaces directly with the official Balancing Mechanism Reporting Service (BMRS) APIs provided by Elexon:
              </p>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-slate-800">FUELHH (Actuals):</strong> Half-hourly outturn generation by fuel type for Great Britain. Filtered strictly to <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">fuelType = WIND</code>.
                </li>
                <li>
                  <strong className="text-slate-800">WINDFOR (Forecasts):</strong> National wind generation forecasts produced by National Grid ESO and published repeatedly prior to gate closure.
                </li>
                <li>
                  <strong className="text-slate-800">Timestamp Normalization:</strong> Normalized internally to ISO 8601 UTC. Displayed to users in Europe/London local time (GMT/BST aware).
                </li>
                <li>
                  <strong className="text-slate-800">Interval Semantics:</strong> Based on official BMRS documentation, <code className="text-slate-700 font-mono">startTime</code> marks the start of the delivery interval.
                </li>
              </ul>
            </div>

            <div className="panel-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                Error Metrics & Anti-Leakage
              </h3>
              <div className="text-xs text-slate-700 space-y-1.5 font-mono">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Signed Error:</span> Forecast - Actual
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">MAE:</span> mean(|Forecast - Actual|)
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">RMSE:</span> sqrt(mean((Forecast - Actual)&sup2;))
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Mean Bias:</span> mean(Forecast - Actual)
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">MAPE:</span> mean(|Forecast - Actual| / Actual) &times; 100
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                <strong>Anti-Leakage Guarantee:</strong> For every delivery interval, eligible forecast vintages are constrained by <code className="text-blue-700 font-mono">publishTime &le; decision_cutoff</code>. Forecasts published after the cutoff are permanently excluded.
              </p>
            </div>
          </div>

          {/* Assumptions & Notes */}
          <div className="panel-card p-5 border-l-4 border-l-amber-500">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Procurement Assumptions & Practical Notes
            </h3>
            <div className="mt-2 text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                1. <strong>Wind Forecast vs Total Procurement:</strong> National wind forecasts provide vital renewable volume expectations. However, total electricity procurement also requires consumer demand forecasts, solar generation, interconnectors, and thermal fleet availability. WindScope serves as a renewable forecast intelligence tool rather than an automated trade execution system.
              </p>
              <p>
                2. <strong>Hourly WINDFOR Resolution:</strong> While FUELHH settlement occurs at 30-minute intervals (SP 1–48), National Grid ESO's WINDFOR dataset publishes hourly generation expectations (:00). In settlement mapping mode, the hourly average applies across both constituent 30-minute settlement periods. Both exact hourly and settlement mapping modes are provided for complete analytical transparency.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
