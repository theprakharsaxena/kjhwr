from datetime import date
from typing import Optional
from fastapi import HTTPException
from app.utils.timestamps import parse_to_utc, to_london

def validate_delivery_date(delivery_date_str: str) -> date:
    """
    Validates delivery date parameter is in January 2026.
    """
    try:
        dt = parse_to_utc(delivery_date_str)
        ldn = to_london(dt)
        if ldn.year != 2026 or ldn.month != 1:
            raise HTTPException(
                status_code=400,
                detail=f"Requested delivery date {delivery_date_str} is outside the target period (January 1–31, 2026)."
            )
        return ldn.date()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid delivery date format '{delivery_date_str}'. Expected YYYY-MM-DD. Error: {str(e)}"
        )

def validate_date_range(start_date_str: str, end_date_str: str):
    """
    Validates start and end date range is valid and within January 2026.
    """
    start_d = validate_delivery_date(start_date_str)
    end_d = validate_delivery_date(end_date_str)
    if start_d > end_d:
        raise HTTPException(
            status_code=400,
            detail=f"start_date ({start_d}) cannot be after end_date ({end_d})."
        )
    return start_d, end_d
