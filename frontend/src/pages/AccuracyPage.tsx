import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Filter, 
  AlertTriangle, 
  BarChart2, 
  Gauge
} from 'lucide-react';

import { api } from '../services/api';
import { AccuracyResponse } from '../types';
import { MetricCard } from '../components/metrics/MetricCard';
import { CutoffSelector } from '../components/filters/CutoffSelector';
import { LoadingState } from '../components/states/LoadingState';
import { ErrorState } from '../components/states/ErrorState';

export const AccuracyPage: React.FC = () => {
  const [selectedPolicy, setSelectedPolicy] = useState<string>('d0_0000');
  const [resolution, setResolution] = useState<string>('half_hourly');
  const [data, setData] = useState<AccuracyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const fetchAccuracy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAccuracy('2026-01-01', '2026-01-31', selectedPolicy, undefined, resolution);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate accuracy metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccuracy();
  }, [selectedPolicy, resolution]);

  return (
    <div className="space-y-6">
      {/* Policy Bar */}
      <div className="panel-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            Evaluation Benchmark: January 1–31, 2026
          </h2>
          <p className="text-xs text-slate-500">
            Evaluating day-ahead forecast accuracy against Elexon FUELHH actuals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-slate-300 bg-white p-0.5 text-xs">
            <button
              onClick={() => setResolution('half_hourly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                resolution === 'half_hourly'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Half-Hourly (1,488 SP)
            </button>
            <button
              onClick={() => setResolution('hourly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                resolution === 'hourly'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hourly (744)
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              showFilters
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Cutoff Settings</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <CutoffSelector
          selectedPolicyId={selectedPolicy}
          onSelectPolicy={(p) => setSelectedPolicy(p)}
          disabled={loading}
        />
      )}

      {loading && <LoadingState message="Calculating January 2026 accuracy metrics..." />}
      {error && <ErrorState error={error} onRetry={fetchAccuracy} />}

      {!loading && !error && data && (
        <>
          {/* Accuracy Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Mean Absolute Error (MAE)"
              value={data.metrics.mae_mw.toLocaleString()}
              unit="MW"
              subtitle={data.metrics.nmae_pct ? `NMAE: ${data.metrics.nmae_pct}% of mean generation` : undefined}
              icon={TrendingUp}
              badge={{
                text: 'Magnitude Error',
                variant: 'warning'
              }}
            />

            <MetricCard
              title="Root Mean Squared Error (RMSE)"
              value={data.metrics.rmse_mw.toLocaleString()}
              unit="MW"
              subtitle="Penalizes large outlier spikes"
              icon={Gauge}
              badge={{
                text: 'Quadratic Penalty',
                variant: 'neutral'
              }}
            />

            <MetricCard
              title="Mean Error / Bias"
              value={data.metrics.mean_error_bias_mw > 0 ? `+${data.metrics.mean_error_bias_mw.toLocaleString()}` : `${data.metrics.mean_error_bias_mw.toLocaleString()}`}
              unit="MW"
              subtitle={data.metrics.mean_error_bias_mw > 0 ? 'Systematic over-forecasting' : 'Systematic under-forecasting'}
              icon={TrendingDown}
              badge={{
                text: data.metrics.mean_error_bias_mw > 0 ? '+Bias (Overestimate)' : '-Bias (Underestimate)',
                variant: data.metrics.mean_error_bias_mw > 0 ? 'warning' : 'info'
              }}
            />

            <MetricCard
              title="Mean Abs Percentage Error (MAPE)"
              value={data.metrics.mape_pct ? `${data.metrics.mape_pct}%` : 'N/A'}
              subtitle={`${data.metrics.mape_sample_size} valid / ${data.metrics.mape_excluded_count} excluded (<100 MW)`}
              icon={Percent}
              badge={{
                text: 'Safe Denominator',
                variant: 'success'
              }}
            />
          </div>

          {/* Sample Coverage Note */}
          <div className="px-4 py-2.5 rounded-md bg-white border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <span>
              Evaluation Sample: <strong>{data.metrics.sample_size_matched}</strong> matched intervals (of {data.metrics.total_expected_intervals} expected)
            </span>
            <span className="text-emerald-700 font-medium">
              Coverage: {data.metrics.coverage_pct}% Complete
            </span>
            <span>
              Policy: <strong>{data.cutoff_policy.label}</strong>
            </span>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Distribution Histogram */}
            <div className="panel-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Forecast Error Distribution (MW)
                </h3>
                <p className="text-xs text-slate-500">
                  Signed error (Forecast - Actual). Positive values represent wind overestimation.
                </p>
              </div>

              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.error_distribution}
                    margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="bin_label"
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '6px',
                        color: '#0f172a',
                        fontSize: '12px'
                      }}
                      formatter={(v: any) => [`${v} intervals`, 'Interval Count']}
                      labelFormatter={(l) => `Error Range: ${l}`}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {data.error_distribution.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.bin_start >= 0 ? '#3b82f6' : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Mean Bias */}
            <div className="panel-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700" />
                  Daily Mean Bias (MW)
                </h3>
                <p className="text-xs text-slate-500">
                  Daily average signed error across January 1–31, 2026
                </p>
              </div>

              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.daily_metrics}
                    margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="delivery_date"
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(str) => str.slice(8)}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '6px',
                        color: '#0f172a',
                        fontSize: '12px'
                      }}
                      formatter={(v: any) => [`${Number(v).toLocaleString()} MW`, 'Daily Mean Bias']}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Bar dataKey="bias_mw" radius={[3, 3, 0, 0]}>
                      {data.daily_metrics.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.bias_mw >= 0 ? '#f59e0b' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top 10 Outlier Errors Table */}
          <div className="panel-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Top 10 Largest Absolute Forecast Errors (Outliers)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Delivery Interval</th>
                    <th>Selected Vintage</th>
                    <th className="text-right">Lead Time</th>
                    <th className="text-right">Forecast (MW)</th>
                    <th className="text-right">Actual (MW)</th>
                    <th className="text-right">Signed Error</th>
                    <th className="text-right">Abs Error (MW)</th>
                    <th className="text-right">Error %</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {data.largest_errors.map((row, idx) => {
                    const err = row.signed_error_mw;
                    const errColor = err && err > 0 ? 'text-amber-700' : 'text-blue-700';
                    return (
                      <tr key={idx}>
                        <td className="font-semibold text-slate-500">#{idx + 1}</td>
                        <td className="font-medium text-slate-900">{row.start_time_london}</td>
                        <td className="text-slate-600">{row.forecast_publish_time_london ?? 'N/A'}</td>
                        <td className="text-right text-slate-500">{row.lead_time_hours ? `${row.lead_time_hours.toFixed(1)}h` : '-'}</td>
                        <td className="text-right font-medium text-blue-700">{row.forecast_mw?.toLocaleString()}</td>
                        <td className="text-right font-medium text-emerald-700">{row.actual_mw?.toLocaleString()}</td>
                        <td className={`text-right font-semibold ${errColor}`}>
                          {err && err > 0 ? `+${err.toLocaleString()}` : err?.toLocaleString()}
                        </td>
                        <td className="text-right font-bold text-slate-900">{row.abs_error_mw?.toLocaleString()}</td>
                        <td className="text-right text-slate-700">{row.pct_error ? `${row.pct_error.toFixed(1)}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
