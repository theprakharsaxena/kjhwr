import pytest
import numpy as np
import pandas as pd
from app.services.analytics_service import analytics_service
from app.config import settings

def test_metrics_calculation_standard():
    """
    Synthetic fixture:
    Interval 1: forecast=1000, actual=800  -> diff = +200, abs = 200, sq = 40000, pct = 25.0%
    Interval 2: forecast=1500, actual=1500 -> diff = 0,    abs = 0,   sq = 0,     pct = 0.0%
    Interval 3: forecast=2000, actual=2500 -> diff = -500, abs = 500, sq = 250000, pct = 20.0%

    MAE = (200 + 0 + 500) / 3 = 700 / 3 = 233.33
    RMSE = sqrt((40000 + 0 + 250000) / 3) = sqrt(290000 / 3) = sqrt(96666.67) = 310.91
    Mean Error / Bias = (200 + 0 - 500) / 3 = -300 / 3 = -100.0 (net underestimate)
    MAPE = (25.0 + 0.0 + 20.0) / 3 = 15.0%
    """
    df = pd.DataFrame([
        {
            "is_matched": True,
            "forecast_generation_mw": 1000.0,
            "actual_generation_mw": 800.0,
            "signed_error_mw": 200.0,
            "abs_error_mw": 200.0,
            "squared_error_mw": 40000.0,
            "pct_error": 25.0,
            "is_mape_eligible": True
        },
        {
            "is_matched": True,
            "forecast_generation_mw": 1500.0,
            "actual_generation_mw": 1500.0,
            "signed_error_mw": 0.0,
            "abs_error_mw": 0.0,
            "squared_error_mw": 0.0,
            "pct_error": 0.0,
            "is_mape_eligible": True
        },
        {
            "is_matched": True,
            "forecast_generation_mw": 2000.0,
            "actual_generation_mw": 2500.0,
            "signed_error_mw": -500.0,
            "abs_error_mw": 500.0,
            "squared_error_mw": 250000.0,
            "pct_error": 20.0,
            "is_mape_eligible": True
        }
    ])

    m = analytics_service.calculate_metrics(df, total_expected=3)
    assert m.mae_mw == 233.33
    assert m.rmse_mw == 310.91
    assert m.mean_error_bias_mw == -100.0
    assert m.mape_pct == 15.0
    assert m.sample_size_matched == 3
    assert m.mape_sample_size == 3
    assert m.mape_excluded_count == 0

def test_mape_zero_actual_handling():
    """
    Synthetic fixture with actual = 0.
    Must NOT raise division by zero.
    Observation with actual=0 must be flagged as is_mape_eligible=False
    and excluded from MAPE average.
    """
    df = pd.DataFrame([
        {
            "is_matched": True,
            "forecast_generation_mw": 500.0,
            "actual_generation_mw": 0.0,
            "signed_error_mw": 500.0,
            "abs_error_mw": 500.0,
            "squared_error_mw": 250000.0,
            "pct_error": np.nan,
            "is_mape_eligible": False
        },
        {
            "is_matched": True,
            "forecast_generation_mw": 1200.0,
            "actual_generation_mw": 1000.0,
            "signed_error_mw": 200.0,
            "abs_error_mw": 200.0,
            "squared_error_mw": 40000.0,
            "pct_error": 20.0,
            "is_mape_eligible": True
        }
    ])

    m = analytics_service.calculate_metrics(df, total_expected=2)
    # MAE includes both observations: (500 + 200) / 2 = 350
    assert m.mae_mw == 350.0
    # MAPE includes ONLY the eligible observation: 20.0%
    assert m.mape_pct == 20.0
    assert m.sample_size_matched == 2
    assert m.mape_sample_size == 1
    assert m.mape_excluded_count == 1

def test_partial_data_and_missing_actuals():
    """
    Synthetic fixture where one interval has forecast but NO actual (actual is None).
    Metrics must be calculated strictly on matched pairs.
    """
    df = pd.DataFrame([
        {
            "is_matched": True,
            "forecast_generation_mw": 1000.0,
            "actual_generation_mw": 800.0,
            "signed_error_mw": 200.0,
            "abs_error_mw": 200.0,
            "squared_error_mw": 40000.0,
            "pct_error": 25.0,
            "is_mape_eligible": True
        },
        {
            "is_matched": False,
            "forecast_generation_mw": 1500.0,
            "actual_generation_mw": np.nan,
            "signed_error_mw": np.nan,
            "abs_error_mw": np.nan,
            "squared_error_mw": np.nan,
            "pct_error": np.nan,
            "is_mape_eligible": False
        }
    ])

    m = analytics_service.calculate_metrics(df, total_expected=2)
    assert m.sample_size_matched == 1
    assert m.total_expected_intervals == 2
    assert m.coverage_pct == 50.0
    assert m.mae_mw == 200.0
