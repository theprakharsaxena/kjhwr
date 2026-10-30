import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Filter, 
  Info 
} from 'lucide-react';

import { api } from '../services/api';
import { VintagesResponse } from '../types';
import { MetricCard } from '../components/metrics/MetricCard';
import { CutoffSelector } from '../components/filters/CutoffSelector';
import { LoadingState } from '../components/states/LoadingState';
import { ErrorState } from '../components/states/ErrorState';

export const ForecastHistoryPage: React.FC = () => {
  const [selectedInterval, setSelectedInterval] = useState<string>('2026-01-15T12:00:00Z');
  const [selectedPolicy, setSelectedPolicy] = useState<string>('d0_0000');
  const [data, setData] = useState<VintagesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const targetIntervalPresets = [
    { label: 'Jan 1 12:00', value: '2026-01-01T12:00:00Z' },
    { label: 'Jan 5 18:00 (Peak)', value: '2026-01-05T18:00:00Z' },
    { label: 'Jan 10 03:00 (Trough)', value: '2026-01-10T03:00:00Z' },
    { label: 'Jan 15 12:00', value: '2026-01-15T12:00:00Z' },
    { label: 'Jan 20 18:00 (Peak)', value: '2026-01-20T18:00:00Z' },
    { label: 'Jan 28 14:00', value: '2026-01-28T14:00:00Z' }
  ];

  const fetchVintages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getForecastVintages(selectedInterval, selectedPolicy);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load forecast vintage history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVintages();
  }, [selectedInterval, selectedPolicy]);

  return (
    <div className="space-y-6">
      {/* Target Interval Presets Toolbar */}
      <div className="panel-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Target Delivery Interval:
          </span>
          {targetIntervalPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setSelectedInterval(preset.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                selectedInterval === preset.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
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

      {showFilters && (
        <CutoffSelector
          selectedPolicyId={selectedPolicy}
          onSelectPolicy={(p) => setSelectedPolicy(p)}
          disabled={loading}
        />
      )}

      {loading && <LoadingState message="Extracting forecast vintages..." />}
      {error && <ErrorState error={error} onRetry={fetchVintages} />}

      {!loading && !error && data && (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Target Delivery Interval"
              value={data.target_interval_london.split(' ')[1] || '12:00'}
              subtitle={data.target_interval_london}
              icon={Clock}
              badge={{
                text: 'Target Time',
                variant: 'neutral'
              }}
            />

            <MetricCard
              title="Final Actual Outturn"
              value={data.actual_generation_mw ? data.actual_generation_mw.toLocaleString() : 'N/A'}
              unit="MW"
              subtitle="FUELHH actual outturn"
              icon={Zap}
              badge={{
                text: 'Settled Outturn',
                variant: 'success'
              }}
            />

            <MetricCard
              title="Selected Cutoff Vintage"
              value={data.selected_vintage ? data.selected_vintage.forecast_mw.toLocaleString() : 'N/A'}
              unit="MW"
              subtitle={data.selected_vintage ? `Published: ${data.selected_vintage.publish_time_london}` : 'No eligible vintage'}
              icon={CheckCircle}
              badge={{
                text: 'Eligible Position',
                variant: 'info'
              }}
            />

            <MetricCard
              title="Variance from Actual"
              value={
                data.selected_vintage && data.actual_generation_mw
                  ? (data.selected_vintage.forecast_mw - data.actual_generation_mw > 0 
                      ? `+${Math.round(data.selected_vintage.forecast_mw - data.actual_generation_mw).toLocaleString()}` 
                      : `${Math.round(data.selected_vintage.forecast_mw - data.actual_generation_mw).toLocaleString()}`)
                  : 'N/A'
              }
              unit="MW"
              subtitle={data.selected_vintage ? `${data.selected_vintage.lead_time_hours}h lead time` : undefined}
              icon={AlertCircle}
              badge={{
                text: data.selected_vintage && data.actual_generation_mw && (data.selected_vintage.forecast_mw - data.actual_generation_mw) > 0 ? 'Overestimate' : 'Underestimate',
                variant: 'warning'
              }}
            />
          </div>

          {/* Explanation Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 flex items-start gap-3">
            <div className="p-1 rounded bg-slate-200 text-slate-700 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">
                Understanding Forecast Publication Time vs Target Delivery Interval
              </h4>
              <p className="mt-1 text-slate-600 leading-relaxed">
                National Grid ESO publishes new <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">WINDFOR</code> forecasts every few hours. 
                As weather models update closer to delivery, forecasts evolve. 
                However, wholesale day-ahead procurement decisions must be made before auction gate closure. 
                The dashed line marks the configured decision cutoff: <strong>only forecasts published before this cutoff were available to the procurement desk.</strong>
              </p>
            </div>
          </div>

          {/* Vintage Curve Chart */}
          <div className="panel-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Forecast Evolution Across Publications
                </h3>
                <p className="text-xs text-slate-500">
                  Target interval: {data.target_interval_london}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-0.5 bg-blue-600 rounded"></span> Published Forecasts (MW)
                </span>
                {data.actual_generation_mw && (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-3 h-0.5 bg-emerald-600 rounded"></span> Actual Outturn
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-3 h-0.5 border-t border-dashed border-amber-600"></span> Decision Cutoff
                </span>
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.vintages}
                  margin={{ top: 15, right: 25, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="publish_time_london"
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(str) => {
                      const parts = str.split(' ');
                      return `${parts[0]?.slice(5)} ${parts[1] || ''}`;
                    }}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    domain={['dataMin - 1000', 'dataMax + 1000']}
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
                    formatter={(val: any) => [
                      `${Number(val).toLocaleString()} MW`,
                      'Published Forecast'
                    ]}
                    labelFormatter={(label) => `Publication Time: ${label}`}
                  />
                  {data.actual_generation_mw && (
                    <ReferenceLine
                      y={data.actual_generation_mw}
                      stroke="#059669"
                      strokeWidth={2}
                      label={{
                        value: `Actual: ${data.actual_generation_mw.toLocaleString()} MW`,
                        fill: '#059669',
                        position: 'top',
                        fontSize: 11
                      }}
                    />
                  )}
                  {data.selected_vintage && (
                    <ReferenceLine
                      x={data.selected_vintage.publish_time_london}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: 'Decision Cutoff Vintage',
                        fill: '#d97706',
                        position: 'insideTopLeft',
                        fontSize: 11
                      }}
                    />
                  )}
                  <Line
                    type="stepAfter"
                    dataKey="forecast_mw"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vintages Table */}
          <div className="panel-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Vintage Publication Audit ({data.vintages.length} Publications)
              </h3>
            </div>

            <div className="overflow-x-auto max-h-[360px]">
              <table className="data-table">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th>Publication Timestamp</th>
                    <th className="text-right">Lead Time</th>
                    <th className="text-right">Forecast (MW)</th>
                    <th className="text-center">Cutoff Status</th>
                    <th className="text-right">Delta from Cutoff Vintage</th>
                    <th className="text-right">Delta from Final Actual</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {data.vintages.map((v, idx) => {
                    const isSelected = data.selected_vintage && data.selected_vintage.publish_time_utc === v.publish_time_utc;
                    return (
                      <tr
                        key={idx}
                        className={isSelected ? 'bg-blue-50/70 font-semibold' : ''}
                      >
                        <td className="text-slate-900">
                          {isSelected && <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-2"></span>}
                          {v.publish_time_london}
                        </td>
                        <td className="text-right text-slate-600">{v.lead_time_hours}h</td>
                        <td className="text-right font-medium text-blue-700">{v.forecast_mw.toLocaleString()}</td>
                        <td className="text-center">
                          {v.is_eligible_at_cutoff ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Eligible (&le; Cutoff)
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              Post-Cutoff
                            </span>
                          )}
                        </td>
                        <td className="text-right text-slate-600">
                          {v.delta_from_cutoff_vintage_mw !== null && v.delta_from_cutoff_vintage_mw !== undefined
                            ? (v.delta_from_cutoff_vintage_mw > 0 ? `+${v.delta_from_cutoff_vintage_mw}` : v.delta_from_cutoff_vintage_mw)
                            : '-'}
                        </td>
                        <td className="text-right text-slate-700">
                          {v.delta_from_actual_mw !== null && v.delta_from_actual_mw !== undefined
                            ? (v.delta_from_actual_mw > 0 ? `+${v.delta_from_actual_mw}` : v.delta_from_actual_mw)
                            : '-'}
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
