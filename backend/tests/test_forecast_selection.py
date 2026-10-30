import pytest
from datetime import datetime, timedelta, date
import pandas as pd
from app.services.forecast_selection import (
    resolve_cutoff_timestamp,
    select_day_ahead_forecasts,
    CUTOFF_POLICIES
)
from app.utils.timestamps import parse_to_utc, format_iso_utc, UTC

def test_resolve_cutoff_timestamp_default():
    delivery_date = date(2026, 1, 5)
    cutoff_utc, info = resolve_cutoff_timestamp(delivery_date, "d0_0000")
    # Default is 00:00:00 on delivery date in Europe/London
    assert cutoff_utc == datetime(2026, 1, 5, 0, 0, 0, tzinfo=UTC)
    assert info.policy_id == "d0_0000"

def test_resolve_cutoff_timestamp_d1_1100():
    delivery_date = date(2026, 1, 5)
    cutoff_utc, info = resolve_cutoff_timestamp(delivery_date, "d1_1100")
    # 11:00 on D-1 (Jan 4)
    assert cutoff_utc == datetime(2026, 1, 4, 11, 0, 0, tzinfo=UTC)
    assert "11:00" in info.label

def test_forecast_vintage_selection_and_anti_leakage():
    """
    Synthetic fixture test:
    Given target interval Jan 5, 2026 14:00 UTC.
    Multiple forecast publications exist:
      1. Jan 4, 10:00 UTC -> 10,000 MW (eligible under 11:00 D-1)
      2. Jan 4, 10:30 UTC -> 12,000 MW (latest before 11:00 D-1)
      3. Jan 4, 11:30 UTC -> 14,000 MW (published AFTER 11:00 D-1 cutoff)
      4. Jan 4, 22:30 UTC -> 15,000 MW (latest before 00:00 D cutoff)
      5. Jan 5, 08:00 UTC -> 18,000 MW (published during delivery day)
    """
    target_interval = parse_to_utc("2026-01-05T14:00:00Z")
    synthetic_records = [
        {"start_time_utc": target_interval, "publish_time_utc": parse_to_utc("2026-01-04T10:00:00Z"), "forecast_generation_mw": 10000.0, "source": "WINDFOR_TEST"},
        {"start_time_utc": target_interval, "publish_time_utc": parse_to_utc("2026-01-04T10:30:00Z"), "forecast_generation_mw": 12000.0, "source": "WINDFOR_TEST"},
        {"start_time_utc": target_interval, "publish_time_utc": parse_to_utc("2026-01-04T11:30:00Z"), "forecast_generation_mw": 14000.0, "source": "WINDFOR_TEST"},
        {"start_time_utc": target_interval, "publish_time_utc": parse_to_utc("2026-01-04T22:30:00Z"), "forecast_generation_mw": 15000.0, "source": "WINDFOR_TEST"},
        {"start_time_utc": target_interval, "publish_time_utc": parse_to_utc("2026-01-05T08:00:00Z"), "forecast_generation_mw": 18000.0, "source": "WINDFOR_TEST"},
    ]
    df = pd.DataFrame(synthetic_records)
    df["start_time_iso"] = df["start_time_utc"].apply(format_iso_utc)
    df["start_time_london"] = df["start_time_iso"]
    df["publish_time_iso"] = df["publish_time_utc"].apply(format_iso_utc)
    df["publish_time_london"] = df["publish_time_iso"]
    df["lead_time_hours"] = 10.0

    # Test 1: Under policy d1_1100 (Cutoff is Jan 4 11:00 UTC)
    # Records at 11:30, 22:30, and Jan 5 08:00 MUST be rejected!
    # Latest eligible is Jan 4 10:30 UTC (12,000 MW).
    selected_d1_1100 = select_day_ahead_forecasts(df, policy_id="d1_1100", resolution="hourly")
    assert len(selected_d1_1100) == 1
    selected_row = selected_d1_1100.iloc[0]
    assert selected_row["publish_time_utc"] == parse_to_utc("2026-01-04T10:30:00Z")
    assert selected_row["forecast_generation_mw"] == 12000.0

    # Test 2: Under policy d0_0000 (Cutoff is Jan 5 00:00 UTC)
    # Records at Jan 5 08:00 MUST be rejected.
    # Latest eligible is Jan 4 22:30 UTC (15,000 MW).
    selected_d0 = select_day_ahead_forecasts(df, policy_id="d0_0000", resolution="hourly")
    assert len(selected_d0) == 1
    selected_row_d0 = selected_d0.iloc[0]
    assert selected_row_d0["publish_time_utc"] == parse_to_utc("2026-01-04T22:30:00Z")
    assert selected_row_d0["forecast_generation_mw"] == 15000.0

def test_reject_future_forecast_strictly():
    """
    Ensures that if all forecasts were published after the cutoff,
    NONE are selected (no fallback to future data).
    """
    target_interval = parse_to_utc("2026-01-05T14:00:00Z")
    # All published on delivery day
    synthetic_records = [
        {"start_time_utc": target_interval, "publish_time_utc": parse_to_utc("2026-01-05T06:00:00Z"), "forecast_generation_mw": 16000.0, "source": "WINDFOR_TEST"},
    ]
    df = pd.DataFrame(synthetic_records)
    df["start_time_iso"] = df["start_time_utc"].apply(format_iso_utc)
    df["start_time_london"] = df["start_time_iso"]
    df["publish_time_iso"] = df["publish_time_utc"].apply(format_iso_utc)
    df["publish_time_london"] = df["publish_time_iso"]
    df["lead_time_hours"] = 8.0

    selected = select_day_ahead_forecasts(df, policy_id="d0_0000", resolution="hourly")
    assert len(selected) == 0  # No record leaked!
