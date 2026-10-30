export interface CutoffPolicyInfo {
  policy_id: string;
  label: string;
  description: string;
  cutoff_time_utc?: string | null;
  cutoff_time_london?: string | null;
}

export interface MatchedInterval {
  start_time_utc: string;
  start_time_london: string;
  settlement_date?: string | null;
  settlement_period?: number | null;
  forecast_publish_time_utc?: string | null;
  forecast_publish_time_london?: string | null;
  lead_time_hours?: number | null;
  forecast_mw?: number | null;
  actual_mw?: number | null;
  signed_error_mw?: number | null;
  abs_error_mw?: number | null;
  squared_error_mw?: number | null;
  pct_error?: number | null;
  is_mape_eligible: boolean;
  is_matched: boolean;
}

export interface AccuracyMetrics {
  mae_mw: number;
  rmse_mw: number;
  mean_error_bias_mw: number;
  mape_pct?: number | null;
  nmae_pct?: number | null;
  sample_size_matched: number;
  mape_sample_size: number;
  mape_excluded_count: number;
  mape_threshold_mw: number;
  total_expected_intervals: number;
  coverage_pct: number;
}

export interface DailyMetricBreakdown {
  delivery_date: string;
  sample_size: number;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  mape_pct?: number | null;
  avg_forecast_mw: number;
  avg_actual_mw: number;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  bin_label: string;
  count: number;
}

export interface OverviewResponse {
  delivery_date: string;
  cutoff_policy: CutoffPolicyInfo;
  avg_forecast_mw: number;
  total_forecast_mwh: number;
  avg_actual_mw?: number | null;
  total_actual_mwh?: number | null;
  day_mae_mw?: number | null;
  day_bias_mw?: number | null;
  day_rmse_mw?: number | null;
  day_mape_pct?: number | null;
  intervals_count: number;
  latest_publish_time_utc?: string | null;
  latest_publish_time_london?: string | null;
  is_historical_reconstruction: boolean;
  insight_summary: string;
  insight_detail: string;
  intervals: MatchedInterval[];
}

export interface TimelineResponse {
  start_date: string;
  end_date: string;
  cutoff_policy: CutoffPolicyInfo;
  resolution: string;
  intervals: MatchedInterval[];
  summary_metrics: AccuracyMetrics;
}

export interface AccuracyResponse {
  period: string;
  cutoff_policy: CutoffPolicyInfo;
  resolution: string;
  metrics: AccuracyMetrics;
  daily_metrics: DailyMetricBreakdown[];
  largest_errors: MatchedInterval[];
  error_distribution: HistogramBin[];
}

export interface ForecastVintageItem {
  publish_time_utc: string;
  publish_time_london: string;
  lead_time_hours: number;
  forecast_mw: number;
  is_eligible_at_cutoff: boolean;
  delta_from_cutoff_vintage_mw?: number | null;
  delta_from_actual_mw?: number | null;
  source: string;
}

export interface VintagesResponse {
  target_interval_utc: string;
  target_interval_london: string;
  cutoff_timestamp_utc: string;
  cutoff_timestamp_london: string;
  actual_generation_mw?: number | null;
  selected_vintage?: ForecastVintageItem | null;
  total_vintages_count: number;
  eligible_vintages_count: number;
  vintages: ForecastVintageItem[];
}

export interface DataQualityResponse {
  total_expected_half_hourly_intervals: number;
  total_expected_hourly_intervals: number;
  actual_intervals_count: number;
  forecast_raw_records_count: number;
  matched_half_hourly_count: number;
  matched_hourly_count: number;
  missing_actual_intervals_count: number;
  missing_forecast_intervals_count: number;
  duplicate_actual_records_count: number;
  duplicate_forecast_records_count: number;
  zero_or_negative_actuals_count: number;
  mape_excluded_count: number;
  last_refresh_timestamp_utc: string;
  data_source_actual: string;
  data_source_forecast: string;
  methodology_notes: string[];
}
