import {
  OverviewResponse,
  TimelineResponse,
  AccuracyResponse,
  VintagesResponse,
  DataQualityResponse,
  CutoffPolicyInfo
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    let errorDetail = `HTTP ${resp.status} ${resp.statusText}`;
    try {
      const errJson = await resp.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }
  return resp.json();
}

export const api = {
  async getPolicies(): Promise<CutoffPolicyInfo[]> {
    return fetchJson<CutoffPolicyInfo[]>(`${API_BASE_URL}/api/policies`);
  },

  async getOverview(
    deliveryDate: string = '2026-01-01',
    policyId: string = 'd0_0000',
    customCutoff?: string
  ): Promise<OverviewResponse> {
    const params = new URLSearchParams({
      delivery_date: deliveryDate,
      policy_id: policyId,
    });
    if (customCutoff) params.append('custom_cutoff', customCutoff);
    return fetchJson<OverviewResponse>(`${API_BASE_URL}/api/overview?${params.toString()}`);
  },

  async getTimeline(
    startDate: string = '2026-01-01',
    endDate: string = '2026-01-31',
    policyId: string = 'd0_0000',
    customCutoff?: string,
    resolution: string = 'half_hourly'
  ): Promise<TimelineResponse> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      policy_id: policyId,
      resolution: resolution,
    });
    if (customCutoff) params.append('custom_cutoff', customCutoff);
    return fetchJson<TimelineResponse>(`${API_BASE_URL}/api/timeline?${params.toString()}`);
  },

  async getAccuracy(
    startDate: string = '2026-01-01',
    endDate: string = '2026-01-31',
    policyId: string = 'd0_0000',
    customCutoff?: string,
    resolution: string = 'half_hourly'
  ): Promise<AccuracyResponse> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      policy_id: policyId,
      resolution: resolution,
    });
    if (customCutoff) params.append('custom_cutoff', customCutoff);
    return fetchJson<AccuracyResponse>(`${API_BASE_URL}/api/accuracy?${params.toString()}`);
  },

  async getForecastVintages(
    targetInterval: string,
    policyId: string = 'd0_0000',
    customCutoff?: string
  ): Promise<VintagesResponse> {
    const params = new URLSearchParams({
      target_interval: targetInterval,
      policy_id: policyId,
    });
    if (customCutoff) params.append('custom_cutoff', customCutoff);
    return fetchJson<VintagesResponse>(`${API_BASE_URL}/api/forecast-vintages?${params.toString()}`);
  },

  async getDataQuality(): Promise<DataQualityResponse> {
    return fetchJson<DataQualityResponse>(`${API_BASE_URL}/api/data-quality`);
  },

  getExportCsvUrl(
    startDate: string = '2026-01-01',
    endDate: string = '2026-01-31',
    policyId: string = 'd0_0000',
    customCutoff?: string,
    resolution: string = 'half_hourly'
  ): string {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      policy_id: policyId,
      resolution: resolution,
    });
    if (customCutoff) params.append('custom_cutoff', customCutoff);
    return `${API_BASE_URL}/api/export.csv?${params.toString()}`;
  },

  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    return fetchJson<{ status: string; service: string; version: string }>(`${API_BASE_URL}/health`);
  }
};
