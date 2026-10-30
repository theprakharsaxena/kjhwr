from datetime import datetime, timezone, date
from typing import Union, Tuple
import pytz
from dateutil import parser

UTC = timezone.utc
LONDON_TZ = pytz.timezone("Europe/London")

def parse_to_utc(dt_val: Union[str, datetime, date]) -> datetime:
    """
    Parses any ISO string, datetime, or date into a timezone-aware UTC datetime.
    """
    if isinstance(dt_val, str):
        parsed = parser.isoparse(dt_val) if "T" in dt_val else parser.parse(dt_val)
    elif isinstance(dt_val, date) and not isinstance(dt_val, datetime):
        parsed = datetime(dt_val.year, dt_val.month, dt_val.day, 0, 0, 0, tzinfo=UTC)
    elif isinstance(dt_val, datetime):
        parsed = dt_val
    else:
        raise ValueError(f"Cannot parse timestamp of type {type(dt_val)}: {dt_val}")

    if parsed.tzinfo is None:
        # If naive, assume UTC as standard data exchange convention
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)

def to_london(dt_val: Union[str, datetime]) -> datetime:
    """
    Converts a UTC datetime or ISO string to Europe/London timezone.
    Correctly accounts for GMT in winter and BST in summer.
    """
    utc_dt = parse_to_utc(dt_val)
    return utc_dt.astimezone(LONDON_TZ)

def format_iso_utc(dt_val: Union[str, datetime]) -> str:
    """
    Returns ISO 8601 formatted string in UTC with 'Z' suffix.
    """
    utc_dt = parse_to_utc(dt_val)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def format_london(dt_val: Union[str, datetime], fmt: str = "%Y-%m-%d %H:%M %Z") -> str:
    """
    Formats a timestamp in Europe/London local time.
    """
    london_dt = to_london(dt_val)
    return london_dt.strftime(fmt)

def get_delivery_date_london(dt_val: Union[str, datetime]) -> str:
    """
    Returns the YYYY-MM-DD date string of the delivery interval in Europe/London time.
    """
    london_dt = to_london(dt_val)
    return london_dt.strftime("%Y-%m-%d")

def calculate_lead_time_hours(publish_time: Union[str, datetime], interval_start: Union[str, datetime]) -> float:
    """
    Calculates lead time in hours between forecast publication and target interval start.
    Positive value means the forecast was published before interval start.
    """
    pub_utc = parse_to_utc(publish_time)
    start_utc = parse_to_utc(interval_start)
    diff = start_utc - pub_utc
    return round(diff.total_seconds() / 3600.0, 2)

def is_in_january_2026(dt_val: Union[str, datetime]) -> bool:
    """
    Validates whether the interval falls in the January 2026 UK delivery window.
    January 1, 2026 00:00:00 to January 31, 2026 23:59:59 (Europe/London).
    """
    ldn = to_london(dt_val)
    return ldn.year == 2026 and ldn.month == 1
