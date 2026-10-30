from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CutoffPolicyInfo(BaseModel):
    policy_id: str = Field(description="Policy identifier: d0_0000, d1_1100, d1_1200, d1_1700, custom")
    label: str = Field(description="Human readable label")
    description: str = Field(description="Policy explanation and market context")
    cutoff_time_utc: Optional[str] = Field(default=None, description="Actual calculated cutoff timestamp in UTC")
    cutoff_time_london: Optional[str] = Field(default=None, description="Actual calculated cutoff timestamp in Europe/London")

class MatchedInterval(BaseModel):
    start_time_utc: str = Field(description="Interval start timestamp in ISO UTC (e.g. 2026-01-01T00:00:00Z)")
    start_time_london: str = Field(description="Interval start timestamp in Europe/London (e.g. 2026-01-01 00:00 GMT)")
    settlement_date: Optional[str] = Field(default=None, description="Settlement date (YYYY-MM-DD)")
    settlement_period: Optional[int] = Field(default=None, description="Half-hourly settlement period (1-48)")
    forecast_publish_time_utc: Optional[str] = Field(default=None, description="Timestamp when the selected forecast vintage was published")
    forecast_publish_time_london: Optional[str] = Field(default=None, description="Publication timestamp in Europe/London")
    lead_time_hours: Optional[float] = Field(default=None, description="Lead time in hours from publication to delivery start")
    forecast_mw: Optional[float] = Field(default=None, description="Forecast wind generation in MW")
    actual_mw: Optional[float] = Field(default=None, description="Actual wind generation from FUELHH in MW")
    signed_error_mw: Optional[float] = Field(default=None, description="Signed error = Forecast - Actual (MW)")
    abs_error_mw: Optional[float] = Field(default=None, description="Absolute error = |Forecast - Actual| (MW)")
    squared_error_mw: Optional[float] = Field(default=None, description="Squared error = (Forecast - Actual)^2")
    pct_error: Optional[float] = Field(default=None, description="Percentage error = |Forecast - Actual| / Actual * 100")
    is_mape_eligible: bool = Field(default=False, description="Whether actual is above the MAPE denominator threshold")
    is_matched: bool = Field(default=True, description="Whether both forecast and actual exist for this interval")

class AccuracyMetrics(BaseModel):
    mae_mw: float = Field(description="Mean Absolute Error in MW")
    rmse_mw: float = Field(description="Root Mean Squared Error in MW")
    mean_error_bias_mw: float = Field(description="Mean Error / Bias in MW (positive = overestimate, negative = underestimate)")
    mape_pct: Optional[float] = Field(default=None, description="Mean Absolute Percentage Error (%) on eligible observations")
    nmae_pct: Optional[float] = Field(default=None, description="Normalized MAE (%) = MAE / Mean(Actual)")
    sample_size_matched: int = Field(description="Number of matched forecast-actual intervals evaluated")
    mape_sample_size: int = Field(description="Number of observations with actual >= threshold used for MAPE")
    mape_excluded_count: int = Field(description="Number of observations excluded from MAPE due to zero/low actual generation")
    mape_threshold_mw: float = Field(description="Minimum actual generation MW threshold for MAPE inclusion")
    total_expected_intervals: int = Field(description="Expected intervals for the delivery period")
    coverage_pct: float = Field(description="Data coverage percentage = sample_size_matched / total_expected * 100")

class DailyMetricBreakdown(BaseModel):
    delivery_date: str = Field(description="Delivery date (YYYY-MM-DD)")
    sample_size: int = Field(description="Matched intervals on this date")
    mae_mw: float = Field(description="Day MAE in MW")
    rmse_mw: float = Field(description="Day RMSE in MW")
    bias_mw: float = Field(description="Day Mean Error / Bias in MW")
    mape_pct: Optional[float] = Field(default=None, description="Day MAPE (%)")
    avg_forecast_mw: float = Field(description="Average forecast generation in MW")
    avg_actual_mw: float = Field(description="Average actual generation in MW")

class HistogramBin(BaseModel):
    bin_start: float = Field(description="Bin lower bound in MW")
    bin_end: float = Field(description="Bin upper bound in MW")
    bin_label: str = Field(description="Display label (e.g. '0 to 500')")
    count: int = Field(description="Number of intervals falling in this bin")

class OverviewResponse(BaseModel):
    delivery_date: str
    cutoff_policy: CutoffPolicyInfo
    avg_forecast_mw: float
    total_forecast_mwh: float
    avg_actual_mw: Optional[float] = None
    total_actual_mwh: Optional[float] = None
    day_mae_mw: Optional[float] = None
    day_bias_mw: Optional[float] = None
    day_rmse_mw: Optional[float] = None
    day_mape_pct: Optional[float] = None
    intervals_count: int
    latest_publish_time_utc: Optional[str] = None
    latest_publish_time_london: Optional[str] = None
    is_historical_reconstruction: bool = True
    insight_summary: str
    insight_detail: str
    intervals: List[MatchedInterval]

class TimelineResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_policy: CutoffPolicyInfo
    resolution: str
    intervals: List[MatchedInterval]
    summary_metrics: AccuracyMetrics

class AccuracyResponse(BaseModel):
    period: str
    cutoff_policy: CutoffPolicyInfo
    resolution: str
    metrics: AccuracyMetrics
    daily_metrics: List[DailyMetricBreakdown]
    largest_errors: List[MatchedInterval]
    error_distribution: List[HistogramBin]

class ForecastVintageItem(BaseModel):
    publish_time_utc: str
    publish_time_london: str
    lead_time_hours: float
    forecast_mw: float
    is_eligible_at_cutoff: bool
    delta_from_cutoff_vintage_mw: Optional[float] = None
    delta_from_actual_mw: Optional[float] = None
    source: str = "WINDFOR"

class VintagesResponse(BaseModel):
    target_interval_utc: str
    target_interval_london: str
    cutoff_timestamp_utc: str
    cutoff_timestamp_london: str
    actual_generation_mw: Optional[float] = None
    selected_vintage: Optional[ForecastVintageItem] = None
    total_vintages_count: int
    eligible_vintages_count: int
    vintages: List[ForecastVintageItem]

class DataQualityResponse(BaseModel):
    total_expected_half_hourly_intervals: int = 1488
    total_expected_hourly_intervals: int = 744
    actual_intervals_count: int
    forecast_raw_records_count: int
    matched_half_hourly_count: int
    matched_hourly_count: int
    missing_actual_intervals_count: int
    missing_forecast_intervals_count: int
    duplicate_actual_records_count: int
    duplicate_forecast_records_count: int
    zero_or_negative_actuals_count: int
    mape_excluded_count: int
    last_refresh_timestamp_utc: str
    data_source_actual: str
    data_source_forecast: str
    methodology_notes: List[str]

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp_utc: str
    cache_status: Dict[str, Any]
