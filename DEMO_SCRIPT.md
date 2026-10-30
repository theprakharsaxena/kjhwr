# WindScope — Day-Ahead Intelligence
## 10-Minute Video Demonstration Script & Reviewer Guide

This document contains the complete, ready-to-record demonstration script for **WindScope — Day-Ahead Intelligence**, partitioned into two balanced sections:
- **Part 1: Client Presentation** (0:00 – 4:30, max 5 minutes) — Executive procurement context, UI walkthrough, and operational decision-support value.
- **Part 2: Technical Review** (4:30 – 9:00, max 5 minutes) — Architecture, Elexon BMRS integration, anti-leakage vintage selection, statistical calculations, automated tests, and Docker deployment.

---

### Video Metadata & Recording Checklist

- **Total Target Duration:** 9 minutes (well within the 10-minute maximum limit).
- **Resolution:** 1080p (1920×1080) or 4K, 60fps.
- **Audio:** Clear directional microphone, noise suppression active.
- **Screen Layout:**
  - Browser window set to 100% zoom on `http://localhost:5173`.
  - Terminal window split with FastAPI backend logs, Pytest execution, and Docker commands.
- **Evaluator Focus:** Verifying that data values are computed dynamically from genuine January 2026 Elexon records (`FUELHH` and `WINDFOR`), that no future data leaks into the decision-time views, and that error formulas adhere strictly to industry standards.

---

## PART 1: Client Presentation (Day-Ahead Procurement Team)
**Target Duration:** ~4 minutes (Maximum 5 minutes)  
**Persona:** Senior Energy Market Analyst & Lead Solution Architect presenting to the Head of Wholesale Power Procurement.

### Screen Checklist for Part 1:
- [ ] Browser at `http://localhost:5173/overview`
- [ ] Delivery Day navigation (Jan 1, 2026, toggling to Jan 2 and Jan 5)
- [ ] Cutoff Policy selector dropdown (`d0_0000`, `d1_1100`)
- [ ] Dynamic Insight Panel showing computed volume imbalance
- [ ] `http://localhost:5173/timeline` (Full Month & Week 1 zoom, resolution toggle)
- [ ] `http://localhost:5173/accuracy` (KPI cards, Error Distribution, Daily Bias chart, Outlier table)
- [ ] `http://localhost:5173/history` (Vintage evolution curve with decision cutoff marker)

---

### Timestamped Script — Part 1

#### 0:00 – 0:35 | Introduction: The UK Day-Ahead Procurement Challenge
**[Visual: WindScope Overview Page on January 1, 2026]**
> *"Good morning. As a Great Britain electricity utility, our day-ahead procurement team faces a fundamental challenge: purchasing power on wholesale day-ahead auctions—such as EPEX SPOT and Nord Pool—to balance expected customer demand before physical gate closure.*
>
> *With wind supplying a major share of Great Britain’s generation stack, wind forecast uncertainty is our largest source of volumetric imbalance risk. If we procure against an inaccurate wind forecast, we either face costly cashout penalties in the balancing mechanism or incur expensive intraday redispatch costs.*
>
> *Today, I am proud to present **WindScope — Day-Ahead Intelligence**, a decision-support platform designed specifically to evaluate national wind forecast accuracy, reconstruct the information available at exact procurement cutoffs, and provide transparent risk intelligence for January 2026."*

#### 0:35 – 1:30 | Walkthrough: Procurement Overview & Decision Cutoff Selection
**[Visual: Zoom in on Header, Insight Panel, and Cutoff Selector]**
> *"Let’s look at the Procurement Overview for delivery day **January 1, 2026**. Notice how the interface immediately highlights the baseline position: an average expected wind generation of 19,766.8 MW, totaling 474,404 MWh across the day.*
>
> *Crucially, we do not simply display 'the latest forecast globally'. In real power markets, the procurement manager must submit bids before auction gate closure. Here, the user can toggle the **Decision Cutoff Policy**. By default, it selects the forecast available at midnight D-0. If we switch to **Gate Closure at 11:00 D-1**, the entire day's position dynamically recalculates using only vintages published prior to 11:00 AM on New Year's Eve.*
>
> *Notice our prominent **Procurement Intelligence Panel**: it is dynamically derived from genuine computed values—never hardcoded. It informs us that day-ahead forecasts substantially overestimated actual wind output by an average of 4,394.8 MW, warning the procurement manager that relying purely on this vintage would have left the utility severely short of physical volume."*

#### 1:30 – 2:30 | Half-Hourly Delivery Profile & Settlement Verification
**[Visual: Scroll down to the Half-Hourly Delivery Profile Chart and Settlement Table]**
> *"Below the summary KPIs, the half-hourly delivery curve plots the day-ahead forecast in cyan against the actual outturned generation in emerald across all 48 settlement periods (SP 1 through SP 48).*
>
> *Hovering over peak settlement period 36 (17:30 to 18:00 GMT), the tooltip provides interval start time, forecast MW, actual MW, signed error, and the exact publication timestamp of the forecast. The table below provides a full settlement audit, including lead time in hours and absolute volumetric variance."*

#### 2:30 – 3:30 | Forecast Timeline & Quantitative Accuracy Evaluation
**[Visual: Click on 'Forecast Timeline' in Sidebar, then 'Forecast Accuracy']**
> *"Switching to the **Forecast Timeline**, we can observe the entire delivery month of January 2026. The bottom slider allows instant zooming into high-wind storm events or low-wind lull periods. Notice our resolution selector: users can toggle between 30-minute settlement periods (1,488 intervals) and exact hourly matching.*
>
> *Now, moving to **Forecast Accuracy**, we evaluate the overall performance of the National Wind Forecast for January 2026:*
> - *Our **Mean Absolute Error (MAE)** is **1,940.82 MW**, representing 13.9% of mean generation.*
> - *Our **RMSE** is **2,410.57 MW**, reflecting moderate sensitivity to rapid weather fronts.*
> - *Most importantly, our **Mean Error / Bias is +1,713.72 MW**. This positive sign proves a systematic over-forecasting tendency across January 2026, meaning the utility was consistently exposed to short volume risk.*
> - *Our **MAPE is 18.21%**, calculated strictly on observations where actual generation exceeded 100 MW to prevent denominator distortion.*
>
> *Below, the **Error Distribution Histogram** clearly visualizes this rightward positive bias, and the **Top 10 Outliers Table** pinpoints the exact delivery intervals that generated the largest financial risk."*

#### 3:30 – 4:15 | Publication History: Publish Time vs Start Time
**[Visual: Click on 'Publication History' in Sidebar]**
> *"Finally, let’s view **Publication History**. This page solves one of the most critical domain challenges in energy analytics: visually separating **forecast publication time** from **target delivery time**.*
>
> *Here, for the delivery interval of January 15 at 12:00 GMT, we trace all 24 forecast vintages issued by National Grid ESO. As weather models updated from 48 hours prior down to real-time, forecasts evolved from 13,000 MW up to 16,500 MW. The amber vertical dashed line indicates our decision cutoff. Any vintage published to the right of that line occurred after procurement closure and is strictly locked out, guaranteeing zero future-data leakage."*

#### 4:15 – 4:45 | Part 1 Summary & Transition
> *"To summarize: WindScope equips the procurement desk with decision-time correctness, transparent accuracy metrics, and verifiable risk quantification. WindScope does not claim to automate purchases unilaterally—because total electricity procurement also requires net demand, interconnectors, and solar data—but it gives the team the definitive wind intelligence needed to make profitable day-ahead decisions.*
>
> *Now, let’s switch to Part 2 for the technical architecture and code verification."*

---

## PART 2: Technical Review (Architecture, Pipeline & Tests)
**Target Duration:** ~4 minutes (Maximum 5 minutes)  
**Persona:** Senior Full-Stack Engineer & Data Architect presenting to the Lead Software Architect & Evaluator.

### Screen Checklist for Part 2:
- [ ] IDE view of backend codebase (`app/services`, `app/models`, `app/api`)
- [ ] Elexon Client code (`elexon_client.py` and caching logic)
- [ ] Anti-leakage logic (`forecast_selection.py`)
- [ ] Statistical formulas (`analytics_service.py`)
- [ ] Terminal: Running `pytest` showing 19 passed tests
- [ ] Terminal: Inspecting `/health` endpoint and cache status
- [ ] Docker configuration (`Dockerfile`, `docker-compose.yml`)

---

### Timestamped Script — Part 2

#### 4:45 – 5:30 | Technical Architecture & Modular Directory Structure
**[Visual: IDE showing project directory tree: `backend/` and `frontend/`]**
> *"Welcome to the technical review. The WindScope codebase follows clean modular software engineering principles, cleanly separating raw data ingestion, domain normalization, decision-cutoff reconstruction, statistical analytics, and UI presentation.*
>
> *On the backend, we utilize Python 3.12/3.13 with **FastAPI**, **Pydantic v2** for strict schema validation, **HTTPX** for asynchronous upstream requests, and **Pandas / NumPy** for vectorized time-series processing.*
>
> *On the frontend, we built a modern Single Page Application using **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Recharts**, engineered with a high-contrast dark enterprise trading terminal aesthetic."*

#### 5:30 – 6:20 | Genuine Elexon BMRS Integration & Caching Strategy
**[Visual: Open `backend/app/services/elexon_client.py` and `backend/data_cache/`]**
> *"Let’s examine how we connect to Elexon. We integrate strictly with the two mandatory official datasets:*
> 1. *`FUELHH/stream`: Retrieves actual half-hourly generation outturn for Great Britain, filtered strictly to `fuelType=WIND`.*
> 2. *`WINDFOR/stream`: Retrieves national wind generation forecasts across all publication vintages.*
>
> *In `ElexonClient`, we implement exponential backoff retry logic for upstream rate-limiting and network resilience. To prevent hitting Elexon on every user click and guarantee sub-100ms response times, we implement local disk caching in `data_cache/` with a configurable 24-hour TTL. On application startup, the service pre-warms the cache asynchronously, verifying that all 1,488 half-hourly actuals and 18,080 forecast vintages covering January 2026 are preloaded."*

#### 6:20 – 7:15 | Domain Correctness: Anti-Leakage Vintage Selection
**[Visual: Open `backend/app/services/forecast_selection.py`]**
> *"Now let's examine the core domain logic in `forecast_selection.py`. The assignment specifies that publication time and target delivery time must never be confused.*
>
> *All timestamps are ingested and normalized to timezone-aware UTC datetime objects internally, and formatted in Europe/London local time for display.*
>
> *For any delivery interval and selected cutoff policy (e.g. `d0_0000`, `d1_1100`), our function `resolve_cutoff_timestamp` calculates the precise UTC cutoff. We then enforce a strict filter: `publish_time_utc <= cutoff_utc`. Any forecast vintage published after this timestamp is strictly rejected, preventing future data leakage.*
>
> *From the eligible vintages, we group by `start_time_utc` and take the record with maximum publication timestamp. If no forecast was published prior to cutoff, the interval is marked unavailable rather than filled with future data."*

#### 7:15 – 8:00 | Analytical Metrics & Zero-Actual Handling
**[Visual: Open `backend/app/services/analytics_service.py`]**
> *"In `analytics_service.py`, forecast and actual datasets are joined on normalized `start_time_utc`. All metrics are calculated strictly on matched pairs:*
> - *MAE: Mean of absolute errors.*
> - *RMSE: Square root of mean squared errors.*
> - *Mean Bias: Forecast minus actual (consistent convention: positive indicates over-forecasting).*
> - *MAPE: Handled with strict denominator protection. When actual generation is zero or below 100 MW, the interval is excluded from percentage calculation to avoid infinite or heavily distorted ratios. Both valid sample count and excluded count are surfaced transparently.*
>
> *In `export_service.py`, the exact comparison dataset can be downloaded as a clean CSV with ISO UTC timestamps, London local time, lead time hours, and metric units."*

#### 8:00 – 8:40 | Automated Test Suite Execution
**[Visual: Terminal execution of `PYTHONPATH=backend ./backend/venv/bin/pytest backend/tests/ -v`]**
> *"Let’s run the automated test suite. Executing `pytest`:*
> *Notice all 19 tests pass in under 1 second:*
> - *`test_parse_to_utc_iso_string` and BST/GMT timezone transitions.*
> - *`test_forecast_vintage_selection_and_anti_leakage`: rigorously testing cutoff boundaries and verifying rejection of post-cutoff publications.*
> - *`test_mape_zero_actual_handling`: validating safe denominator threshold.*
> - *`test_api_endpoints`: validating OpenAPI contracts, error handlers, and CSV export streaming.*
>
> *Every unit test uses small, explicitly labeled synthetic fixtures, never masquerading mock data as actual observations."*

#### 8:40 – 9:00 | Docker Infrastructure & Deployment
**[Visual: Open `docker-compose.yml`, inspect backend health in terminal]**
> *"For deployment, we provide a multi-stage `Dockerfile` for the FastAPI backend, a multi-stage Nginx container for the React frontend, and a root `docker-compose.yml`. A single command—`docker compose up --build`—spins up both services with internal networking, volume caching, and container health checks.*
>
> *The frontend API URL is completely configurable via `VITE_API_BASE_URL` for production platforms such as Vercel and Heroku/Render.*
>
> *Thank you for your time. WindScope is fully production-ready, thoroughly verified, and ready for review."*

---

### Likely Evaluator Questions & Prepared Answers

1. **Q: Why does WINDFOR have 744 intervals while FUELHH has 1,488 intervals for January 2026?**  
   *A:* National Grid ESO issues WINDFOR national forecasts on an hourly basis (`:00`), whereas FUELHH generation settlement occurs in 30-minute periods (SP 1–48). In Great Britain wholesale trading, the hourly forecast represents the hourly average generation, applying across both constituent settlement periods. WindScope provides both modes: "Settlement Mapping (1,488 SP)" and "Exact Hourly Matching (744)". Both are available via a toggle in the UI.

2. **Q: How do you prevent future forecast leakage into the day-ahead view?**  
   *A:* In `forecast_selection.py`, the decision cutoff timestamp is computed in UTC based on the selected policy (e.g. D-1 11:00 London time). A strict inequality filter `df['publish_time_utc'] <= cutoff_utc` discards any vintage published after that moment. Only the latest eligible vintage published before cutoff is selected.

3. **Q: How does the application handle zero or near-zero wind generation for MAPE?**  
   *A:* If actual wind generation is near zero, dividing by actual produces astronomical percentage errors. Following energy industry standard practices, WindScope enforces a 100 MW denominator threshold (`MIN_MAPE_DENOMINATOR_MW`). Observations below 100 MW are excluded from the MAPE mean, and the exact count of included vs excluded observations is explicitly displayed.

4. **Q: Does WindScope directly recommend electricity purchase volumes?**  
   *A:* No. National wind generation is a critical component of renewable supply, but total utility procurement also requires consumer demand forecasts, solar output, interconnector flows, and thermal asset availability. WindScope is a specialized renewable decision-support tool.
