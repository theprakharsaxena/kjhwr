import logging
from typing import List, Dict, Any
import pandas as pd
import numpy as np
from app.services.elexon_client import elexon_client
from app.utils.timestamps import parse_to_utc, to_london, format_iso_utc, format_london, calculate_lead_time_hours

logger = logging.getLogger("windscope.forecasts")

class ForecastsService:
    """
    Manages retrieval, normalization, validation, and vintage preservation of WINDFOR records.
    Never discards publish_time or compresses vintages prematurely.
    """
    def __init__(self):
        self._cached_df: pd.DataFrame = pd.DataFrame()

    async def get_raw_forecasts_df(self, force_refresh: bool = False) -> pd.DataFrame:
        """
        Retrieves all WINDFOR forecast records relevant to January 2026 delivery dates.
        Fetches publications from 2025-12-30T00:00:00Z to 2026-01-31T23:59:59Z to ensure
        all day-ahead and historical vintages are captured.
        """
        if not self._cached_df.empty and not force_refresh:
            return self._cached_df.copy()

        raw_records = await elexon_client.fetch_windfor(
            publish_datetime_from="2025-12-30T00:00:00Z",
            publish_datetime_to="2026-01-31T23:59:59Z",
            force_refresh=force_refresh
        )

        if not raw_records:
            logger.warning("No WINDFOR records returned from Elexon.")
            return pd.DataFrame()

        records = []
        for r in raw_records:
            raw_start = r.get("startTime")
            raw_pub = r.get("publishTime")
            if not raw_start or not raw_pub:
                continue

            try:
                utc_start = parse_to_utc(raw_start)
                utc_pub = parse_to_utc(raw_pub)
            except Exception as e:
                logger.warning(f"Skipping record with invalid timestamp {raw_start} / {raw_pub}: {e}")
                continue

            # Only retain forecasts whose target delivery interval is in January 2026
            if not (parse_to_utc("2026-01-01T00:00:00Z") <= utc_start <= parse_to_utc("2026-01-31T23:30:00Z")):
                continue

            gen = r.get("generation")
            gen_val = float(gen) if gen is not None and not np.isnan(float(gen)) else np.nan

            records.append({
                "start_time_utc": utc_start,
                "start_time_iso": format_iso_utc(utc_start),
                "start_time_london": format_london(utc_start),
                "publish_time_utc": utc_pub,
                "publish_time_iso": format_iso_utc(utc_pub),
                "publish_time_london": format_london(utc_pub),
                "lead_time_hours": calculate_lead_time_hours(utc_pub, utc_start),
                "forecast_generation_mw": gen_val,
                "source": "WINDFOR"
            })

        df = pd.DataFrame(records)
        if not df.empty:
            # Drop any exact duplicates of (start_time_utc, publish_time_utc)
            df = df.drop_duplicates(subset=["start_time_utc", "publish_time_utc"]).reset_index(drop=True)
            df = df.sort_values(["start_time_utc", "publish_time_utc"]).reset_index(drop=True)

        logger.info(f"Loaded {len(df)} total forecast vintages covering {df['start_time_utc'].nunique() if not df.empty else 0} distinct delivery intervals.")
        self._cached_df = df
        return df.copy()

    async def get_vintages_for_interval(self, target_interval_utc: str) -> pd.DataFrame:
        """
        Retrieves all historical forecast vintages published for a specific delivery interval.
        """
        df = await self.get_raw_forecasts_df()
        if df.empty:
            return pd.DataFrame()

        target_dt = parse_to_utc(target_interval_utc)
        sub_df = df[df["start_time_utc"] == target_dt].copy()
        if sub_df.empty:
            # Check if target is :30 and mapped to :00
            if target_dt.minute == 30:
                hourly_target = target_dt.replace(minute=0)
                sub_df = df[df["start_time_utc"] == hourly_target].copy()

        return sub_df.sort_values("publish_time_utc", ascending=True).reset_index(drop=True)

forecasts_service = ForecastsService()
