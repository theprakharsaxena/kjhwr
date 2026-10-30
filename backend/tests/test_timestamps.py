import pytest
from datetime import datetime, timezone
import pytz
from app.utils.timestamps import (
    parse_to_utc,
    to_london,
    format_iso_utc,
    format_london,
    calculate_lead_time_hours,
    is_in_january_2026,
    LONDON_TZ,
    UTC
)

def test_parse_to_utc_iso_string():
    dt_str = "2026-01-15T14:30:00Z"
    res = parse_to_utc(dt_str)
    assert res.tzinfo == timezone.utc
    assert res.year == 2026
    assert res.month == 1
    assert res.day == 15
    assert res.hour == 14
    assert res.minute == 30

def test_parse_to_utc_naive_assumed_utc():
    naive = datetime(2026, 1, 1, 12, 0, 0)
    res = parse_to_utc(naive)
    assert res.tzinfo == timezone.utc
    assert res.hour == 12

def test_to_london_winter_gmt():
    # January is GMT (UTC+0)
    dt_utc = parse_to_utc("2026-01-15T12:00:00Z")
    ldn = to_london(dt_utc)
    assert ldn.hour == 12
    assert ldn.strftime("%Z") == "GMT"

def test_to_london_summer_bst():
    # July is BST (UTC+1)
    dt_utc = parse_to_utc("2026-07-15T12:00:00Z")
    ldn = to_london(dt_utc)
    assert ldn.hour == 13
    assert ldn.strftime("%Z") == "BST"

def test_format_iso_utc():
    dt = datetime(2026, 1, 10, 8, 30, tzinfo=timezone.utc)
    assert format_iso_utc(dt) == "2026-01-10T08:30:00Z"

def test_calculate_lead_time_hours():
    pub = "2026-01-01T06:00:00Z"
    target = "2026-01-01T12:00:00Z"
    lead = calculate_lead_time_hours(pub, target)
    assert lead == 6.0

    # Negative lead time if published after interval
    lead_late = calculate_lead_time_hours("2026-01-01T14:00:00Z", "2026-01-01T12:00:00Z")
    assert lead_late == -2.0

def test_is_in_january_2026():
    assert is_in_january_2026("2026-01-01T00:00:00Z") is True
    assert is_in_january_2026("2026-01-31T23:30:00Z") is True
    assert is_in_january_2026("2025-12-31T23:30:00Z") is False
    assert is_in_january_2026("2026-02-01T00:00:00Z") is False
