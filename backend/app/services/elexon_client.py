import os
import json
import time
import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("windscope.elexon")
logger.setLevel(logging.INFO)

class ElexonClient:
    """
    HTTP client for official Elexon BMRS API v1.
    Connects to /datasets/FUELHH/stream and /datasets/WINDFOR/stream.
    Provides robust retry with exponential backoff and disk caching.
    """
    def __init__(self):
        self.base_url = settings.ELEXON_API_BASE_URL.rstrip('/')
        self.timeout = settings.HTTP_TIMEOUT_SECONDS
        self.max_retries = settings.MAX_RETRIES
        self.backoff_factor = settings.RETRY_BACKOFF_FACTOR
        self.cache_dir = settings.CACHE_DIR
        os.makedirs(self.cache_dir, exist_ok=True)
        self._last_refresh: Dict[str, float] = {}

    def _get_cache_path(self, cache_key: str) -> str:
        safe_key = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in cache_key)
        return os.path.join(self.cache_dir, f"{safe_key}.json")

    def _read_cache(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        cache_file = self._get_cache_path(cache_key)
        if os.path.exists(cache_file):
            try:
                mtime = os.path.getmtime(cache_file)
                # Check TTL
                if (time.time() - mtime) < settings.CACHE_TTL_SECONDS:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        logger.info(f"Loaded {len(data)} records from cache for {cache_key}")
                        return data
            except Exception as e:
                logger.warning(f"Error reading cache {cache_file}: {e}")
        return None

    def _write_cache(self, cache_key: str, data: List[Dict[str, Any]]):
        cache_file = self._get_cache_path(cache_key)
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f)
            logger.info(f"Cached {len(data)} records to {cache_file}")
            self._last_refresh[cache_key] = time.time()
        except Exception as e:
            logger.warning(f"Error writing cache {cache_file}: {e}")

    async def fetch_fuelhh_wind(
        self,
        settlement_date_from: str = "2026-01-01",
        settlement_date_to: str = "2026-01-31",
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Retrieves actual half-hourly wind generation from FUELHH/stream endpoint.
        Filters for fuelType = WIND.
        Settlement dates format: YYYY-MM-DD.
        """
        cache_key = f"fuelhh_wind_{settlement_date_from}_{settlement_date_to}"
        if not force_refresh:
            cached = self._read_cache(cache_key)
            if cached is not None:
                return cached

        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": settlement_date_from,
            "settlementDateTo": settlement_date_to,
            "fuelType": "WIND"
        }
        
        data = await self._get_with_retry(url, params)
        if isinstance(data, list):
            # Ensure fuelType == WIND
            wind_records = [r for r in data if r.get("fuelType") == "WIND"]
            self._write_cache(cache_key, wind_records)
            return wind_records
        else:
            raise RuntimeError(f"Unexpected response payload from FUELHH endpoint: {type(data)}")

    async def fetch_windfor(
        self,
        publish_datetime_from: str = "2025-12-30T00:00:00Z",
        publish_datetime_to: str = "2026-01-31T23:59:59Z",
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Retrieves wind generation forecasts (WINDFOR) across all vintages published
        between publish_datetime_from and publish_datetime_to.
        """
        cache_key = f"windfor_{publish_datetime_from[:10]}_{publish_datetime_to[:10]}"
        if not force_refresh:
            cached = self._read_cache(cache_key)
            if cached is not None:
                return cached

        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": publish_datetime_from,
            "publishDateTimeTo": publish_datetime_to
        }
        
        data = await self._get_with_retry(url, params)
        if isinstance(data, list):
            self._write_cache(cache_key, data)
            return data
        else:
            raise RuntimeError(f"Unexpected response payload from WINDFOR endpoint: {type(data)}")

    async def _get_with_retry(self, url: str, params: Dict[str, Any]) -> Any:
        headers = {
            "User-Agent": "WindScope/1.0 (GB-Day-Ahead-Intelligence-Utility-Pilot)",
            "Accept": "application/json"
        }
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(url, params=params, headers=headers)
                    if resp.status_code == 200:
                        return resp.json()
                    elif resp.status_code in (429, 502, 503, 504):
                        sleep_time = self.backoff_factor ** attempt
                        logger.warning(f"Upstream HTTP {resp.status_code} from {url}. Retrying in {sleep_time:.1f}s...")
                        await asyncio.sleep(sleep_time)
                        last_error = RuntimeError(f"Elexon API returned status {resp.status_code}: {resp.text}")
                    else:
                        raise RuntimeError(f"Elexon API HTTP error {resp.status_code}: {resp.text}")
            except (httpx.TimeoutException, httpx.NetworkError) as e:
                sleep_time = self.backoff_factor ** attempt
                logger.warning(f"Network error calling {url}: {e}. Attempt {attempt}/{self.max_retries}. Sleeping {sleep_time:.1f}s")
                await asyncio.sleep(sleep_time)
                last_error = e

        raise RuntimeError(f"Failed to fetch data from Elexon after {self.max_retries} attempts: {last_error}")

    def get_cache_status(self) -> Dict[str, Any]:
        files = os.listdir(self.cache_dir) if os.path.exists(self.cache_dir) else []
        return {
            "cache_dir": self.cache_dir,
            "cached_files_count": len(files),
            "cached_files": files,
            "last_refresh_timestamps": self._last_refresh
        }

elexon_client = ElexonClient()
