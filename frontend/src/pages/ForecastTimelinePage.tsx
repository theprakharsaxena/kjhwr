import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Brush 
} from 'recharts';
import { 
  Calendar, 
  Filter, 
  Download, 
  Activity 
} from 'lucide-react';

import { api } from '../services/api';
import { TimelineResponse } from '../types';
import { CutoffSelector } from '../components/filters/CutoffSelector';
import { LoadingState } from '../components/states/LoadingState';
import { ErrorState } from '../components/states/ErrorState';

export const ForecastTimelinePage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-07');
  const [selectedPolicy, setSelectedPolicy] = useState<string>('d0_0000');
  const [resolution, setResolution] = useState<string>('half_hourly');
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTimeline(startDate, endDate, selectedPolicy, undefined, resolution);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [startDate, endDate, selectedPolicy, resolution]);

  const setQuickRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6">
      {/* Controls Toolbar */}
      <div className="panel-card p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Quick Range Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Range:
          </span>
          <button
            onClick={() => setQuickRange('2026-01-01', '2026-01-01')}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              startDate === '2026-01-01' && endDate === '2026-01-01'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Jan 1 (Single Day)
          </button>
          <button
            onClick={() => setQuickRange('2026-01-01', '2026-01-07')}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              startDate === '2026-01-01' && endDate === '2026-01-07'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Week 1 (Jan 1–7)
          </button>
          <button
            onClick={() => setQuickRange('2026-01-08', '2026-01-14')}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              startDate === '2026-01-08' && endDate === '2026-01-14'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Week 2 (Jan 8–14)
          </button>
          <button
            onClick={() => setQuickRange('2026-01-01', '2026-01-31')}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              startDate === '2026-01-01' && endDate === '2026-01-31'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Full Month (Jan 1–31)
          </button>
        </div>

        {/* Resolution & Settings */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-md border border-slate-300 bg-white p-0.5 text-xs">
            <button
              onClick={() => setResolution('half_hourly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                resolution === 'half_hourly'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Half-Hourly (30m)
            </button>
            <button
              onClick={() => setResolution('hourly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                resolution === 'hourly'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hourly (60m)
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

          <a
            href={api.getExportCsvUrl(startDate, endDate, selectedPolicy, undefined, resolution)}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </a>
        </div>
      </div>

      {showFilters && (
        <CutoffSelector
          selectedPolicyId={selectedPolicy}
          onSelectPolicy={(p) => setSelectedPolicy(p)}
          disabled={loading}
        />
      )}

      {loading && <LoadingState message="Loading time-series data..." />}
      {error && <ErrorState error={error} onRetry={fetchTimeline} />}

      {!loading && !error && data && (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="panel-card p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Matched Intervals</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {data.summary_metrics.sample_size_matched.toLocaleString()} / {data.summary_metrics.total_expected_intervals}
              </div>
              <span className="text-xs text-emerald-600 font-medium">{data.summary_metrics.coverage_pct}% coverage</span>
            </div>

            <div className="panel-card p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">MAE</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {data.summary_metrics.mae_mw.toLocaleString()} MW
              </div>
              <span className="text-xs text-slate-500">Mean Absolute Error</span>
            </div>

            <div className="panel-card p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mean Error / Bias</span>
              <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">
                {data.summary_metrics.mean_error_bias_mw > 0 ? `+${data.summary_metrics.mean_error_bias_mw}` : data.summary_metrics.mean_error_bias_mw} MW
              </div>
              <span className="text-xs text-slate-500">
                {data.summary_metrics.mean_error_bias_mw > 0 ? 'Overestimate bias' : 'Underestimate bias'}
              </span>
            </div>

            <div className="panel-card p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">MAPE</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {data.summary_metrics.mape_pct ? `${data.summary_metrics.mape_pct}%` : 'N/A'}
              </div>
              <span className="text-xs text-slate-500">
                {data.summary_metrics.mape_sample_size} valid obs (&ge;100 MW)
              </span>
            </div>
          </div>

          {/* Time Series Chart */}
          <div className="panel-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Wind Generation Time-Series ({data.start_date} to {data.end_date})
                </h3>
                <p className="text-xs text-slate-500">
                  Forecast vs Actual generation across intervals. Drag bottom slider to zoom.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-0.5 bg-blue-600 rounded"></span> Day-Ahead Forecast (MW)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-0.5 bg-emerald-600 rounded"></span> Actual Outturn (MW)
                </span>
              </div>
            </div>

            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.intervals}
                  margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="start_time_london"
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(str) => {
                      const parts = str.split(' ');
                      return `${parts[0].slice(5)} ${parts[1] || ''}`;
                    }}
                    interval={resolution === 'half_hourly' ? 47 : 23}
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
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toLocaleString()} MW`,
                      name === 'forecast_mw' ? 'Day-Ahead Forecast' : 'Actual Outturn'
                    ]}
                    labelFormatter={(label) => `Delivery Interval: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast_mw"
                    name="forecast_mw"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual_mw"
                    name="actual_mw"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Brush
                    dataKey="start_time_london"
                    height={28}
                    stroke="#94a3b8"
                    fill="#f8fafc"
                    tickFormatter={() => ''}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
