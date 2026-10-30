from typing import Optional, List
from fastapi import APIRouter, Query, Response, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.schemas import (
    OverviewResponse,
    TimelineResponse,
    AccuracyResponse,
    VintagesResponse,
    DataQualityResponse,
    CutoffPolicyInfo
)
from app.services.analytics_service import analytics_service
from app.services.export_service import export_service
from app.services.forecast_selection import CUTOFF_POLICIES
from app.utils.validation import validate_delivery_date, validate_date_range

router = APIRouter()

@router.get("/policies", response_model=List[CutoffPolicyInfo])
async def get_policies():
    """
    Returns available day-ahead decision cutoff policies with market descriptions.
    """
    policies = []
    for pid, p in CUTOFF_POLICIES.items():
        policies.append(CutoffPolicyInfo(
            policy_id=p["policy_id"],
            label=p["label"],
            description=p["description"]
        ))
    return policies

@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    delivery_date: str = Query("2026-01-01", description="Delivery date in January 2026 (YYYY-MM-DD)"),
    policy_id: str = Query("d0_0000", description="Cutoff policy ID (d0_0000, d1_1100, d1_1200, d1_1700, custom)"),
    custom_cutoff: Optional[str] = Query(None, description="ISO timestamp for custom cutoff policy")
):
    """
    Page A: Procurement Overview for a specific delivery date.
    Returns daily aggregated forecast volume, actual outturn, Day MAE, Day Bias,
    and computed procurement planning insight.
    """
    validate_delivery_date(delivery_date)
    return await analytics_service.get_overview(
        delivery_date_str=delivery_date,
        policy_id=policy_id,
        custom_cutoff_iso=custom_cutoff
    )

@router.get("/timeline", response_model=TimelineResponse)
async def get_timeline(
    start_date: str = Query("2026-01-01", description="Start delivery date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-31", description="End delivery date (YYYY-MM-DD)"),
    policy_id: str = Query("d0_0000", description="Cutoff policy ID"),
    custom_cutoff: Optional[str] = Query(None, description="ISO timestamp for custom cutoff"),
    resolution: str = Query("half_hourly", description="Resolution: half_hourly (1,488 SP) or hourly (744)")
):
    """
    Page B: Interactive Forecast vs Actual timeline across half-hourly delivery intervals.
    """
    validate_date_range(start_date, end_date)
    return await analytics_service.get_timeline(
        start_date=start_date,
        end_date=end_date,
        policy_id=policy_id,
        custom_cutoff_iso=custom_cutoff,
        resolution=resolution
    )

@router.get("/accuracy", response_model=AccuracyResponse)
async def get_accuracy(
    start_date: str = Query("2026-01-01", description="Start delivery date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-31", description="End delivery date (YYYY-MM-DD)"),
    policy_id: str = Query("d0_0000", description="Cutoff policy ID"),
    custom_cutoff: Optional[str] = Query(None, description="ISO timestamp for custom cutoff"),
    resolution: str = Query("half_hourly", description="Resolution: half_hourly or hourly")
):
    """
    Page C: Quantitative forecast accuracy evaluation for January 2026.
    Computes MAE, RMSE, Mean Error / Bias, MAPE, daily breakdown, and top 10 largest errors.
    """
    validate_date_range(start_date, end_date)
    return await analytics_service.get_accuracy(
        start_date=start_date,
        end_date=end_date,
        policy_id=policy_id,
        custom_cutoff_iso=custom_cutoff,
        resolution=resolution
    )

@router.get("/forecast-vintages", response_model=VintagesResponse)
async def get_forecast_vintages(
    target_interval: str = Query("2026-01-01T12:00:00Z", description="Target delivery interval in ISO UTC"),
    policy_id: str = Query("d0_0000", description="Cutoff policy ID"),
    custom_cutoff: Optional[str] = Query(None, description="ISO timestamp for custom cutoff")
):
    """
    Page D: Forecast Publication History for a specific delivery interval.
    Shows the progression of every published forecast vintage from 48h lead down to real-time.
    """
    return await analytics_service.get_forecast_vintages_history(
        target_interval_utc=target_interval,
        policy_id=policy_id,
        custom_cutoff_iso=custom_cutoff
    )

@router.get("/data-quality", response_model=DataQualityResponse)
async def get_data_quality():
    """
    Page E: Data quality audit, sample coverage checks, and methodology reference.
    """
    return await analytics_service.get_data_quality()

@router.get("/export.csv")
async def export_csv(
    start_date: str = Query("2026-01-01", description="Start delivery date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-31", description="End delivery date (YYYY-MM-DD)"),
    policy_id: str = Query("d0_0000", description="Cutoff policy ID"),
    custom_cutoff: Optional[str] = Query(None, description="ISO timestamp for custom cutoff"),
    resolution: str = Query("half_hourly", description="Resolution: half_hourly or hourly")
):
    """
    Downloads comparison dataset and derived error metrics as a clean, structured CSV file.
    """
    validate_date_range(start_date, end_date)
    csv_content = await export_service.generate_comparison_csv(
        start_date=start_date,
        end_date=end_date,
        policy_id=policy_id,
        custom_cutoff_iso=custom_cutoff,
        resolution=resolution
    )
    filename = f"windscope_comparison_{start_date}_{end_date}_{policy_id}_{resolution}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
