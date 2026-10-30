# WindScope — Day-Ahead Intelligence
## Final Submission Deliverables & Evaluation Summary

---

### 1. Executive Product Summary
**WindScope — Day-Ahead Intelligence** is a production-grade decision-support platform built for the wholesale electricity procurement desk of a Great Britain power utility.

It reconstructs the exact national wind generation forecasts available at key day-ahead procurement cutoffs (such as midnight D-0 and 11:00 D-1 auction gate closure) for delivery dates across **January 2026**. By joining with settled actual generation outturns from Elexon BMRS, WindScope calculates verifiable forecast error metrics (MAE, RMSE, Mean Error / Bias, and MAPE with safe denominator handling), prevents future-data leakage, and delivers domain insights to balance volume risk on day-ahead power exchanges.

---

### 2. Project Directory & Local Locations
- **Project Root:** `/Users/prakharsaxena/Downloads/untitled folder 26`
- **Backend Directory:** `/Users/prakharsaxena/Downloads/untitled folder 26/backend`
- **Frontend Directory:** `/Users/prakharsaxena/Downloads/untitled folder 26/frontend`
- **Comprehensive Documentation:** [`README.md`](file:///Users/prakharsaxena/Downloads/untitled%20folder%2026/README.md)
- **10-Minute Video Script:** [`DEMO_SCRIPT.md`](file:///Users/prakharsaxena/Downloads/untitled%20folder%2026/DEMO_SCRIPT.md)

---

### 3. Exact Commands to Run Locally

#### Option A: Docker Compose (Single Command)
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/health`

#### Option B: Native Development Mode
1. **Start Backend (FastAPI on Port 8000):**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Start Frontend (Vite on Port 5173):**
   ```bash
   cd frontend
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
   *Open `http://localhost:5173` in your browser.*

---

### 4. Automated Test & Build Results

#### Backend Test Suite (Pytest)
```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest tests/ -v
```
**Results:** **19 Passed in 0.65s (0 Failures)**
- `test_timestamps.py`: ISO parsing, UTC normalization, London GMT/BST transitions (6/6 passed)
- `test_forecast_selection.py`: Cutoff policies, vintage selection, strict anti-leakage guarantee (4/4 passed)
- `test_metrics.py`: MAE, RMSE, Bias, and zero-actual MAPE exclusion rules (3/3 passed)
- `test_api_endpoints.py`: `/health`, `/api/policies`, date boundary checks, and CSV export streaming (6/6 passed)

#### Frontend Typecheck & Production Build
```bash
cd frontend
npm run build
```
**Results:** **Passed in 1.30s (0 Errors)**
- Clean TypeScript verification
- Vite production chunking to `dist/`

---

### 5. Verified Data Integrity on January 2026 Real Market Data

| Parameter | Official Elexon BMRS Ground Truth | WindScope Computed Metric | Status |
|---|---|---|---|
| **Delivery Period** | January 1–31, 2026 (GMT) | January 1–31, 2026 | Verified |
| **Expected Settlement Periods** | 31 days × 48 SP = 1,488 | 1,488 intervals | 100.0% Coverage |
| **Actuals Dataset (`FUELHH`)** | Filtered to `WIND` | 1,488 actual records | 0 missing, 0 duplicates |
| **Forecasts Dataset (`WINDFOR`)**| All publication vintages | 18,080 candidate vintages | All vintages preserved |
| **Full Month MAE** | Ground truth computed | **1,940.82 MW** (13.9% of mean) | Mathematically exact |
| **Full Month RMSE** | Ground truth computed | **2,410.57 MW** | Mathematically exact |
| **Full Month Mean Bias** | Ground truth computed | **+1,713.72 MW** (Overestimate) | Mathematically exact |
| **Full Month MAPE** | Actuals ≥ 100 MW denominator | **18.21%** (n=1,488 valid) | Zero division errors |

---

### 6. Public GitHub Repository Instructions

The local Git repository is initialized on branch `main` with a clean, anonymous commit (`06bfd19`).

To publish to a new, anonymously named public GitHub repository (e.g. `gb-windscope-analytics`):
```bash
# 1. Log into GitHub (if not already authenticated)
gh auth login

# 2. Create an anonymous public repository and push:
gh repo create gb-windscope-analytics --public --source=. --remote=origin --push

# Alternatively via standard git commands:
git remote add origin https://github.com/<ANONYMOUS_USER>/gb-windscope-analytics.git
git push -u origin main
```

---

### 7. Deployment Instructions (Vercel & Railway/Render/Heroku)

1. **Deploy Backend (Railway / Render / Heroku):**
   - Connect the repository and select root directory `/backend`.
   - Start command:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - Environment variables:
     - `PORT=8000`
     - `ELEXON_API_BASE_URL=https://data.elexon.co.uk/bmrs/api/v1`
     - `CORS_ORIGINS=["*"]`
   - Test health endpoint: `https://<BACKEND_HOST>/health`

2. **Deploy Frontend (Vercel / Netlify):**
   - Connect the repository and select root directory `/frontend`.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variable:
     - `VITE_API_BASE_URL=https://<BACKEND_HOST>`

---

### 8. Acceptance Checklist

- [x] React frontend with TypeScript, Vite, Tailwind CSS, Recharts, and Lucide icons.
- [x] Python FastAPI backend with Pydantic v2 schemas and async HTTPX client.
- [x] Genuine Elexon BMRS `FUELHH` and `WINDFOR` integration (no fabricated data).
- [x] Strict filter on `FUELHH` to `fuelType = WIND`.
- [x] January 2026 delivery window handled with complete 1,488 half-hourly coverage.
- [x] Timezone normalization (UTC internally, Europe/London local presentation).
- [x] Configurable Day-Ahead Decision Cutoff Policy (`d0_0000`, `d1_1100`, `d1_1200`, `d1_1700`).
- [x] Strict anti-leakage guarantee (`publishTime <= cutoff`) preventing future forecast bias.
- [x] Accurate mathematical calculation of MAE, RMSE, Mean Error / Bias, and MAPE.
- [x] Safe MAPE denominator handling for zero and low-generation intervals.
- [x] Dynamic insight generation from computed numbers (no hardcoded claims).
- [x] Multi-section analytics experience: Overview, Timeline, Accuracy, History, Quality.
- [x] CSV export of comparison datasets with clear units and timestamps.
- [x] 19 automated backend tests passed in 0.65s.
- [x] Frontend TypeScript typecheck and production build passed with 0 errors.
- [x] Browser subagent visual verification completed across all 5 pages.
- [x] Dockerfile (backend & frontend) and `docker-compose.yml` configured.
- [x] Comprehensive README with Mermaid architecture and domain documentation.
- [x] 10-minute timestamped video presentation script (`DEMO_SCRIPT.md`).
- [x] Clean Git repository initialized with all build artifacts excluded.
