import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Wind, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

import { api } from '../services/api';
import { OverviewResponse } from '../types';
import { MetricCard } from '../components/metrics/MetricCard';
import { InsightPanel } from '../components/metrics/InsightPanel';
import { CutoffSelector } from '../components/filters/CutoffSelector';
import { LoadingState } from '../components/states/LoadingState';
import { ErrorState } from '../components/states/ErrorState';

export const OverviewPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-01');
  const [selectedPolicy, setSelectedPolicy] = useState<string>('d0_0000');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOverview(selectedDate, selectedPolicy);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve overview data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedDate, selectedPolicy]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    if (d.getMonth() === 0 && d.getFullYear() === 2026) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      setSelectedDate(`2026-01-${pad(d.getDate())}`);
    }
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (d.getMonth() === 0 && d.getFullYear() === 2026) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      setSelectedDate(`2026-01-${pad(d.getDate())}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation & Filter Bar */}
      <div className="panel-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-slate-300 bg-white">
            <button
              onClick={handlePrevDay}
              disabled={selectedDate === '2026-01-01'}
              className="p-1.5 rounded-l text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{selectedDate}</span>
            </div>
            <button
              onClick={handleNextDay}
              disabled={selectedDate === '2026-01-31'}
              className="p-1.5 rounded-r text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-slate-500 hidden sm:inline">
            January 2026 (UK Delivery)
          </span>
        </div>

        <div className="flex items-center gap-3">
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

      {loading && <LoadingState message={`Loading delivery day ${selectedDate}...`} />}
      {error && <ErrorState error={error} onRetry={fetchOverview} />}

      {!loading && !error && data && (
        <>
          {/* Dynamic Analyst Insight Panel */}
          <InsightPanel
            summary={data.insight_summary}
            detail={data.insight_detail}
            cutoffLabel={data.cutoff_policy.label}
            publicationTime={data.latest_publish_time_london}
            isHistoricalReconstruction={data.is_historical_reconstruction}
          />

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Avg Forecast Generation"
              value={data.avg_forecast_mw}
              unit="MW"
              subtitle={`Total Energy: ${data.total_forecast_mwh.toLocaleString()} MWh`}
              icon={Wind}
              badge={{
                text: 'Day-Ahead',
                variant: 'info'
              }}
            />

            <MetricCard
              title="Avg Actual Generation"
              value={data.avg_actual_mw ?? 'N/A'}
              unit="MW"
              subtitle={data.total_actual_mwh ? `Total Outturn: ${data.total_actual_mwh.toLocaleString()} MWh` : 'Awaiting Settlement'}
              icon={Zap}
              badge={{
                text: data.avg_actual_mw ? 'FUELHH Actuals' : 'Unsettled',
                variant: data.avg_actual_mw ? 'success' : 'neutral'
              }}
            />

            <MetricCard
              title="Day MAE"
              value={data.day_mae_mw ?? 'N/A'}
              unit="MW"
              subtitle={data.day_rmse_mw ? `Day RMSE: ${data.day_rmse_mw.toLocaleString()} MW` : undefined}
              icon={TrendingUp}
              badge={{
                text: 'Abs Error',
                variant: 'warning'
              }}
            />

            <MetricCard
              title="Day Mean Error / Bias"
              value={data.day_bias_mw !== null && data.day_bias_mw !== undefined ? (data.day_bias_mw > 0 ? `+${data.day_bias_mw}` : `${data.day_bias_mw}`) : 'N/A'}
              unit="MW"
              subtitle={data.day_mape_pct ? `Day MAPE: ${data.day_mape_pct}%` : 'Net directional bias'}
              icon={TrendingDown}
              badge={{
                text: data.day_bias_mw && data.day_bias_mw > 0 ? 'Overestimate' : 'Underestimate',
                variant: data.day_bias_mw && data.day_bias_mw > 0 ? 'warning' : 'info'
              }}
            />
          </div>

          {/* Half-Hourly Delivery Chart */}
          <div className="panel-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Delivery Profile: Forecast vs Actual ({selectedDate})
                </h2>
                <p className="text-xs text-slate-500">
                  48 half-hourly settlement periods (SP 1 through SP 48)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-0.5 bg-blue-600 rounded"></span> Day-Ahead Forecast
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-0.5 bg-emerald-600 rounded"></span> Actual Outturn
                </span>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.intervals}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="start_time_london"
                    tickFormatter={(str) => {
                      const parts = str.split(' ');
                      return parts[1] || str;
                    }}
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
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
                    labelFormatter={(label) => `Interval Start: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast_mw"
                    name="forecast_mw"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorForecast)"
                  />
                  <Area
                    type="monotone"
                    dataKey="actual_mw"
                    name="actual_mw"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Settlement Periods Table */}
          <div className="panel-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Settlement Period Breakdown ({data.intervals.length} Periods)
              </h3>
            </div>

            <div className="overflow-x-auto max-h-[360px]">
              <table className="data-table">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th>Period (SP)</th>
                    <th>Interval Start</th>
                    <th>Selected Forecast Vintage</th>
                    <th className="text-right">Lead Time</th>
                    <th className="text-right">Forecast (MW)</th>
                    <th className="text-right">Actual (MW)</th>
                    <th className="text-right">Signed Error</th>
                    <th className="text-right">Abs Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {data.intervals.map((row, idx) => {
                    const err = row.signed_error_mw;
                    const errColor = err && err > 0 ? 'text-amber-700' : (err && err < 0 ? 'text-blue-700' : 'text-slate-700');
                    return (
                      <tr key={idx}>
                        <td className="font-semibold text-slate-600">
                          SP {row.settlement_period ?? (idx + 1)}
                        </td>
                        <td className="text-slate-900">
                          {row.start_time_london.split(' ')[1]}
                        </td>
                        <td className="text-slate-600">
                          {row.forecast_publish_time_london ?? 'N/A'}
                        </td>
                        <td className="text-right text-slate-500">
                          {row.lead_time_hours !== null && row.lead_time_hours !== undefined ? `${row.lead_time_hours.toFixed(1)}h` : '-'}
                        </td>
                        <td className="text-right font-medium text-blue-700">
                          {row.forecast_mw ? row.forecast_mw.toLocaleString() : '-'}
                        </td>
                        <td className="text-right font-medium text-emerald-700">
                          {row.actual_mw ? row.actual_mw.toLocaleString() : '-'}
                        </td>
                        <td className={`text-right font-semibold ${errColor}`}>
                          {err !== null && err !== undefined ? (err > 0 ? `+${err.toLocaleString()}` : err.toLocaleString()) : '-'}
                        </td>
                        <td className="text-right text-slate-800">
                          {row.abs_error_mw ? row.abs_error_mw.toLocaleString() : '-'}
                        </td>
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
