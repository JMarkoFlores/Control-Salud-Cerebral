import { DashboardResponse, FilterOptions, Filters, MetaInfo, ViewId } from '../types';

const TOKEN_KEY = 'bi_token';
const USER_KEY = 'bi_user';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function storeSession(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event('bi:unauthorized'));
    throw new ApiError('Sesión inválida o expirada.', 401);
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : 'No fue posible completar la solicitud.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function loginRequest(
  username: string,
  password: string
): Promise<{ token: string; user: { username: string; role: string } }> {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function fetchMeta(): Promise<MetaInfo> {
  return request('/api/meta');
}

export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();

  const append = (key: string, values: Array<string | number>) => {
    for (const value of values) params.append(key, String(value));
  };

  append('year', filters.years);
  append('month', filters.months);
  append('week', filters.weeks);
  if (filters.department) params.set('department', filters.department);
  if (filters.province) params.set('province', filters.province);
  append('district', filters.districts);
  append('sex', filters.sexes);
  append('ageGroup', filters.ageGroups);
  append('personState', filters.personStates);
  if (filters.participant != null) params.set('participant', String(filters.participant));
  if (filters.onlyClosed) params.set('onlyClosed', 'true');
  if (filters.indicator) params.set('indicator', filters.indicator);
  append('cafState', filters.cafState);
  append('ccsState', filters.ccsState);
  append('dataState', filters.dataState);
  append('metaOrigin', filters.metaOrigin);
  append('controlType', filters.controlType);
  append('resultOrigin', filters.resultOrigin);
  append('validation', filters.validation);
  append('pendingIndicator', filters.pendingIndicator);
  append('pendingReason', filters.pendingReason);
  append('periodSituation', filters.periodSituation);
  if (filters.evolutionIndicator) params.set('evolutionIndicator', filters.evolutionIndicator);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.compareBy !== 'distrito') params.set('compareBy', filters.compareBy);

  return params.toString();
}

export async function fetchFilterOptions(filters: Filters, view: ViewId): Promise<FilterOptions> {
  const query = filtersToSearch(filters);
  const suffix = query ? `&${query}` : '';
  return request(`/api/filters?view=${view}${suffix}`);
}

export async function fetchView(view: ViewId, filters: Filters): Promise<DashboardResponse> {
  const query = filtersToSearch(filters);
  const suffix = query ? `?${query}` : '';
  return request(`/api/views/${view}${suffix}`);
}
