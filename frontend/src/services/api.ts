import axios from 'axios';
import { 
  User, 
  RequestItem, 
  Resource, 
  Donation, 
  AppNotification, 
  AiClassificationResponse,
  DonationVisionScanResponse,
  HumanitarianPipelineResponse,
  HumanitarianIntelligenceOverview
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:5000/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sahaayaa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (data: Partial<User> & { password: string }) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data.user as User;
  },
  getDemoUsers: async () => {
    const res = await apiClient.get('/auth/demo-users');
    return res.data.demo_accounts;
  },
};

export const requestsApi = {
  create: async (data: any) => {
    const res = await apiClient.post('/requests', data);
    return res.data;
  },
  getAll: async (params?: { category?: string; urgency?: string; status?: string; my_only?: boolean }) => {
    const res = await apiClient.get('/requests', { params });
    return res.data.requests as RequestItem[];
  },
  getById: async (id: number) => {
    const res = await apiClient.get(`/requests/${id}`);
    return res.data;
  },
  updateStatus: async (id: number, status: string, notes?: string, assigned_ngo_id?: number | string) => {
    const res = await apiClient.put(`/requests/${id}/status`, { status, notes, assigned_ngo_id });
    return res.data;
  },
  accept: async (id: number) => {
    const res = await apiClient.post(`/requests/${id}/accept`);
    return res.data;
  },
  donate: async (id: number, donation_type: string, notes?: string) => {
    const res = await apiClient.post(`/requests/${id}/donate`, { donation_type, notes });
    return res.data;
  },
  getHistory: async (id: number) => {
    const res = await apiClient.get(`/requests/${id}/history`);
    return res.data;
  },
  triggerEscalation: async (timeoutMinutes: number = 30) => {
    const res = await apiClient.post('/requests/escalate-check', { timeout_minutes: timeoutMinutes });
    return res.data;
  },
};


export const helpReportsApi = {
  create: async (data: FormData | Record<string, any>) => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    try {
      const res = await apiClient.post('/help-reports', data, { headers });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const res = await apiClient.post('/requests/help-someone', data, { headers });
        return res.data;
      }
      throw err;
    }
  },
  getAll: async (params?: { category?: string; urgency?: string; status?: string; my_only?: boolean }) => {
    const res = await apiClient.get('/help-reports', { params });
    return res.data.reports as RequestItem[];
  },
  getById: async (id: number) => {
    const res = await apiClient.get(`/help-reports/${id}`);
    return res.data;
  },
  accept: async (id: number) => {
    const res = await apiClient.post(`/help-reports/${id}/accept`);
    return res.data;
  },
  startAssistance: async (id: number) => {
    const res = await apiClient.post(`/help-reports/${id}/start`);
    return res.data;
  },
  complete: async (id: number) => {
    const res = await apiClient.post(`/help-reports/${id}/complete`);
    return res.data;
  },
  verify: async (id: number, notes?: string) => {
    try {
      const res = await apiClient.post(`/help-reports/${id}/verify`, { notes });
      return res.data;
    } catch (err: any) {
      const res = await apiClient.post(`/admin/requests/${id}/verify`, { notes });
      return res.data;
    }
  },
  getPreciseLocation: async (id: number) => {
    const res = await apiClient.get(`/help-reports/${id}/precise-location`);
    return res.data;
  },
};

export const resourcesApi = {
  getAll: async (params?: { category?: string; lat?: number; lon?: number; radius?: number }) => {
    const res = await apiClient.get('/resources', { params });
    return res.data.resources as Resource[];
  },
  getById: async (id: number) => {
    const res = await apiClient.get(`/resources/${id}`);
    return res.data.resource as Resource;
  },
  create: async (data: Partial<Resource>) => {
    const res = await apiClient.post('/resources', data);
    return res.data.resource as Resource;
  },
};

export const aiApi = {
  classify: async (text: string, people_count: number = 1, situation: string = '', latitude?: number, longitude?: number) => {
    const res = await apiClient.post('/ai/classify', { 
      text, 
      people_count, 
      situation,
      latitude,
      longitude 
    });
    return res.data as HumanitarianPipelineResponse;
  },
  analyze: async (text: string, people_count: number = 1, situation: string = '', latitude?: number, longitude?: number) => {
    const res = await apiClient.post('/ai/analyze', { 
      text, 
      people_count, 
      situation,
      latitude,
      longitude 
    });
    return res.data as HumanitarianPipelineResponse;
  },
  correct: async (log_id: number, corrected_category: string, corrected_urgency: string, notes?: string) => {
    const res = await apiClient.post('/ai/correct', {
      log_id,
      corrected_category,
      corrected_urgency,
      notes
    });
    return res.data;
  },
  getLogs: async (limit: number = 50) => {
    const res = await apiClient.get('/ai/logs', { params: { limit } });
    return res.data;
  },
  scanDonation: async (file: File | Blob, latitude?: number, longitude?: number) => {
    const formData = new FormData();
    formData.append('image', file);
    if (latitude !== undefined) formData.append('latitude', latitude.toString());
    if (longitude !== undefined) formData.append('longitude', longitude.toString());

    const res = await apiClient.post('/donation/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data as DonationVisionScanResponse;
  },
};

export const matchingApi = {
  find: async (params: {
    request_id?: number;
    category?: string;
    people_count?: number;
    urgency_level?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const res = await apiClient.post('/matching/find', params);
    return res.data.matches as any[];
  },
  liveClassify: async (data: {
    text: string;
    people_count?: number;
    situation?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const res = await apiClient.post('/matching/classify', data);
    return res.data;
  },
};

export const dashboardApi = {
  getImpact: async () => {
    const res = await apiClient.get('/dashboard/impact');
    return res.data.impact as {
      total_requests: number;
      verified_requests: number;
      resources_available: number;
      completed_requests: number;
    };
  },
  getAdmin: async () => {
    const res = await apiClient.get('/dashboard/admin');
    return res.data;
  },
  getNgo: async () => {
    const res = await apiClient.get('/dashboard/ngo');
    return res.data;
  },
  getVolunteer: async () => {
    const res = await apiClient.get('/dashboard/volunteer');
    return res.data;
  },
  getDonor: async () => {

    const res = await apiClient.get('/dashboard/donor');
    return res.data;
  },
  getNotifications: async () => {
    const res = await apiClient.get('/dashboard/notifications');
    return res.data.notifications as AppNotification[];
  },
  markRead: async (id: number) => {
    const res = await apiClient.put(`/dashboard/notifications/${id}/read`);
    return res.data;
  },
};

export const adminApi = {
  verify: async (id: number, notes?: string) => {
    const res = await apiClient.post(`/admin/requests/${id}/verify`, { notes });
    return res.data;
  },
  reject: async (id: number, reason?: string) => {
    const res = await apiClient.post(`/admin/requests/${id}/reject`, { reason });
    return res.data;
  },
  getDuplicates: async () => {
    const res = await apiClient.get('/admin/duplicates');
    return res.data.duplicates as RequestItem[];
  },
  getAuditLogs: async () => {
    const res = await apiClient.get('/admin/audit-logs');
    return res.data.audit_logs;
  },
  getUsers: async () => {
    const res = await apiClient.get('/admin/users');
    return res.data.users as User[];
  },
  verifyResource: async (id: number) => {
    const res = await apiClient.post(`/admin/resources/${id}/verify`);
    return res.data;
  },
  unverifyResource: async (id: number) => {
    const res = await apiClient.post(`/admin/resources/${id}/unverify`);
    return res.data;
  },
  updateTransportStatus: async (id: number, status: string) => {
    const res = await apiClient.post(`/admin/transport/${id}/status`, { status });
    return res.data;
  },
  getTrustReports: async () => {
    const res = await apiClient.get('/admin/reports');
    return res.data.trust_reports;
  },
  updateTrustReportStatus: async (id: number, status: string, notes?: string) => {
    const res = await apiClient.put(`/admin/reports/${id}/status`, { status, notes });
    return res.data;
  },
};

export const mobilityApi = {
  getRoutes: async (resourceId?: number) => {
    const res = await apiClient.get('/mobility/routes', {
      params: resourceId ? { resource_id: resourceId } : undefined
    });
    return res.data as { success: boolean; safety_disclaimer: string; routes: any[] };
  },
  logBarrier: async (data: {
    resource_id?: number;
    request_id?: number;
    barrier_reason: string;
    notes?: string;
  }) => {
    const res = await apiClient.post('/mobility/barrier', data);
    return res.data;
  },
  reportInfo: async (data: {
    transport_info_id?: number;
    trip_id?: number;
    reason: string;
    details?: string;
  }) => {
    const res = await apiClient.post('/mobility/report-info', data);
    return res.data;
  },
  requestAssistance: async (data: {
    pickup_address: string;
    destination_address?: string;
    barrier_reason: string;
    resource_id?: number;
    request_id?: number;
    people_count?: number;
  }) => {
    const res = await apiClient.post('/mobility/request-assistance', data);
    return res.data;
  },
  getTripDetails: async (tripCode: string) => {
    const res = await apiClient.get(`/mobility/trip/${tripCode}`);
    return res.data;
  },
  updateTripStatus: async (tripCode: string, status: string, notes?: string) => {
    const res = await apiClient.patch(`/mobility/trip/${tripCode}/status`, { status, notes });
    return res.data;
  },
  getActiveTrips: async () => {
    const res = await apiClient.get('/mobility/trips/active');
    return res.data.trips;
  }
};

export const donationsApi = {
  matchPreview: async (text: string, latitude: number = 11.0168, longitude: number = 76.9558, item_category?: string, quantity?: number) => {
    const res = await apiClient.post('/donations/match-preview', { text, latitude, longitude, item_category, quantity });
    return res.data;
  },
  createPledge: async (data: {
    item_category: string;
    quantity: number;
    unit?: string;
    item_description?: string;
    notes?: string;
    request_id?: number;
    urgent_request_id?: number;
    resource_id?: number;
    donor_latitude?: number;
    donor_longitude?: number;
    donor_address?: string;
  }) => {
    const res = await apiClient.post('/donations/pledge', data);
    return res.data;
  },
  getAll: async (params?: { status?: string; donor_id?: string }) => {
    const res = await apiClient.get('/donations', { params });
    return res.data;
  },
  updateStatus: async (id: number, status: string) => {
    const res = await apiClient.put(`/donations/${id}/status`, { status });
    return res.data;
  },
  getUrgentRequests: async () => {
    const res = await apiClient.get('/donations/urgent');
    return res.data;
  },
  createUrgentRequest: async (data: {
    title: string;
    item_category: string;
    urgency_level: string;
    required_quantity: number;
    unit?: string;
    description?: string;
    resource_id?: number;
  }) => {
    const res = await apiClient.post('/donations/urgent', data);
    return res.data;
  },
  getInventory: async () => {
    const res = await apiClient.get('/donations/inventory');
    return res.data;
  },
  reallocateResource: async (data: {
    inventory_id: number;
    target_urgent_request_id: number;
    quantity: number;
    notes?: string;
  }) => {
    const res = await apiClient.post('/donations/reallocate', data);
    return res.data;
  }
};

export const intelligenceApi = {
  getOverview: async () => {
    const res = await apiClient.get('/intelligence/overview');
    return res.data as HumanitarianIntelligenceOverview;
  },
  getNeedHeatmap: async () => {
    const res = await apiClient.get('/intelligence/need-heatmap');
    return res.data;
  },
  getResourceHeatmap: async () => {
    const res = await apiClient.get('/intelligence/resource-heatmap');
    return res.data;
  },
  getResourceGap: async () => {
    const res = await apiClient.get('/intelligence/resource-gap');
    return res.data;
  },
  getDemandTrend: async () => {
    const res = await apiClient.get('/intelligence/demand-trend');
    return res.data;
  },
  getTimeAnalysis: async () => {
    const res = await apiClient.get('/intelligence/time-analysis');
    return res.data;
  },
  getAreaAnalysis: async () => {
    const res = await apiClient.get('/intelligence/area-analysis');
    return res.data;
  },
  getShortageAlerts: async () => {
    const res = await apiClient.get('/intelligence/shortage-alerts');
    return res.data;
  },
  getDemandForecast: async () => {
    const res = await apiClient.get('/intelligence/demand-forecast');
    return res.data;
  },
  getNgoPlanning: async () => {
    const res = await apiClient.get('/intelligence/ngo-planning');
    return res.data;
  }
};

export const trustApi = {
  createReport: async (data: {
    report_type: 'RESOURCE' | 'TRANSPORT' | 'REQUEST' | 'SUSPICIOUS_REQUEST' | string;
    target_id?: number;
    target_title?: string;
    reason: string;
    details?: string;
    is_anonymous?: boolean;
  }) => {
    const res = await apiClient.post('/trust/report', data);
    return res.data;
  },
  getVerifications: async () => {
    const res = await apiClient.get('/trust/verifications');
    return res.data;
  },
  getPrivacyPolicy: async () => {
    const res = await apiClient.get('/trust/privacy-policy');
    return res.data;
  }
};

export default apiClient;


