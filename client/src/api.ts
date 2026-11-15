import type {
  BloodRequest,
  CancelInput,
  RequestInput,
  RequestPage,
  ResponseInput,
  SuggestionResult,
} from '../../shared/blood-request.ts';
import type { DashboardStats } from '../../shared/dashboard.ts';
import type { ApiErrorBody, Donor, DonorInput, DonorPage } from '../../shared/donor.ts';
import type { Hospital } from '../../shared/hospitals.ts';
import type { Area } from '../../shared/locations.ts';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error);
    this.status = status;
    this.fields = body.fields ?? {};
  }
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(`/api${path}`, {
    method,
    signal,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.ok) return response;

  // An expired session on any page other than sign-in sends the admin back to sign in.
  if (response.status === 401 && path !== '/session') window.location.assign('/login');
  throw new ApiError(response.status, (await response.json()) as ApiErrorBody);
}

export async function getSession(): Promise<{ email: string } | null> {
  try {
    return (await (await request('GET', '/session')).json()) as { email: string };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  await request('POST', '/session', { email, password });
}

export async function signOut(): Promise<void> {
  await request('DELETE', '/session');
}

export async function listDonors(
  filters: URLSearchParams,
  signal: AbortSignal,
): Promise<DonorPage> {
  return (await (
    await request('GET', `/donors?${filters}`, undefined, signal)
  ).json()) as DonorPage;
}

export async function getDonor(id: string): Promise<Donor> {
  return (await (await request('GET', `/donors/${id}`)).json()) as Donor;
}

export async function createDonor(input: DonorInput): Promise<Donor> {
  return (await (await request('POST', '/donors', input)).json()) as Donor;
}

export async function updateDonor(id: string, input: DonorInput): Promise<Donor> {
  return (await (await request('PUT', `/donors/${id}`, input)).json()) as Donor;
}

export async function setAvailability(id: string, available: boolean): Promise<Donor> {
  return (await (
    await request('PATCH', `/donors/${id}/availability`, { available })
  ).json()) as Donor;
}

export async function getDashboard(signal: AbortSignal): Promise<DashboardStats> {
  return (await (await request('GET', '/dashboard', undefined, signal)).json()) as DashboardStats;
}

export async function listRequests(
  filters: URLSearchParams,
  signal: AbortSignal,
): Promise<RequestPage> {
  return (await (
    await request('GET', `/requests?${filters}`, undefined, signal)
  ).json()) as RequestPage;
}

export async function getRequest(id: string): Promise<BloodRequest> {
  return (await (await request('GET', `/requests/${id}`)).json()) as BloodRequest;
}

export async function createRequest(input: RequestInput): Promise<BloodRequest> {
  return (await (await request('POST', '/requests', input)).json()) as BloodRequest;
}

export async function getSuggestions(
  id: string,
  wider: boolean,
  signal: AbortSignal,
): Promise<SuggestionResult> {
  return (await (
    await request('GET', `/requests/${id}/suggestions?wider=${wider}`, undefined, signal)
  ).json()) as SuggestionResult;
}

export async function recordResponse(
  id: string,
  donorId: string,
  input: ResponseInput,
): Promise<BloodRequest> {
  return (await (
    await request('PUT', `/requests/${id}/responses/${donorId}`, input)
  ).json()) as BloodRequest;
}

export async function recordDonation(id: string, donorId: string): Promise<BloodRequest> {
  return (await (
    await request('POST', `/requests/${id}/responses/${donorId}/donation`)
  ).json()) as BloodRequest;
}

export async function cancelRequest(id: string, input: CancelInput): Promise<BloodRequest> {
  return (await (await request('POST', `/requests/${id}/cancel`, input)).json()) as BloodRequest;
}

export async function listAreas(districtId: string, signal: AbortSignal): Promise<Area[]> {
  const query = new URLSearchParams({ districtId });
  return (await (await request('GET', `/areas?${query}`, undefined, signal)).json()) as Area[];
}

/** Adds an area, or returns the existing one with the same name in that district. */
export async function addArea(districtId: string, name: string): Promise<Area> {
  return (await (await request('POST', '/areas', { districtId, name })).json()) as Area;
}

export async function listHospitals(): Promise<Hospital[]> {
  return (await (await request('GET', '/hospitals')).json()) as Hospital[];
}

/** Adds a hospital, or returns the existing one with the same name in that district. */
export async function addHospital(input: Omit<Hospital, 'id'>): Promise<Hospital> {
  return (await (await request('POST', '/hospitals', input)).json()) as Hospital;
}
