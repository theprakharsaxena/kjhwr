import logging
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from app.services.elexon_client import elexon_client
from app.utils.timestamps import parse_to_utc, to_london, format_iso_utc, format_london

logger = logging.getLogger("windscope.actuals")

class ActualsService:
    """
    Manages retrieval, normalization, validation, and deduplication of FUELHH actual wind generation records.
    """
    def __init__(self):
        self._cached_df: pd.DataFrame = pd.DataFrame()

    async def get_actuals_df(self, force_refresh: bool = False) -> pd.DataFrame:
        """
        Retrieves FUELHH wind records for January 2026, parses timestamps to UTC,
        validates values, checks for duplicates, and returns a sorted DataFrame.
        """
        if not self._cached_df.empty and not force_refresh:
            return self._cached_df.copy()

        raw_records = await elexon_client.fetch_fuelhh_wind(
            settlement_date_from="2026-01-01",
            settlement_date_to="2026-01-31",
            force_refresh=force_refresh
        )

        if not raw_records:
            logger.warning("No FUELHH wind records returned from Elexon.")
            return pd.DataFrame()

        records = []
        duplicates_count = 0
        seen_starts = set()

        for r in raw_records:
            if r.get("fuelType") != "WIND":
                continue
            
            raw_start = r.get("startTime")
            if not raw_start:
                continue

            try:
                utc_start = parse_to_utc(raw_start)
            except Exception as e:
                logger.warning(f"Skipping record with invalid timestamp {raw_start}: {e}")
                continue

            if utc_start in seen_starts:
                duplicates_count += 1
                continue
            seen_starts.add(utc_start)

            gen = r.get("generation")
            gen_val = float(gen) if gen is not None and not np.isnan(float(gen)) else np.nan

            records.append({
                "start_time_utc": utc_start,
                "start_time_iso": format_iso_utc(utc_start),
                "start_time_london": format_london(utc_start),
                "settlement_date": r.get("settlementDate"),
                "settlement_period": r.get("settlementPeriod"),
                "actual_generation_mw": gen_val,
                "source": "FUELHH"
            })

        df = pd.DataFrame(records)
        if not df.empty:
            df = df.sort_values("start_time_utc").reset_index(drop=True)
            # Filter strictly to January 2026 delivery window (2026-01-01 00:00:00 UTC to 2026-01-31 23:30:00 UTC)
            df = df[(df["start_time_utc"] >= parse_to_utc("2026-01-01T00:00:00Z")) & 
                    (df["start_time_utc"] <= parse_to_utc("2026-01-31T23:30:00Z"))].reset_index(drop=True)

        logger.info(f"Normalized {len(df)} FUELHH actual intervals. Duplicates dropped: {duplicates_count}")
        self._cached_df = df
        return df.copy()

    async def get_data_quality_stats(self) -> Dict[str, Any]:
        df = await self.get_actuals_df()
        expected = 1488  # 31 days * 48 periods
        actual_count = len(df)
        missing_count = max(0, expected - actual_count)
        zero_or_negative = int((df["actual_generation_mw"] <= 0).sum()) if not df.empty else 0

        return {
            "expected_intervals": expected,
            "actual_intervals_count": actual_count,
            "missing_intervals_count": missing_count,
            "zero_or_negative_count": zero_or_negative,
            "min_actual_mw": float(df["actual_generation_mw"].min()) if not df.empty else 0.0,
            "max_actual_mw": float(df["actual_generation_mw"].max()) if not df.empty else 0.0,
            "mean_actual_mw": float(df["actual_generation_mw"].mean()) if not df.empty else 0.0,
        }

actuals_service = ActualsService()
