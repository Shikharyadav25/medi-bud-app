import type {
  ProfileDTO,
  HealthLogDTO,
  HealthLogCreateDTO,
  SyncMutationDTO,
  ReminderDTO,
  ReminderCompletionDTO,
  ReportDTO,
  ReportObservationDTO,
  ChatResponseDTO,
  NearbyFacilityDTO,
  MealPlanDTO,
} from '@medi-bud/contracts';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null> | string | null;
  timeoutMs?: number;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  request_id?: string;
  details?: unknown;
}

export class MediBudApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;

  constructor(status: number, errorData: ApiErrorResponse) {
    super(errorData.message || `API error ${status}`);
    this.name = 'MediBudApiError';
    this.status = status;
    this.code = errorData.code || 'UNKNOWN_ERROR';
    this.requestId = errorData.request_id;
  }
}

export class MediBudClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => Promise<string | null> | string | null;
  private readonly timeoutMs: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
    this.timeoutMs = config.timeoutMs ?? 15000;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errJson: ApiErrorResponse;
        try {
          errJson = await response.json();
        } catch {
          errJson = {
            code: 'HTTP_ERROR',
            message: `Request failed with status ${response.status}`,
          };
        }
        throw new MediBudApiError(response.status, errJson);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Health
  public async getHealth(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>('/health');
  }

  public async getReady(): Promise<{ ready: boolean; model_loaded: boolean; db_connected: boolean }> {
    return this.request<{ ready: boolean; model_loaded: boolean; db_connected: boolean }>('/ready');
  }

  // Profile
  public async getProfile(): Promise<ProfileDTO> {
    return this.request<ProfileDTO>('/v1/me');
  }

  public async updateProfile(data: Partial<ProfileDTO>): Promise<ProfileDTO> {
    return this.request<ProfileDTO>('/v1/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteAccount(): Promise<void> {
    return this.request<void>('/v1/me', { method: 'DELETE' });
  }

  // Habits / Logs
  public async getLogs(kind?: string, limit = 50): Promise<HealthLogDTO[]> {
    const query = new URLSearchParams();
    if (kind) query.set('kind', kind);
    query.set('limit', String(limit));
    return this.request<HealthLogDTO[]>(`/v1/logs?${query.toString()}`);
  }

  public async createLog(log: HealthLogCreateDTO): Promise<HealthLogDTO> {
    return this.request<HealthLogDTO>('/v1/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  public async syncMutations(
    mutations: SyncMutationDTO[]
  ): Promise<{ results: Array<{ mutation_id: string; status: 'applied' | 'conflict' | 'error'; message?: string }> }> {
    return this.request('/v1/sync/logs', {
      method: 'POST',
      body: JSON.stringify({ mutations }),
    });
  }

  // Reminders
  public async getReminders(): Promise<ReminderDTO[]> {
    return this.request<ReminderDTO[]>('/v1/reminders');
  }

  public async createReminder(data: Omit<ReminderDTO, 'id' | 'user_id'>): Promise<ReminderDTO> {
    return this.request<ReminderDTO>('/v1/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async completeReminder(reminderId: string, data: { due_at: string; completed_at: string; mutation_id: string }): Promise<ReminderCompletionDTO> {
    return this.request<ReminderCompletionDTO>(`/v1/reminders/${reminderId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async deleteReminder(id: string): Promise<void> {
    return this.request<void>(`/v1/reminders/${id}`, { method: 'DELETE' });
  }

  // Reports
  public async uploadReport(file: Blob, filename: string): Promise<{ report_id: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file, filename);
    return this.request<{ report_id: string; status: string }>('/v1/reports', {
      method: 'POST',
      body: formData,
    });
  }

  public async getReports(): Promise<ReportDTO[]> {
    return this.request<ReportDTO[]>('/v1/reports');
  }

  public async getReport(id: string): Promise<ReportDTO> {
    return this.request<ReportDTO>(`/v1/reports/${id}`);
  }

  public async updateObservations(
    reportId: string,
    observations: Array<{ id: string; status: 'confirmed' | 'rejected'; numeric_value?: number; value_text?: string }>
  ): Promise<ReportObservationDTO[]> {
    return this.request<ReportObservationDTO[]>(`/v1/reports/${reportId}/observations`, {
      method: 'PATCH',
      body: JSON.stringify({ observations }),
    });
  }

  public async deleteReport(id: string): Promise<void> {
    return this.request<void>(`/v1/reports/${id}`, { method: 'DELETE' });
  }

  public getDownloadUrl(reportId: string): string {
    return `${this.baseUrl}/v1/reports/${reportId}/download`;
  }

  // AI Chat & Symptom Guidance
  public async chat(data: { query: string; report_id?: string; conversation_id?: string }): Promise<ChatResponseDTO> {
    return this.request<ChatResponseDTO>('/v1/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Indian Food & Meal Planning
  public async getFoods(): Promise<Array<{ id: string; name: string; region: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; is_veg: boolean; allergens: string[] }>> {
    return this.request('/v1/foods');
  }

  public async getMealPlan(): Promise<MealPlanDTO> {
    return this.request<MealPlanDTO>('/v1/plans');
  }

  public async generateMealPlan(preferences: { is_veg: boolean; allergens: string[]; regional_preference?: string }): Promise<MealPlanDTO> {
    return this.request<MealPlanDTO>('/v1/plans', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  public getPlanPdfUrl(planId: string): string {
    return `${this.baseUrl}/v1/plans/${planId}/pdf`;
  }

  // Nearby Care
  public async getNearbyCare(lat: number, lon: number, radius = 5000): Promise<NearbyFacilityDTO[]> {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      radius: String(radius),
    });
    return this.request<NearbyFacilityDTO[]>(`/v1/care?${params.toString()}`);
  }
}
