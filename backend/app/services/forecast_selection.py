from datetime import datetime, timedelta, time
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
import pytz
from app.utils.timestamps import parse_to_utc, to_london, format_iso_utc, format_london, LONDON_TZ, UTC
from app.models.schemas import CutoffPolicyInfo

CUTOFF_POLICIES = {
    "d0_0000": {
        "policy_id": "d0_0000",
        "label": "Delivery Day 00:00 (Default)",
        "description": "Latest forecast published before the delivery date begins in Europe/London (00:00 Local). Represents baseline procurement position before delivery day commences."
    },
    "d1_1100": {
        "policy_id": "d1_1100",
        "label": "Day-Ahead Gate Closure (11:00 D-1)",
        "description": "11:00 UK local time on day prior to delivery (D-1). Aligns with standard EPEX SPOT / Nord Pool UK Day-Ahead auction order submission deadline."
    },
    "d1_1200": {
        "policy_id": "d1_1200",
        "label": "Day-Ahead Auction Clearing (12:00 D-1)",
        "description": "12:00 UK local time on D-1. Coincides with wholesale auction clearing publication and bilateral portfolio balancing."
    },
    "d1_1700": {
        "policy_id": "d1_1700",
        "label": "Day-Ahead Evening Close (17:00 D-1)",
        "description": "17:00 UK local time on D-1. Corresponds to final evening trading desk handover before overnight dispatch."
    },
    "custom": {
        "policy_id": "custom",
        "label": "Custom Procurement Cutoff",
        "description": "User-selected specific cutoff timestamp for precision scenario analysis."
    }
}

def resolve_cutoff_timestamp(
    delivery_date: datetime.date,
    policy_id: str = "d0_0000",
    custom_cutoff_iso: Optional[str] = None
) -> Tuple[datetime, CutoffPolicyInfo]:
    """
    Computes the exact UTC cutoff datetime for a given delivery date (Europe/London date)
    and cutoff policy.
    Guarantees that no data published after this timestamp can enter the decision set.
    """
    pol_meta = CUTOFF_POLICIES.get(policy_id, CUTOFF_POLICIES["d0_0000"])

    if policy_id == "custom" and custom_cutoff_iso:
        cutoff_utc = parse_to_utc(custom_cutoff_iso)
        label = f"Custom Cutoff: {format_london(cutoff_utc)}"
        desc = pol_meta["description"]
    elif policy_id == "d1_1100":
        # D-1 at 11:00 London time
        d_minus_1 = delivery_date - timedelta(days=1)
        ldn_dt = LONDON_TZ.localize(datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 11, 0, 0))
        cutoff_utc = ldn_dt.astimezone(UTC)
        label = pol_meta["label"]
        desc = pol_meta["description"]
    elif policy_id == "d1_1200":
        # D-1 at 12:00 London time
        d_minus_1 = delivery_date - timedelta(days=1)
        ldn_dt = LONDON_TZ.localize(datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 12, 0, 0))
        cutoff_utc = ldn_dt.astimezone(UTC)
        label = pol_meta["label"]
        desc = pol_meta["description"]
    elif policy_id == "d1_1700":
        # D-1 at 17:00 London time
        d_minus_1 = delivery_date - timedelta(days=1)
        ldn_dt = LONDON_TZ.localize(datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 17, 0, 0))
        cutoff_utc = ldn_dt.astimezone(UTC)
        label = pol_meta["label"]
        desc = pol_meta["description"]
    else:
        # Default: d0_0000 (Delivery day 00:00 London time)
        ldn_dt = LONDON_TZ.localize(datetime(delivery_date.year, delivery_date.month, delivery_date.day, 0, 0, 0))
        cutoff_utc = ldn_dt.astimezone(UTC)
        label = pol_meta["label"]
        desc = pol_meta["description"]

    info = CutoffPolicyInfo(
        policy_id=policy_id,
        label=label,
        description=desc,
        cutoff_time_utc=format_iso_utc(cutoff_utc),
        cutoff_time_london=format_london(cutoff_utc)
    )
    return cutoff_utc, info

def select_day_ahead_forecasts(
    raw_forecasts_df: pd.DataFrame,
    policy_id: str = "d0_0000",
    custom_cutoff_iso: Optional[str] = None,
    resolution: str = "half_hourly"
) -> pd.DataFrame:
    """
    Selects the single latest eligible forecast vintage for each target interval
    published AT OR BEFORE the cutoff policy for that interval's delivery day.

    Anti-leakage guarantee:
    Strict inequality filter `publish_time_utc <= cutoff_utc`.
    Future vintages are strictly discarded.
    """
    if raw_forecasts_df.empty:
        return pd.DataFrame()

    df = raw_forecasts_df.copy()

    # Determine delivery date for each interval in Europe/London timezone
    # Vectorized / cached mapping for efficiency
    df["delivery_date"] = df["start_time_utc"].apply(lambda dt: to_london(dt).date())

    # Group by delivery_date to apply the date-specific cutoff
    selected_rows = []
    
    unique_dates = df["delivery_date"].unique()
    for d in unique_dates:
        cutoff_utc, _ = resolve_cutoff_timestamp(d, policy_id, custom_cutoff_iso)
        day_records = df[df["delivery_date"] == d]
        
        # Anti-leakage filter: strictly published on or before cutoff
        eligible = day_records[day_records["publish_time_utc"] <= cutoff_utc]
        if eligible.empty:
            continue

        # Select the latest vintage (max publish_time_utc) for each start_time_utc
        # We sort by publish_time_utc and pick the last record per start_time_utc
        latest_vintages = eligible.sort_values("publish_time_utc").groupby("start_time_utc").last().reset_index()
        selected_rows.append(latest_vintages)

    if not selected_rows:
        return pd.DataFrame()

    result_df = pd.concat(selected_rows, ignore_index=True)

    # Resolution handling
    if resolution == "half_hourly":
        # WINDFOR delivers hourly generation averages (:00).
        # In half-hourly UK settlement, each hourly forecast applies to both
        # the :00 and :30 half-hourly intervals of that hour.
        df_00 = result_df.copy()
        df_30 = result_df.copy()
        df_30["start_time_utc"] = df_30["start_time_utc"] + timedelta(minutes=30)
        df_30["start_time_iso"] = df_30["start_time_utc"].apply(format_iso_utc)
        df_30["start_time_london"] = df_30["start_time_utc"].apply(format_london)
        # Recalculate lead time for the :30 interval
        df_30["lead_time_hours"] = (df_30["start_time_utc"] - df_30["publish_time_utc"]).dt.total_seconds() / 3600.0

        combined = pd.concat([df_00, df_30], ignore_index=True)
        # Restrict strictly to January 2026 delivery period
        jan_start = parse_to_utc("2026-01-01T00:00:00Z")
        jan_end = parse_to_utc("2026-01-31T23:30:00Z")
        combined = combined[(combined["start_time_utc"] >= jan_start) & (combined["start_time_utc"] <= jan_end)]
        return combined.sort_values("start_time_utc").reset_index(drop=True)
    else:
        # Keep exact hourly intervals (:00)
        return result_df.sort_values("start_time_utc").reset_index(drop=True)
