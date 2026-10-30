import math
from datetime import datetime, timedelta, date, timezone
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

from app.config import settings
from app.services.actuals_service import actuals_service
from app.services.forecasts_service import forecasts_service
from app.services.forecast_selection import select_day_ahead_forecasts, resolve_cutoff_timestamp, CUTOFF_POLICIES
from app.utils.timestamps import parse_to_utc, to_london, format_iso_utc, format_london
from app.models.schemas import (
    MatchedInterval,
    AccuracyMetrics,
    DailyMetricBreakdown,
    HistogramBin,
    CutoffPolicyInfo,
    OverviewResponse,
    TimelineResponse,
    AccuracyResponse,
    VintagesResponse,
    ForecastVintageItem,
    DataQualityResponse
)

class AnalyticsService:
    """
    Core analytics engine for matching forecasts and actuals,
    calculating statistical accuracy metrics, generating data distributions,
    and deriving domain-specific procurement insights.
    """

    async def get_comparison_dataframe(
        self,
        policy_id: str = "d0_0000",
        custom_cutoff_iso: Optional[str] = None,
        resolution: str = "half_hourly",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Builds the unified analytical comparison dataset:
        1. Retrieves actuals from FUELHH
        2. Retrieves forecast vintages from WINDFOR
        3. Applies cutoff policy to select day-ahead forecast vintage
        4. Matches actuals and forecasts by start_time_utc
        5. Computes signed error, abs error, squared error, and percentage error
        """
        # Fetch actuals
        df_act = await actuals_service.get_actuals_df()
        
        # If hourly resolution, aggregate or select :00 actuals
        if resolution == "hourly" and not df_act.empty:
            df_act = df_act[df_act["start_time_utc"].dt.minute == 0].reset_index(drop=True)

        # Fetch raw forecasts and select day-ahead vintage
        df_raw_fc = await forecasts_service.get_raw_forecasts_df()
        df_selected_fc = select_day_ahead_forecasts(
            df_raw_fc,
            policy_id=policy_id,
            custom_cutoff_iso=custom_cutoff_iso,
            resolution=resolution
        )

        if df_selected_fc.empty and df_act.empty:
            return pd.DataFrame()

        # Merge on start_time_utc
        # We perform an outer or left merge to preserve any intervals with missing actuals or forecasts
        if not df_act.empty and not df_selected_fc.empty:
            merged = pd.merge(
                df_act,
                df_selected_fc[[
                    "start_time_utc",
                    "publish_time_utc",
                    "publish_time_iso",
                    "publish_time_london",
                    "lead_time_hours",
                    "forecast_generation_mw"
                ]],
                on="start_time_utc",
                how="outer"
            )
        elif not df_act.empty:
            merged = df_act.copy()
            merged["publish_time_utc"] = None
            merged["publish_time_iso"] = None
            merged["publish_time_london"] = None
            merged["lead_time_hours"] = None
            merged["forecast_generation_mw"] = None
        else:
            merged = df_selected_fc.copy()
            merged["actual_generation_mw"] = None
            merged["settlement_date"] = None
            merged["settlement_period"] = None

        merged = merged.sort_values("start_time_utc").reset_index(drop=True)

        # Populate missing display strings if any
        merged["start_time_iso"] = merged["start_time_utc"].apply(format_iso_utc)
        merged["start_time_london"] = merged["start_time_utc"].apply(format_london)
        merged["delivery_date_str"] = merged["start_time_utc"].apply(lambda dt: to_london(dt).strftime("%Y-%m-%d"))

        # Calculate error columns where both forecast and actual exist
        has_both = merged["forecast_generation_mw"].notna() & merged["actual_generation_mw"].notna()
        merged["is_matched"] = has_both

        merged["signed_error_mw"] = np.nan
        merged["abs_error_mw"] = np.nan
        merged["squared_error_mw"] = np.nan
        merged["pct_error"] = np.nan
        merged["is_mape_eligible"] = False

        if has_both.any():
            fc = merged.loc[has_both, "forecast_generation_mw"]
            act = merged.loc[has_both, "actual_generation_mw"]
            diff = fc - act

            merged.loc[has_both, "signed_error_mw"] = diff
            merged.loc[has_both, "abs_error_mw"] = diff.abs()
            merged.loc[has_both, "squared_error_mw"] = diff ** 2

            # Percentage error: only where actual >= threshold to avoid mathematical instability
            thresh = settings.MIN_MAPE_DENOMINATOR_MW
            mape_mask = has_both & (merged["actual_generation_mw"] >= thresh)
            merged.loc[mape_mask, "is_mape_eligible"] = True
            merged.loc[mape_mask, "pct_error"] = (merged.loc[mape_mask, "abs_error_mw"] / merged.loc[mape_mask, "actual_generation_mw"]) * 100.0

        # Filter by date range if specified
        if start_date:
            merged = merged[merged["delivery_date_str"] >= start_date]
        if end_date:
            merged = merged[merged["delivery_date_str"] <= end_date]

        return merged.reset_index(drop=True)

    def calculate_metrics(
        self,
        df: pd.DataFrame,
        total_expected: int = 1488
    ) -> AccuracyMetrics:
        """
        Calculates MAE, RMSE, Mean Error / Bias, and MAPE on matched pairs only.
        """
        matched = df[df["is_matched"] == True]
        n_matched = len(matched)

        if n_matched == 0:
            return AccuracyMetrics(
                mae_mw=0.0,
                rmse_mw=0.0,
                mean_error_bias_mw=0.0,
                mape_pct=None,
                nmae_pct=None,
                sample_size_matched=0,
                mape_sample_size=0,
                mape_excluded_count=0,
                mape_threshold_mw=settings.MIN_MAPE_DENOMINATOR_MW,
                total_expected_intervals=total_expected,
                coverage_pct=0.0
            )

        mae = float(matched["abs_error_mw"].mean())
        rmse = float(np.sqrt(matched["squared_error_mw"].mean()))
        bias = float(matched["signed_error_mw"].mean())

        # MAPE calculation
        mape_eligible = matched[matched["is_mape_eligible"] == True]
        n_mape = len(mape_eligible)
        excluded_mape = n_matched - n_mape
        mape = float(mape_eligible["pct_error"].mean()) if n_mape > 0 else None

        # Normalized MAE: MAE / Mean(Actual)
        mean_actual = float(matched["actual_generation_mw"].mean())
        nmae = (mae / mean_actual * 100.0) if mean_actual > 0 else None

        coverage = round(n_matched / total_expected * 100.0, 2)

        return AccuracyMetrics(
            mae_mw=round(mae, 2),
            rmse_mw=round(rmse, 2),
            mean_error_bias_mw=round(bias, 2),
            mape_pct=round(mape, 2) if mape is not None else None,
            nmae_pct=round(nmae, 2) if nmae is not None else None,
            sample_size_matched=n_matched,
            mape_sample_size=n_mape,
            mape_excluded_count=excluded_mape,
            mape_threshold_mw=settings.MIN_MAPE_DENOMINATOR_MW,
            total_expected_intervals=total_expected,
            coverage_pct=coverage
        )

    def _convert_df_to_intervals(self, df: pd.DataFrame) -> List[MatchedInterval]:
        intervals = []
        for _, row in df.iterrows():
            intervals.append(MatchedInterval(
                start_time_utc=row["start_time_iso"],
                start_time_london=row["start_time_london"],
                settlement_date=str(row["settlement_date"]) if pd.notna(row.get("settlement_date")) else None,
                settlement_period=int(row["settlement_period"]) if pd.notna(row.get("settlement_period")) else None,
                forecast_publish_time_utc=row["publish_time_iso"] if pd.notna(row.get("publish_time_iso")) else None,
                forecast_publish_time_london=row["publish_time_london"] if pd.notna(row.get("publish_time_london")) else None,
                lead_time_hours=round(float(row["lead_time_hours"]), 2) if pd.notna(row.get("lead_time_hours")) else None,
                forecast_mw=round(float(row["forecast_generation_mw"]), 1) if pd.notna(row.get("forecast_generation_mw")) else None,
                actual_mw=round(float(row["actual_generation_mw"]), 1) if pd.notna(row.get("actual_generation_mw")) else None,
                signed_error_mw=round(float(row["signed_error_mw"]), 1) if pd.notna(row.get("signed_error_mw")) else None,
                abs_error_mw=round(float(row["abs_error_mw"]), 1) if pd.notna(row.get("abs_error_mw")) else None,
                squared_error_mw=round(float(row["squared_error_mw"]), 1) if pd.notna(row.get("squared_error_mw")) else None,
                pct_error=round(float(row["pct_error"]), 2) if pd.notna(row.get("pct_error")) else None,
                is_mape_eligible=bool(row.get("is_mape_eligible", False)),
                is_matched=bool(row.get("is_matched", False))
            ))
        return intervals

    async def get_overview(
        self,
        delivery_date_str: str = "2026-01-01",
        policy_id: str = "d0_0000",
        custom_cutoff_iso: Optional[str] = None
    ) -> OverviewResponse:
        """
        Builds Page A: Procurement Overview for a specific delivery date.
        """
        d_val = parse_to_utc(delivery_date_str).date()
        cutoff_utc, cutoff_info = resolve_cutoff_timestamp(d_val, policy_id, custom_cutoff_iso)

        df = await self.get_comparison_dataframe(
            policy_id=policy_id,
            custom_cutoff_iso=custom_cutoff_iso,
            resolution="half_hourly",
            start_date=delivery_date_str,
            end_date=delivery_date_str
        )

        intervals = self._convert_df_to_intervals(df)
        total_intervals = len(df)

        # Compute totals & averages
        has_fc = df["forecast_generation_mw"].notna()
        avg_fc = float(df.loc[has_fc, "forecast_generation_mw"].mean()) if has_fc.any() else 0.0
        # MWh for half-hour = MW * 0.5 h
        total_fc_mwh = float(df.loc[has_fc, "forecast_generation_mw"].sum() * 0.5) if has_fc.any() else 0.0

        has_act = df["actual_generation_mw"].notna()
        avg_act = float(df.loc[has_act, "actual_generation_mw"].mean()) if has_act.any() else None
        total_act_mwh = float(df.loc[has_act, "actual_generation_mw"].sum() * 0.5) if has_act.any() else None

        metrics = self.calculate_metrics(df, total_expected=48)

        # Latest publish time among the day's selected forecasts
        pub_times = df[df["publish_time_utc"].notna()]["publish_time_utc"]
        latest_pub_utc = format_iso_utc(pub_times.max()) if not pub_times.empty else None
        latest_pub_london = format_london(pub_times.max()) if not pub_times.empty else None

        # Formulate dynamic analytical insights based strictly on computed results
        bias = metrics.mean_error_bias_mw
        mae = metrics.mae_mw
        if avg_act is not None and avg_act > 0:
            bias_direction = "overestimated" if bias > 0 else "underestimated"
            bias_severity = "substantially" if abs(bias) > 1500 else ("moderately" if abs(bias) > 500 else "marginally")
            
            insight_summary = (
                f"On {delivery_date_str}, Day-Ahead forecasts {bias_direction} actual wind output by an average of "
                f"{abs(bias):,.1f} MW ({bias_severity}), with Mean Absolute Error of {mae:,.1f} MW."
            )
            
            if bias > 0:
                insight_detail = (
                    f"Over-forecasting generation creates positive volume imbalance in procurement planning. "
                    f"Under the {cutoff_info.label} policy, relying solely on this forecast would have left the utility "
                    f"short of physical power, forcing replacement volume purchases at intraday or cashout imbalance prices."
                )
            else:
                insight_detail = (
                    f"Under-forecasting generation creates negative volume imbalance in procurement planning. "
                    f"Procuring against this forecast would have resulted in surplus energy, selling back at cashout "
                    f"or requiring system curtailment adjustments."
                )
        else:
            insight_summary = (
                f"Selected Day-Ahead forecast indicates expected mean generation of {avg_fc:,.1f} MW "
                f"({total_fc_mwh:,.1f} MWh total energy) across {total_intervals} half-hourly settlement intervals."
            )
            insight_detail = (
                f"Forecast vintage selected from publication {latest_pub_london} under cutoff policy {cutoff_info.label}."
            )

        return OverviewResponse(
            delivery_date=delivery_date_str,
            cutoff_policy=cutoff_info,
            avg_forecast_mw=round(avg_fc, 1),
            total_forecast_mwh=round(total_fc_mwh, 1),
            avg_actual_mw=round(avg_act, 1) if avg_act is not None else None,
            total_actual_mwh=round(total_act_mwh, 1) if total_act_mwh is not None else None,
            day_mae_mw=metrics.mae_mw if metrics.sample_size_matched > 0 else None,
            day_bias_mw=metrics.mean_error_bias_mw if metrics.sample_size_matched > 0 else None,
            day_rmse_mw=metrics.rmse_mw if metrics.sample_size_matched > 0 else None,
            day_mape_pct=metrics.mape_pct,
            intervals_count=total_intervals,
            latest_publish_time_utc=latest_pub_utc,
            latest_publish_time_london=latest_pub_london,
            is_historical_reconstruction=True,
            insight_summary=insight_summary,
            insight_detail=insight_detail,
            intervals=intervals
        )

    async def get_timeline(
        self,
        start_date: str = "2026-01-01",
        end_date: str = "2026-01-31",
        policy_id: str = "d0_0000",
        custom_cutoff_iso: Optional[str] = None,
        resolution: str = "half_hourly"
    ) -> TimelineResponse:
        """
        Builds Page B: Forecast Timeline across the requested date window.
        """
        df = await self.get_comparison_dataframe(
            policy_id=policy_id,
            custom_cutoff_iso=custom_cutoff_iso,
            resolution=resolution,
            start_date=start_date,
            end_date=end_date
        )

        total_days = (parse_to_utc(end_date).date() - parse_to_utc(start_date).date()).days + 1
        expected = total_days * (48 if resolution == "half_hourly" else 24)

        metrics = self.calculate_metrics(df, total_expected=expected)
        intervals = self._convert_df_to_intervals(df)

        _, cutoff_info = resolve_cutoff_timestamp(parse_to_utc(start_date).date(), policy_id, custom_cutoff_iso)

        return TimelineResponse(
            start_date=start_date,
            end_date=end_date,
            cutoff_policy=cutoff_info,
            resolution=resolution,
            intervals=intervals,
            summary_metrics=metrics
        )

    async def get_accuracy(
        self,
        start_date: str = "2026-01-01",
        end_date: str = "2026-01-31",
        policy_id: str = "d0_0000",
        custom_cutoff_iso: Optional[str] = None,
        resolution: str = "half_hourly"
    ) -> AccuracyResponse:
        """
        Builds Page C: Forecast Accuracy evaluation for January 2026.
        """
        df = await self.get_comparison_dataframe(
            policy_id=policy_id,
            custom_cutoff_iso=custom_cutoff_iso,
            resolution=resolution,
            start_date=start_date,
            end_date=end_date
        )

        total_days = (parse_to_utc(end_date).date() - parse_to_utc(start_date).date()).days + 1
        expected = total_days * (48 if resolution == "half_hourly" else 24)

        overall_metrics = self.calculate_metrics(df, total_expected=expected)

        # Daily Metric Breakdown
        daily_breakdowns = []
        if not df.empty:
            for day_str, day_df in df.groupby("delivery_date_str"):
                day_m = self.calculate_metrics(day_df, total_expected=48 if resolution == "half_hourly" else 24)
                has_fc = day_df["forecast_generation_mw"].notna()
                has_act = day_df["actual_generation_mw"].notna()

                daily_breakdowns.append(DailyMetricBreakdown(
                    delivery_date=day_str,
                    sample_size=day_m.sample_size_matched,
                    mae_mw=day_m.mae_mw,
                    rmse_mw=day_m.rmse_mw,
                    bias_mw=day_m.mean_error_bias_mw,
                    mape_pct=day_m.mape_pct,
                    avg_forecast_mw=round(float(day_df.loc[has_fc, "forecast_generation_mw"].mean()), 1) if has_fc.any() else 0.0,
                    avg_actual_mw=round(float(day_df.loc[has_act, "actual_generation_mw"].mean()), 1) if has_act.any() else 0.0
                ))

        # Top 10 largest absolute errors
        matched_df = df[df["is_matched"] == True].copy()
        if not matched_df.empty:
            largest_df = matched_df.sort_values("abs_error_mw", ascending=False).head(10)
            largest_errors = self._convert_df_to_intervals(largest_df)
        else:
            largest_errors = []

        # Error distribution histogram (signed errors)
        error_bins = []
        if not matched_df.empty:
            errors = matched_df["signed_error_mw"].dropna()
            # Bins spanning from -6000 to +6000 MW in 1000 MW steps
            bin_edges = [-8000, -6000, -4000, -2000, -1000, 0, 1000, 2000, 4000, 6000, 8000]
            for i in range(len(bin_edges) - 1):
                b_start = bin_edges[i]
                b_end = bin_edges[i+1]
                count = int(((errors >= b_start) & (errors < b_end)).sum())
                error_bins.append(HistogramBin(
                    bin_start=float(b_start),
                    bin_end=float(b_end),
                    bin_label=f"{b_start:+d} to {b_end:+d} MW",
                    count=count
                ))

        _, cutoff_info = resolve_cutoff_timestamp(parse_to_utc(start_date).date(), policy_id, custom_cutoff_iso)

        return AccuracyResponse(
            period=f"{start_date} to {end_date}",
            cutoff_policy=cutoff_info,
            resolution=resolution,
            metrics=overall_metrics,
            daily_metrics=daily_breakdowns,
            largest_errors=largest_errors,
            error_distribution=error_bins
        )

    async def get_forecast_vintages_history(
        self,
        target_interval_utc: str,
        policy_id: str = "d0_0000",
        custom_cutoff_iso: Optional[str] = None
    ) -> VintagesResponse:
        """
        Builds Page D: Forecast Publication History for a selected delivery interval.
        Shows every published vintage for that target interval, marks which were eligible
        at the cutoff, and calculates deltas from actual outturn and from the cutoff vintage.
        """
        target_dt = parse_to_utc(target_interval_utc)
        delivery_date = to_london(target_dt).date()
        cutoff_utc, cutoff_info = resolve_cutoff_timestamp(delivery_date, policy_id, custom_cutoff_iso)

        # Get actual generation for this interval if available
        df_act = await actuals_service.get_actuals_df()
        act_val = None
        if not df_act.empty:
            act_row = df_act[df_act["start_time_utc"] == target_dt]
            if not act_row.empty and pd.notna(act_row.iloc[0]["actual_generation_mw"]):
                act_val = float(act_row.iloc[0]["actual_generation_mw"])

        vintages_df = await forecasts_service.get_vintages_for_interval(target_interval_utc)
        
        vintage_items = []
        eligible_items = []

        if not vintages_df.empty:
            # Sort chronologically by publish time
            vintages_df = vintages_df.sort_values("publish_time_utc", ascending=True).reset_index(drop=True)
            
            for _, r in vintages_df.iterrows():
                pub_utc = r["publish_time_utc"]
                gen_mw = float(r["forecast_generation_mw"])
                is_eligible = pub_utc <= cutoff_utc
                delta_act = round(gen_mw - act_val, 1) if act_val is not None else None

                item = ForecastVintageItem(
                    publish_time_utc=r["publish_time_iso"],
                    publish_time_london=r["publish_time_london"],
                    lead_time_hours=round(float(r["lead_time_hours"]), 2),
                    forecast_mw=round(gen_mw, 1),
                    is_eligible_at_cutoff=is_eligible,
                    delta_from_actual_mw=delta_act,
                    source=r["source"]
                )
                vintage_items.append(item)
                if is_eligible:
                    eligible_items.append(item)

        # Selected vintage is the last eligible one
        selected_item = eligible_items[-1] if eligible_items else None

        # Compute delta from selected cutoff vintage for each vintage
        if selected_item:
            selected_mw = selected_item.forecast_mw
            for item in vintage_items:
                item.delta_from_cutoff_vintage_mw = round(item.forecast_mw - selected_mw, 1)

        return VintagesResponse(
            target_interval_utc=format_iso_utc(target_dt),
            target_interval_london=format_london(target_dt),
            cutoff_timestamp_utc=format_iso_utc(cutoff_utc),
            cutoff_timestamp_london=format_london(cutoff_utc),
            actual_generation_mw=round(act_val, 1) if act_val is not None else None,
            selected_vintage=selected_item,
            total_vintages_count=len(vintage_items),
            eligible_vintages_count=len(eligible_items),
            vintages=vintage_items
        )

    async def get_data_quality(self) -> DataQualityResponse:
        """
        Builds Page E: Data Quality and Methodology metrics.
        """
        act_stats = await actuals_service.get_data_quality_stats()
        raw_fc = await forecasts_service.get_raw_forecasts_df()

        # Matched stats for January 2026
        df_hh = await self.get_comparison_dataframe(resolution="half_hourly")
        df_hourly = await self.get_comparison_dataframe(resolution="hourly")

        matched_hh = int((df_hh["is_matched"] == True).sum()) if not df_hh.empty else 0
        matched_hourly = int((df_hourly["is_matched"] == True).sum()) if not df_hourly.empty else 0

        missing_actuals = act_stats["missing_intervals_count"]
        missing_forecasts = max(0, 1488 - matched_hh)

        # MAPE exclusions in full month
        mape_excluded = int((df_hh["is_matched"] & ~df_hh["is_mape_eligible"]).sum()) if not df_hh.empty else 0

        notes = [
            "Official Elexon BMRS endpoint /datasets/FUELHH/stream queried for fuelType=WIND over January 1–31, 2026.",
            "Official Elexon BMRS endpoint /datasets/WINDFOR/stream queried for all forecast publication vintages from Dec 30, 2025 to Jan 31, 2026.",
            "Timestamps normalized internally to ISO 8601 UTC. Displayed to user in Europe/London local time (GMT/BST aware).",
            "Official Elexon specification: startTime marks the BEGINNING of each 30-minute settlement period or 1-hour forecast horizon.",
            "WINDFOR provides national hourly wind generation forecast averages. Half-hourly settlement mapping applies the hourly forecast across both constituent 30-minute settlement periods (SP 2k-1 and SP 2k).",
            "Anti-leakage guarantee: Day-ahead reconstruction strictly enforces publishTime <= decision_cutoff for every delivery interval.",
            "MAPE denominator protection: observations with actual generation < 100 MW are excluded from percentage error calculations to prevent numerical blow-ups from near-zero denominators."
        ]

        return DataQualityResponse(
            total_expected_half_hourly_intervals=1488,
            total_expected_hourly_intervals=744,
            actual_intervals_count=act_stats["actual_intervals_count"],
            forecast_raw_records_count=len(raw_fc),
            matched_half_hourly_count=matched_hh,
            matched_hourly_count=matched_hourly,
            missing_actual_intervals_count=missing_actuals,
            missing_forecast_intervals_count=missing_forecasts,
            duplicate_actual_records_count=0,
            duplicate_forecast_records_count=0,
            zero_or_negative_actuals_count=act_stats["zero_or_negative_count"],
            mape_excluded_count=mape_excluded,
            last_refresh_timestamp_utc=format_iso_utc(datetime.now(timezone.utc)),
            data_source_actual="Elexon BMRS FUELHH (fuelType=WIND)",
            data_source_forecast="Elexon BMRS WINDFOR (National Wind Generation Forecast)",
            methodology_notes=notes
        )

analytics_service = AnalyticsService()
