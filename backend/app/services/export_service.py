import io
import csv
from typing import Optional
from app.services.analytics_service import analytics_service
from app.services.forecast_selection import resolve_cutoff_timestamp
from app.utils.timestamps import parse_to_utc

class ExportService:
    """
    Handles CSV serialization of comparison datasets and evaluation metrics
    with precise units, stable column naming, and honest missing value representations.
    """

    async def generate_comparison_csv(
        self,
        start_date: str = "2026-01-01",
        end_date: str = "2026-01-31",
        policy_id: str = "d0_0000",
        custom_cutoff_iso: Optional[str] = None,
        resolution: str = "half_hourly"
    ) -> str:
        df = await analytics_service.get_comparison_dataframe(
            policy_id=policy_id,
            custom_cutoff_iso=custom_cutoff_iso,
            resolution=resolution,
            start_date=start_date,
            end_date=end_date
        )

        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Header metadata
        _, cutoff_info = resolve_cutoff_timestamp(parse_to_utc(start_date).date(), policy_id, custom_cutoff_iso)
        
        # Column headers
        headers = [
            "interval_start_utc",
            "interval_start_europe_london",
            "settlement_date",
            "settlement_period",
            "forecast_publish_time_utc",
            "forecast_publish_time_europe_london",
            "lead_time_hours",
            "forecast_generation_mw",
            "actual_generation_mw",
            "signed_error_mw",
            "absolute_error_mw",
            "squared_error_mw2",
            "percentage_error_pct",
            "is_mape_eligible",
            "cutoff_policy_applied"
        ]
        writer.writerow(headers)

        if not df.empty:
            for _, row in df.iterrows():
                writer.writerow([
                    row["start_time_iso"],
                    row["start_time_london"],
                    row["settlement_date"] if pd_notna(row.get("settlement_date")) else "",
                    row["settlement_period"] if pd_notna(row.get("settlement_period")) else "",
                    row["publish_time_iso"] if pd_notna(row.get("publish_time_iso")) else "",
                    row["publish_time_london"] if pd_notna(row.get("publish_time_london")) else "",
                    f"{float(row['lead_time_hours']):.2f}" if pd_notna(row.get("lead_time_hours")) else "",
                    f"{float(row['forecast_generation_mw']):.1f}" if pd_notna(row.get("forecast_generation_mw")) else "",
                    f"{float(row['actual_generation_mw']):.1f}" if pd_notna(row.get("actual_generation_mw")) else "",
                    f"{float(row['signed_error_mw']):.1f}" if pd_notna(row.get("signed_error_mw")) else "",
                    f"{float(row['abs_error_mw']):.1f}" if pd_notna(row.get("abs_error_mw")) else "",
                    f"{float(row['squared_error_mw']):.1f}" if pd_notna(row.get("squared_error_mw")) else "",
                    f"{float(row['pct_error']):.2f}" if pd_notna(row.get("pct_error")) else "",
                    "TRUE" if row.get("is_mape_eligible") else "FALSE",
                    cutoff_info.label
                ])

        return output.getvalue()

def pd_notna(val) -> bool:
    import pandas as pd
    return pd.notna(val) and val is not None

export_service = ExportService()
